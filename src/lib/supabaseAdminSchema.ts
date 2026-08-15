export const ADMIN_SQL_SCRIPT = `-- =======================================================
-- CAMADA ADMINISTRATIVA / PEDAGÓGICA DO RUFUS
-- Painel de Busca Ativa do Programa APOIA
-- Projeto compartilhado com o JustificaE — NÃO altera tabelas existentes.
-- Cria apenas: rufus_config, busca_ativa_registros e o bucket de anexos.
-- Autenticação: conta Google (Supabase Auth, padrão JustificaE). A escola é
-- resolvida pelas tabelas do JustificaE (professores / escolas.email_admin).
-- Cole este script no SQL Editor do seu projeto Supabase.
-- =======================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0. AUTORIZAÇÃO DO PAINEL RUFUS — autoriza escrita de Busca Ativa/anexos apenas
-- para e-mails com direito ao painel: admin de escola (escolas.email_admin),
-- superusuário (traco.e.sc@gmail.com) ou professor is_superadmin = true.
-- Não desligar disable_signup (quebraria 1º acesso Google de novos admins).
CREATE OR REPLACE FUNCTION is_rufus_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM escolas e
    WHERE e.email_admin = (auth.jwt() ->> 'email')
  )
  OR (auth.jwt() ->> 'email') = 'traco.e.sc@gmail.com'
  OR EXISTS (
    SELECT 1 FROM professores p
    WHERE (p.email = (auth.jwt() ->> 'email') OR p.email_google = (auth.jwt() ->> 'email'))
      AND p.is_superadmin = true
  )
$$;

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

-- 2. LOGIN ADMINISTRATIVO — ACESSO COM CONTA GOOGLE (Supabase Auth, padrão JustificaE)
-- O Painel Administrativo do RUFUS autentica pela conta Google do administrador da escola,
-- usando o MESMO Supabase Auth do JustificaE. A escola de atuação é resolvida em tempo
-- real pelas tabelas do JustificaE: professores (email/email_google) ou escolas.email_admin.
-- NÃO existe mais senha própria do RUFUS nem cadastro de escola aqui — a escola é criada
-- pelo superusuário no painel do JustificaE.
-- Para habilitar, configure no Supabase: Authentication → Sign In / Up → Google Provider,
-- e adicione a URL de produção do RUFUS em Redirect URLs.

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
-- Dossiê protegido: leitura, escrita e delete apenas para e-mails autorizados
-- (is_rufus_admin). O kiosk detecta a camada admin via rufus_config.
DROP POLICY IF EXISTS "Kiosk total busca_ativa_registros" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa select" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa insert" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa update" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa delete" ON busca_ativa_registros;
CREATE POLICY "Rufus busca ativa select" ON busca_ativa_registros FOR SELECT USING (is_rufus_admin());
CREATE POLICY "Rufus busca ativa insert" ON busca_ativa_registros FOR INSERT WITH CHECK (is_rufus_admin());
CREATE POLICY "Rufus busca ativa update" ON busca_ativa_registros FOR UPDATE USING (is_rufus_admin()) WITH CHECK (is_rufus_admin());
CREATE POLICY "Rufus busca ativa delete" ON busca_ativa_registros FOR DELETE USING (is_rufus_admin());

-- 4. STORAGE: bucket público para os anexos da busca ativa (atestados, recibos, fotos).
-- Permanece público para garantir abertura dos anexos; escrita (upload/subst./delete)
-- apenas para e-mails autorizados (is_rufus_admin).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('busca_ativa_anexos', 'busca_ativa_anexos', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Políticas restritas ao bucket do RUFUS (não afetam buckets do JustificaE)
DROP POLICY IF EXISTS "Rufus anexos read" ON storage.objects;
CREATE POLICY "Rufus anexos read" ON storage.objects FOR SELECT USING (bucket_id = 'busca_ativa_anexos');

DROP POLICY IF EXISTS "Rufus anexos insert" ON storage.objects;
CREATE POLICY "Rufus anexos insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin());

DROP POLICY IF EXISTS "Rufus anexos update" ON storage.objects;
CREATE POLICY "Rufus anexos update" ON storage.objects FOR UPDATE USING (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin()) WITH CHECK (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin());

DROP POLICY IF EXISTS "Rufus anexos delete" ON storage.objects;
CREATE POLICY "Rufus anexos delete" ON storage.objects FOR DELETE USING (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin());

-- 5. SEGMENTO (GRUPO) DAS TURMAS — usado pelos terminais fixos e filtro do painel.
-- Rótulo livre definido pela escola (ex.: 'EF', 'F2', 'Medio'). Terminal vazio = mostra todas.
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS segmento TEXT;
`;
