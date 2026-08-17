-- =======================================================
-- CORREÇÃO — LEITURA ANÔNIMA DO KIOSK (escolas, turmas, alunos)
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- Idempotente: pode rodar mais de uma vez sem quebrar nada.
--
-- Contexto: RLS está ATIVADO em escolas/turmas/alunos e as policies
-- existentes (do JustificaE) Não liberam leitura para a chave anônima.
-- Consequência: o kiosk (chave anon) recebe [] em todas elas — o terminal
-- conecta, mas não encontra turmas, alunos nem a lista de escolas do
-- seletor.
--
-- Decisão de segurança:
--   • escolas, turmas, alunos  → leitura pública (o kiosk precisa).
--   • professores, atestados   → NÃO abrir. Só o painel admin (autenticado)
--     lê essas tabelas; não expor e-mails nem justificativas a qualquer
--     pessoa com a chave anon. As policies atuais continuam valendo.
-- =======================================================

-- 0. DIAGNÓSTICO — confirme que RLS está ativo e veja as policies:
SELECT
  c.relname AS tabela,
  p.polname AS policy,
  p.polcmd AS comando,          -- r=select, w=insert, a=all
  pg_get_expr(p.polqual, p.polrelid) AS usando,
  pg_get_expr(p.polwithcheck, p.polrelid) AS com_check,
  array_to_string(p.polroles, ',') AS roles
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('escolas', 'turmas', 'alunos', 'professores', 'atestados')
ORDER BY c.relname, p.polname;

-- 1. CORREÇÃO — leitura pública para o kiosk (chave anon):
DROP POLICY IF EXISTS "Rufus leitura pública escolas" ON escolas;
CREATE POLICY "Rufus leitura pública escolas" ON escolas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Rufus leitura pública turmas" ON turmas;
CREATE POLICY "Rufus leitura pública turmas" ON turmas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Rufus leitura pública alunos" ON alunos;
CREATE POLICY "Rufus leitura pública alunos" ON alunos
  FOR SELECT USING (true);

-- 2. CONFERÊNCIA — no SQL Editor o count ignora RLS; a validação real é a
--    própria aplicação (seletor de escola + lista de turmas/alunos):
SELECT 'escolas' AS tabela, count(*) FROM escolas
UNION ALL SELECT 'turmas', count(*) FROM turmas
UNION ALL SELECT 'alunos', count(*) FROM alunos
UNION ALL SELECT 'professores', count(*) FROM professores
UNION ALL SELECT 'atestados', count(*) FROM atestados;