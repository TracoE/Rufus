-- =======================================================
-- CAMADA ADMINISTRATIVA / PEDAGÃ“GICA DO RUFUS
-- Painel de Busca Ativa do Programa APOIA
-- Projeto compartilhado com o JustificaE â€” NÃƒO altera tabelas existentes.
-- Cria apenas: rufus_config, rufus_admin, busca_ativa_registros e o bucket de anexos.
-- Cole este script no SQL Editor do seu projeto Supabase.
-- =======================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. REGRAS DE GATILHO DOS ALERTAS (thresholds configurÃ¡veis)
CREATE TABLE IF NOT EXISTS rufus_config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao TEXT
);

INSERT INTO rufus_config (chave, valor, descricao) VALUES
  ('limite_faltas_atencao', '3', 'Faltas acumuladas no mÃªs que acionam a coluna EM ATENÃ‡ÃƒO'),
  ('limite_faltas_apoia', '5', 'Faltas acumuladas no mÃªs que acionam PRONTO PARA APOIA'),
  ('limite_tentativas_apoia', '3', 'Tentativas de contato sem sucesso que esgotam a busca ativa')
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE rufus_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kiosk leitura rufus_config" ON rufus_config;
CREATE POLICY "Kiosk leitura rufus_config" ON rufus_config FOR SELECT USING (true);

-- 2. LOGIN ADMINISTRATIVO SIMPLIFICADO (vÃ¡lido no servidor via SECURITY DEFINER)
-- Cada escola possui seus prÃ³prios administradores (rufus_admin.escola_id).
CREATE TABLE IF NOT EXISTS rufus_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  nome TEXT,
  senha_hash TEXT NOT NULL,
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- MigraÃ§Ã£o multi-escola: adiciona escola_id em instalaÃ§Ãµes antigas
ALTER TABLE rufus_admin ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE;
ALTER TABLE rufus_admin DROP CONSTRAINT IF EXISTS rufus_admin_email_key;

-- SuperusuÃ¡rio: pode criar escolas pelo painel (is_super = true; sem escola fixa)
ALTER TABLE rufus_admin ADD COLUMN IF NOT EXISTS is_super BOOLEAN NOT NULL DEFAULT false;
-- Unicidade do e-mail entre superusuÃ¡rios (escola_id Ã© NULL para eles, entÃ£o a UNIQUE (email, escola_id)
-- nÃ£o colide). Sem isso, rodar o script de novo duplicaria o superusuÃ¡rio.
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

-- Garante a unicidade (email, escola_id) â€” mesmo email pode existir em escolas diferentes.
-- NecessÃ¡rio para o ON CONFLICT abaixo e para a associaÃ§Ã£o admin â†’ escola.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rufus_admin_email_escola_unique'
      AND conrelid = 'rufus_admin'::regclass
  ) THEN
    ALTER TABLE rufus_admin
      ADD CONSTRAINT rufus_admin_email_escola_unique UNIQUE (email, escola_id);
  END IF;
END
$do$;

ALTER TABLE rufus_admin ENABLE ROW LEVEL SECURITY;
-- Sem polÃ­ticas diretas: o acesso Ã© feito APENAS pelas funÃ§Ãµes abaixo (senha com hash, nunca exposta ao cliente)

-- Vincula o admin padrÃ£o Ã  escola EEB Roland Harold Dornbusch (admins antigos sem escola)
UPDATE rufus_admin
SET escola_id = 'ada36312-3d8c-4e26-a94d-baf3fe120418'
WHERE email = 'eebrhd@gmail.com' AND escola_id IS NULL;

-- Admin padrÃ£o da escola EEB Roland Harold Dornbusch (senha inicial 000000 â€” solicitarÃ¡ troca no 1Âº acesso)
INSERT INTO rufus_admin (email, nome, senha_hash, escola_id) VALUES (
  'eebrhd@gmail.com',
  'AdministraÃ§Ã£o EEB Roland Harold Dornbusch',
  crypt('000000', gen_salt('bf')),
  'ada36312-3d8c-4e26-a94d-baf3fe120418'
) ON CONFLICT (email, escola_id) DO NOTHING;

-- SuperusuÃ¡rio RUFUS (cria escolas no painel). NÃ£o pertence a uma escola especÃ­fica.
INSERT INTO rufus_admin (email, nome, senha_hash, is_super)
VALUES (
  'traco.e.sc@gmail.com',
  'SuperusuÃ¡rio RUFUS',
  crypt('675245', gen_salt('bf')),
  true
)
ON CONFLICT (email) WHERE is_super = true DO NOTHING;

CREATE OR REPLACE FUNCTION rufus_validar_login(p_email TEXT, p_senha TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  adm rufus_admin%ROWTYPE;
BEGIN
  SELECT * INTO adm FROM rufus_admin WHERE lower(email) = lower(p_email);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'E-mail nÃ£o cadastrado no painel RUFUS.');
  END IF;
  IF adm.senha_hash = crypt(p_senha, adm.senha_hash) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'nome', adm.nome,
      'email', adm.email,
      'escola_id', adm.escola_id,
      'is_super', adm.is_super,
      'senha_padrao', (adm.senha_hash = crypt('000000', adm.senha_hash))
    );
  END IF;
  RETURN jsonb_build_object('ok', false, 'msg', 'Senha incorreta. Tente novamente.');
