export const SUPABASE_SQL_SCRIPT = `-- =======================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS DO TERMINAL RUFUS
-- Projeto compartilhado com o sistema JustificaE (Atestados).
-- Este script NÃO altera nenhuma tabela existente do JustificaE
-- (escolas, turmas, alunos, atestados...). Ele cria apenas as
-- tabelas rufus_* exclusivas do controle de chamadas do RUFUS.
-- Cole este script no SQL Editor do seu projeto Supabase.
-- =======================================================

-- 1. Tabela de Chamadas RUFUS (uma linha por turma por dia)
CREATE TABLE IF NOT EXISTS rufus_chamadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  data_chamada DATE NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT rufus_chamadas_turma_data_unique UNIQUE (turma_id, data_chamada)
);

-- 2. Tabela de Registros de Faltas RUFUS
CREATE TABLE IF NOT EXISTS rufus_chamada_faltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_id UUID NOT NULL REFERENCES rufus_chamadas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE
);

-- Índices de alta performance para consulta do Kiosk
CREATE INDEX IF NOT EXISTS idx_rufus_chamadas_turma_data ON rufus_chamadas(turma_id, data_chamada);
CREATE INDEX IF NOT EXISTS idx_rufus_chamada_faltas_chamada ON rufus_chamada_faltas(chamada_id);

-- Habilitar Row Level Security (RLS) apenas nas tabelas rufus_*
-- Modo Kiosk (Sem Login): acesso total liberado para o anon key
ALTER TABLE rufus_chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rufus_chamada_faltas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kiosk total rufus_chamadas" ON rufus_chamadas;
CREATE POLICY "Kiosk total rufus_chamadas" ON rufus_chamadas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Kiosk total rufus_chamada_faltas" ON rufus_chamada_faltas;
CREATE POLICY "Kiosk total rufus_chamada_faltas" ON rufus_chamada_faltas FOR ALL USING (true) WITH CHECK (true);
`;

// Migração isolada: adiciona o controle de exibição no painel de chamadas.
// A coluna não interfere no JustificaE (default = true = exibir).
export const SUPABASE_ADD_MOSTRAR_NO_PAINEL_SQL = `-- =======================================================
-- MIGRAÇÃO: campo "mostrar no painel de chamadas" (tabela turmas)
-- Cole no SQL Editor do projeto Supabase e execute UMA vez.
-- Em seguida, defina mostrar_no_painel = false nas turmas que
-- devem ficar de fora do painel geral de chamadas da sala.
-- =======================================================
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS mostrar_no_painel BOOLEAN NOT NULL DEFAULT true;

-- [Opcional] Exemplo: ocultar turmas específicas do painel.
-- UPDATE turmas SET mostrar_no_painel = false
--   WHERE id IN ('<uuid-da-turma1>', '<uuid-da-turma2>');
`;

// Migração isolada: adiciona o segmento (grupo) da turma.
// A escola define livremente o rótulo (ex: 'EF', 'F2M', 'N', ...). 
// O terminal e o painel filtram as turmas por esse segmento.
export const SUPABASE_ADD_SEGMENTO_SQL = `-- =======================================================
-- MIGRAÇÃO: segmento (grupo) das turmas (tabela turmas)
-- Cole no SQL Editor do projeto Supabase e execute UMA vez.
-- Depois defina o segmento de cada turma no Painel > Configurações.
-- =======================================================
ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS segmento TEXT;

-- [Opcional] Exemplo: marcar as turmas do Fundamental 1.
-- UPDATE turmas SET segmento = 'EF' WHERE nome LIKE '%EF';
`;
