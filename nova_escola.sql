-- =======================================================
-- GUIA: CADASTRAR UMA NOVA ESCOLA NO RUFUS (mesmo banco)
-- Execute no SQL Editor do Supabase.
-- Colunas da tabela `escolas` (projeto compartilhado JustificaE):
--   id, nome, email_admin, data_corte_atestados, created_at
-- =======================================================

-- 1. NOVA ESCOLA (troque os dados)
INSERT INTO escolas (nome, email_admin, data_corte_atestados)
VALUES (
  'EEB EXEMPLO',
  'admin@escolaexemplo.com.br',
  CURRENT_DATE
)
RETURNING id;  -- ANOTE O ID RETORNADO (escola_id)

-- 2. ADMINISTRADOR DESSA ESCOLA (troque email/senha/escola_id)
INSERT INTO rufus_admin (email, nome, senha_hash, escola_id)
VALUES (
  'admin@escolaexemplo.com.br',
  'Administração EEB Exemplo',
  crypt('000000', gen_salt('bf')),   -- senha inicial 000000 (troca no 1º acesso)
  'COLE_AQUI_O_UUID_DA_ESCOLA'       -- id retornado no passo 1
)
ON CONFLICT (email, escola_id) DO NOTHING;

-- 3. CONFERIR (escola + admin vinculado)
SELECT e.id, e.nome, a.email AS admin_email, a.nome AS admin_nome
FROM escolas e
LEFT JOIN rufus_admin a ON a.escola_id = e.id
ORDER BY e.nome;