END;
$$;

-- Cria uma nova escola + seu primeiro administrador. SOMENTE o superusuÃ¡rio executa.
-- Retorna o id da escola criada para o painel.
CREATE OR REPLACE FUNCTION rufus_criar_escola(
  p_email_super TEXT,
  p_senha_super TEXT,
  p_nome_escola TEXT,
  p_email_admin TEXT,
  p_nome_admin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  sup rufus_admin%ROWTYPE;
  v_escola_id UUID;
BEGIN
  -- 1. Valida o superusuÃ¡rio (email + senha)
  SELECT * INTO sup FROM rufus_admin
  WHERE lower(email) = lower(p_email_super) AND is_super = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'Apenas o superusuÃ¡rio pode criar escolas.');
  END IF;
  IF sup.senha_hash <> crypt(p_senha_super, sup.senha_hash) THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'Senha do superusuÃ¡rio incorreta.');
  END IF;

  -- 2. Valida campos
  IF length(coalesce(p_nome_escola, '')) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'Informe o nome da escola (mÃ­nimo 3 caracteres).');
  END IF;
  IF p_email_admin IS NULL OR position('@' in p_email_admin) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'Informe o e-mail do administrador da escola.');
  END IF;

  -- 3. Cria a escola (tabela partilhada com o JustificaE)
  INSERT INTO escolas (nome, email_admin, data_corte_atestados)
  VALUES (p_nome_escola, lower(p_email_admin), CURRENT_DATE)
  RETURNING id INTO v_escola_id;

  -- 4. Cria o primeiro administrador da escola (senha inicial 000000 â€” troca no 1Âº acesso)
  INSERT INTO rufus_admin (email, nome, senha_hash, escola_id)
  VALUES (
    lower(p_email_admin),
    coalesce(p_nome_admin, p_nome_escola),
    crypt('000000', gen_salt('bf')),
    v_escola_id
  )
  ON CONFLICT (email, escola_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'msg', 'Escola criada com sucesso.',
    'escola_id', v_escola_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION rufus_alterar_senha(p_email TEXT, p_senha_atual TEXT, p_nova_senha TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  adm rufus_admin%ROWTYPE;
BEGIN
  SELECT * INTO adm FROM rufus_admin WHERE lower(email) = lower(p_email);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'E-mail nÃ£o cadastrado.');
  END IF;
  IF adm.senha_hash <> crypt(p_senha_atual, adm.senha_hash) THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'Senha atual incorreta.');
  END IF;
  IF length(coalesce(p_nova_senha, '')) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'A nova senha deve ter ao menos 4 caracteres.');
  END IF;
  UPDATE rufus_admin SET senha_hash = crypt(p_nova_senha, gen_salt('bf')) WHERE id = adm.id;
  RETURN jsonb_build_object('ok', true, 'msg', 'Senha alterada com sucesso.');
END;
$$;

-- 3. REGISTROS DE BUSCA ATIVA (intervenÃ§Ãµes pedagÃ³gicas)
CREATE TABLE IF NOT EXISTS busca_ativa_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  tipo_contato TEXT NOT NULL CHECK (tipo_contato IN ('Ligacao','WhatsApp','Reuniao Presencial','Carta Registrada','Visita Domiciliar')),
  data_contato DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel_contatado TEXT,
  observacoes TEXT,
  anexo_url TEXT,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO','CONCLUIDO','SEM_SUCESSO','RESOLVIDO')),
  criado_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_busca_ativa_aluno ON busca_ativa_registros(aluno_id);
CREATE INDEX IF NOT EXISTS idx_busca_ativa_escola ON busca_ativa_registros(escola_id);

ALTER TABLE busca_ativa_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kiosk total busca_ativa_registros" ON busca_ativa_registros;
CREATE POLICY "Kiosk total busca_ativa_registros" ON busca_ativa_registros FOR ALL USING (true) WITH CHECK (true);

-- 4. STORAGE: bucket pÃºblico para os anexos da busca ativa (atestados, recibos, fotos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('busca_ativa_anexos', 'busca_ativa_anexos', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- PolÃ­ticas restritas ao bucket do RUFUS (nÃ£o afetam buckets do JustificaE)
DROP POLICY IF EXISTS "Rufus anexos read" ON storage.objects;
CREATE POLICY "Rufus anexos read" ON storage.objects FOR SELECT USING (bucket_id = 'busca_ativa_anexos');

DROP POLICY IF EXISTS "Rufus anexos insert" ON storage.objects;
CREATE POLICY "Rufus anexos insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'busca_ativa_anexos');

DROP POLICY IF EXISTS "Rufus anexos update" ON storage.objects;
CREATE POLICY "Rufus anexos update" ON storage.objects FOR UPDATE USING (bucket_id = 'busca_ativa_anexos') WITH CHECK (bucket_id = 'busca_ativa_anexos');

DROP POLICY IF EXISTS "Rufus anexos delete" ON storage.objects;
CREATE POLICY "Rufus anexos delete" ON storage.objects FOR DELETE USING (bucket_id = 'busca_ativa_anexos');

