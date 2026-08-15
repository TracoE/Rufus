-- =======================================================
-- MIGRAÇÃO ESPECÍFICA: Superusuário RUFUS + coluna segmento
-- Cole este bloco no SQL Editor do Supabase e execute UMA vez.
-- Aditivo: NÃO apaga nem altera dados existentes (nem do JustificaE).
-- =======================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Coluna segmento (agrupamento livre das turmas, ex.: 'EF', 'F2', 'Medio')
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS segmento TEXT;

-- 2. Superusuário RUFUS (cria escolas no painel). Não pertence a uma escola.
--    Senha inicial do superusuário: 675245
INSERT INTO rufus_admin (email, nome, senha_hash, is_super)
VALUES (
  'traco.e.sc@gmail.com',
  'Superusuário RUFUS',
  crypt('675245', gen_salt('bf')),
  true
)
ON CONFLICT (email) WHERE is_super = true DO NOTHING;

-- 3. Garante as colunas de superusuário (caso o script completo não tenha rodado)
ALTER TABLE rufus_admin ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT false;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'rufus_admin' AND indexname = 'rufus_admin_super_email_unique'
  ) THEN
    CREATE UNIQUE INDEX rufus_admin_super_email_unique ON rufus_admin (email) WHERE is_super = true;
  END IF;
END
$do$;