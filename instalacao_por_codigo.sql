-- =======================================================
-- INSTALAÇÃO DE TERMINAIS POR CÓDIGO (por escola)
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- Idempotente: pode rodar mais de uma vez.
--
-- Objetivo: o terminal NÃO lista as escolas no 1º uso. O super gera um
-- código curto por escola no painel; o instalador do terminal pede apenas
-- esse código, e o RPC abaixo resolve para a escola exata (sem enumeração).
-- Só o super gerencia os códigos; a tabela de códigos não é lida anonimamente.
-- =======================================================

-- 1. TABELA DE CÓDIGOS (código → escola)
CREATE TABLE IF NOT EXISTS rufus_codigos_acesso (
  codigo TEXT PRIMARY KEY,
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por TEXT
);

CREATE INDEX IF NOT EXISTS idx_rufus_codigos_escola ON rufus_codigos_acesso(escola_id);

-- 2. RLS — somente super (ou admin da escola para ver os próprios códigos)
ALTER TABLE rufus_codigos_acesso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rufus codigos select" ON rufus_codigos_acesso;
CREATE POLICY "Rufus codigos select" ON rufus_codigos_acesso
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'traco.e.sc@gmail.com'
    OR EXISTS (
      SELECT 1 FROM professores p
      WHERE (p.email = (auth.jwt() ->> 'email') OR p.email_google = (auth.jwt() ->> 'email'))
        AND p.is_superadmin = true
    )
    OR escola_id IN (SELECT id FROM escolas WHERE email_admin = (auth.jwt() ->> 'email'))
  );

DROP POLICY IF EXISTS "Rufus codigos insert" ON rufus_codigos_acesso;
CREATE POLICY "Rufus codigos insert" ON rufus_codigos_acesso
  FOR INSERT WITH CHECK (is_rufus_admin());

DROP POLICY IF EXISTS "Rufus codigos delete" ON rufus_codigos_acesso;
CREATE POLICY "Rufus codigos delete" ON rufus_codigos_acesso
  FOR DELETE USING (is_rufus_admin());

-- 3. GERAR CÓDIGO (apenas superusuário)
CREATE OR REPLACE FUNCTION rufus_gerar_codigo_escola(p_escola_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT;
  v_alfa CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_i INT;
BEGIN
  IF NOT (
    (auth.jwt() ->> 'email') = 'traco.e.sc@gmail.com'
    OR EXISTS (
      SELECT 1 FROM professores p
      WHERE (p.email = (auth.jwt() ->> 'email') OR p.email_google = (auth.jwt() ->> 'email'))
        AND p.is_superadmin = true
    )
  ) THEN
    RAISE EXCEPTION 'Apenas superusuário pode gerar códigos de terminal para escolas.';
  END IF;

  LOOP
    v_codigo := 'RUFUS-';
    FOR v_i IN 1..8 LOOP
      v_codigo := v_codigo || substring(v_alfa FROM 1 + floor(random() * length(v_alfa))::int FOR 1);
    END LOOP;

    BEGIN
      INSERT INTO rufus_codigos_acesso (codigo, escola_id, criado_por)
      VALUES (v_codigo, p_escola_id, auth.jwt() ->> 'email');
      RETURN v_codigo;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
END;
$$;

-- 4. VALIDAR CÓDIGO → escola (usado pelo instalador do terminal, sem login).
-- Restrita: retorna apenas a escola do código informado, nunca uma lista.
CREATE OR REPLACE FUNCTION rufus_validar_codigo_escola(p_codigo TEXT)
RETURNS TABLE (escola_id UUID, nome TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.escola_id, e.nome
  FROM rufus_codigos_acesso c
  JOIN escolas e ON e.id = c.escola_id
  WHERE c.codigo = upper(btrim(p_codigo))
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.rufus_gerar_codigo_escola(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rufus_gerar_codigo_escola(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rufus_validar_codigo_escola(TEXT) TO anon, authenticated, service_role;

-- 5. CONFERÊNCIA: liste os códigos existentes (no SQL Editor ignora RLS)
-- SELECT codigo, escola_id, criado_em FROM rufus_codigos_acesso ORDER BY criado_em DESC;