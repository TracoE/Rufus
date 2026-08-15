-- =======================================================
-- INTEGRIDADE / BACKUP OPERACIONAL — RUFUS
-- Registra automaticamente TODA alteração (INSERT/UPDATE/DELETE) nas tabelas
-- críticas num LOG DE AUDITORIA imutável pela API (nem anon nem usuários
-- autenticados comuns conseguem ler/soltar via REST).
-- Se alguém apagar ou adulterar dados de fora, o log preserva o estado
-- anterior e permite recuperar (reverter) a mudança.
-- Idempotente: rodar de novo com segurança.
-- NÃO altera tabelas do JustificaE.
-- Cole no SQL Editor do Supabase e execute.
-- =======================================================

-- 1. LOG DE AUDITORIA
CREATE TABLE IF NOT EXISTS rufus_log_mudancas (
  id BIGSERIAL PRIMARY KEY,
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL, -- INSERT | UPDATE | DELETE
  dados JSONB,            -- estado completo da linha (OLD para up/del, NEW para ins)
  quem TEXT,              -- email autenticado ou 'anon'
  em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Remove qualquer acesso via API (PostgREST) ao log.
ALTER TABLE rufus_log_mudancas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rufus_log_mudancas FROM anon, authenticated;
-- DROP POLICY IF EXISTS "Rufus log acesso" ON rufus_log_mudancas; -- nenhuma policy = sem acesso REST

-- 2. FUNÇÃO DE REGISTRO (SECURITY DEFINER: roda como dono, ignora RLS)
CREATE OR REPLACE FUNCTION rufus_registrar_mudanca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_op TEXT;
  v_dados JSONB;
  v_quem TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_op := 'INSERT';
    v_dados := to_jsonb(NEW);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_op := 'UPDATE';
    v_dados := jsonb_build_object('antes', to_jsonb(OLD), 'depois', to_jsonb(NEW));
  ELSE
    v_op := 'DELETE';
    v_dados := to_jsonb(OLD);
  END IF;

  v_quem := coalesce(nullif(auth.jwt() ->> 'email', ''), 'anon');

  INSERT INTO rufus_log_mudancas (tabela, operacao, dados, quem)
  VALUES (TG_TABLE_NAME, v_op, v_dados, v_quem);

  RETURN coalesce(NEW, OLD);
END;
$$;

-- 3. TRIGGERS NAS TABELAS CRÍTICAS (idempotente)
DO $do$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'alunos','turmas','professores','atestados','escolas',
      'rufus_chamadas','rufus_chamada_faltas','busca_ativa_registros'
    ]) AS tbl
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.tbl) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_rufus_log_%s_ins ON %I', t.tbl, t.tbl);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_rufus_log_%s_upd ON %I', t.tbl, t.tbl);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_rufus_log_%s_del ON %I', t.tbl, t.tbl);
      EXECUTE format('CREATE TRIGGER trg_rufus_log_%s_ins AFTER INSERT ON %I FOR EACH ROW EXECUTE FUNCTION rufus_registrar_mudanca()', t.tbl, t.tbl);
      EXECUTE format('CREATE TRIGGER trg_rufus_log_%s_upd AFTER UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION rufus_registrar_mudanca()', t.tbl, t.tbl);
      EXECUTE format('CREATE TRIGGER trg_rufus_log_%s_del AFTER DELETE ON %I FOR EACH ROW EXECUTE FUNCTION rufus_registrar_mudanca()', t.tbl, t.tbl);
    END IF;
  END LOOP;
END
$do$;

-- 4. NOTAS
-- - O log cresce com o uso; é seguro e barato (registros pequenos).
-- - Para consultar/recuperar, use o SQL Editor (somente dono do projeto);
--   ex.: SELECT * FROM rufus_log_mudancas WHERE tabela='atestados' AND operacao='DELETE' ORDER BY em DESC;
-- - Isto NÃO substitui um backup físico do banco. Recomenda-se também ativar
--   o backup diário automático no Supabase (Project Settings → Backups).
-- =======================================================