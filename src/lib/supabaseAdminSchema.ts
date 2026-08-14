export const ADMIN_SQL_SCRIPT = `-- =======================================================
-- CAMADA ADMINISTRATIVA / PEDAGÓGICA DO RUFUS
-- Painel de Busca Ativa do Programa APOIA
-- Projeto compartilhado com o JustificaE — NÃO altera tabelas existentes.
-- Cria apenas: rufus_config, rufus_admin, busca_ativa_registros e o bucket de anexos.
-- Cole este script no SQL Editor do seu projeto Supabase.
-- =======================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. REGRAS DE GATILHO DOS ALERTAS (thresholds configuráveis)
CREATE TABLE IF NOT EXISTS rufus_config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao TEXT
);

INSERT INTO rufus_config (chave, valor, descricao) VALUES
  ('limite_faltas_atencao', '3', 'Faltas acumuladas no mês que acionam a coluna EM ATENÇÃO'),
  ('limite_faltas_apoia', '5', 'Faltas acumuladas no mês que acionam PRONTO PARA APOIA'),
  ('limite_tentativas_apoia', '3', 'Tentativas de contato sem sucesso que esgotam a busca ativa')
ON CONFLICT (chave) DO NOTHING;

ALTER TABLE rufus_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kiosk leitura rufus_config" ON rufus_config;
CREATE POLICY "Kiosk leitura rufus_config" ON rufus_config FOR SELECT USING (true);

-- 2. LOGIN ADMINISTRATIVO SIMPLIFICADO (válido no servidor via SECURITY DEFINER)
CREATE TABLE IF NOT EXISTS rufus_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  senha_hash TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rufus_admin ENABLE ROW LEVEL SECURITY;
-- Sem políticas diretas: o acesso é feito APENAS pelas funções abaixo (senha com hash, nunca exposta ao cliente)

-- Admin padrão da escola (senha inicial 000000 — solicitará troca no 1º acesso)
INSERT INTO rufus_admin (email, nome, senha_hash) VALUES (
  'eebrhd@gmail.com',
  'Administração EEB Roland Harold Dornbusch',
  crypt('000000', gen_salt('bf'))
) ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION rufus_validar_login(p_email TEXT, p_senha TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  adm rufus_admin%ROWTYPE;
BEGIN
  SELECT * INTO adm FROM rufus_admin WHERE lower(email) = lower(p_email);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'msg', 'E-mail não cadastrado no painel RUFUS.');
  END IF;
  IF adm.senha_hash = crypt(p_senha, adm.senha_hash) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'nome', adm.nome,
      'email', adm.email,
      'senha_padrao', (adm.senha_hash = crypt('000000', adm.senha_hash))
    );
  END IF;
  RETURN jsonb_build_object('ok', false, 'msg', 'Senha incorreta. Tente novamente.');
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
    RETURN jsonb_build_object('ok', false, 'msg', 'E-mail não cadastrado.');
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

-- 3. REGISTROS DE BUSCA ATIVA (intervenções pedagógicas)
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

-- 4. STORAGE: bucket público para os anexos da busca ativa (atestados, recibos, fotos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('busca_ativa_anexos', 'busca_ativa_anexos', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Políticas restritas ao bucket do RUFUS (não afetam buckets do JustificaE)
DROP POLICY IF EXISTS "Rufus anexos read" ON storage.objects;
CREATE POLICY "Rufus anexos read" ON storage.objects FOR SELECT USING (bucket_id = 'busca_ativa_anexos');

DROP POLICY IF EXISTS "Rufus anexos insert" ON storage.objects;
CREATE POLICY "Rufus anexos insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'busca_ativa_anexos');

DROP POLICY IF EXISTS "Rufus anexos update" ON storage.objects;
CREATE POLICY "Rufus anexos update" ON storage.objects FOR UPDATE USING (bucket_id = 'busca_ativa_anexos') WITH CHECK (bucket_id = 'busca_ativa_anexos');

DROP POLICY IF EXISTS "Rufus anexos delete" ON storage.objects;
CREATE POLICY "Rufus anexos delete" ON storage.objects FOR DELETE USING (bucket_id = 'busca_ativa_anexos');
`;
