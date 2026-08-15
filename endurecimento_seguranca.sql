-- =======================================================
-- ENDURECIMENTO DE SEGURANÇA — RUFUS (opção B — mínimo viável)
-- Aplica-se ao banco JÁ existente (idempotente: pode rodar quando quiser).
-- Objetivo: bloquear escrita/exclusão ANÔNIMA e de contas Google aleatórias,
-- mantendo (a) leitura pública para o kiosk/testSupabaseConnection e
-- (b) NENHUMA alteração nas tabelas que o JustificaE e o kiosk usam.
-- Cole este script no SQL Editor do seu projeto Supabase e execute.
-- =======================================================

-- -------------------------------------------------------
-- FUNÇÃO DE AUTORIZAÇÃO
-- Retorna true apenas para os e-mails com direito ao PAINEL ADMIN RUFUS:
--   • admin de escola (escolas.email_admin)
--   • superusuário (traco.e.sc@gmail.com)
--   • professor com is_superadmin = true
-- Observação: NÃO desligue o "Allow new users to sign up" (disable_signup),
-- pois isso quebraria o primeiro acesso via Google (OAuth) de novos admins e
-- professores — o Supabase recusa "Signups not allowed for this instance".
-- A segurança aqui é garantida pelo critério de E-MAIL, não pelo signup.
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- 1. BUSCA ATIVA: escrita/delete só para e-mails autorizados.
--    Leitura segue pública — só o kiosk lê (SELECT id) no testSupabaseConnection.
--    (Protege contra DELETE anônimo 204 encontrado na auditoria e contra
--     qualquer Google account registrada aleatoriamente.)
-- -------------------------------------------------------
ALTER TABLE busca_ativa_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kiosk total busca_ativa_registros" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa select" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa insert" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa update" ON busca_ativa_registros;
DROP POLICY IF EXISTS "Rufus busca ativa delete" ON busca_ativa_registros;

CREATE POLICY "Rufus busca ativa select" ON busca_ativa_registros
  FOR SELECT USING (true);

CREATE POLICY "Rufus busca ativa insert" ON busca_ativa_registros
  FOR INSERT WITH CHECK (is_rufus_admin());

CREATE POLICY "Rufus busca ativa update" ON busca_ativa_registros
  FOR UPDATE USING (is_rufus_admin()) WITH CHECK (is_rufus_admin());

CREATE POLICY "Rufus busca ativa delete" ON busca_ativa_registros
  FOR DELETE USING (is_rufus_admin());

-- -------------------------------------------------------
-- 2. STORAGE: upload/substituição/exclusão só para e-mails autorizados.
--    O bucket CONTINUA público (opção escolhida): anexos novos e antigos
--    seguem abrindo; apenas escrita não-autorizada é bloqueada.
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Rufus anexos insert" ON storage.objects;
DROP POLICY IF EXISTS "Rufus anexos update" ON storage.objects;
DROP POLICY IF EXISTS "Rufus anexos delete" ON storage.objects;

CREATE POLICY "Rufus anexos insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin());

CREATE POLICY "Rufus anexos update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin())
  WITH CHECK (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin());

CREATE POLICY "Rufus anexos delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'busca_ativa_anexos' AND is_rufus_admin());

-- -------------------------------------------------------
-- 3. O QUE NÃO FOI ALTERADO (intencional, por dependência):
--    - turmas, alunos, professores, atestados, escolas, rufus_config,
--      rufus_chamadas, rufus_chamada_faltas: leitura E escrita do kiosk
--      diário e do JustificaE precisam de acesso anônimo — não dá para
--      fechar sem quebrar o kiosk ou sem alterar o JustificaE (fora do B).
--    - NÃO desligar disable_signup (veja nota na função acima).
-- -------------------------------------------------------