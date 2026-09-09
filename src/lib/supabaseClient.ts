import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Turma, Aluno, Chamada, ChamadaFalta, TurmaComChamada, AlunoComFalta, SupabaseConfig, ApoiaAlert } from '../types';
import { INITIAL_TURMAS, INITIAL_ALUNOS, generateInitialChamadasToday } from './mockData';

// Local storage key for fallback memory engine persistence
const LOCAL_STORAGE_KEY_TURMAS = 'kiosk_apoia_turmas_v1';
const LOCAL_STORAGE_KEY_ALUNOS = 'kiosk_apoia_alunos_v1';
const LOCAL_STORAGE_KEY_CHAMADAS = 'kiosk_apoia_chamadas_v1';
const LOCAL_STORAGE_KEY_FALTAS = 'kiosk_apoia_faltas_v1';
const LOCAL_STORAGE_KEY_CREDENTIALS = 'kiosk_apoia_credentials_v1';
const LOCAL_STORAGE_KEY_ESCOLA = 'kiosk_apoia_escola_id_v1';
const LOCAL_STORAGE_KEY_SEGMENTO = 'kiosk_apoia_segmento_v1';
const LOCAL_STORAGE_KEY_TURMAS_TERMINAL = 'kiosk_apoia_turmas_terminal_v1';

// Escola padrão do kiosk RUFUS (tabela escolas do projeto compartilhado)
const DEFAULT_ESCOLA_ID = 'ada36312-3d8c-4e26-a94d-baf3fe120418';

// Em produção o aplicativo EXIGE o banco de dados (sem modo demo / sem fallback local).
// Fora de produção (dev) o modo demo continua disponível para facilitar o desenvolvimento.
export const REQUIRE_DATABASE = import.meta.env.PROD;

// Erro claro e orientativo quando o banco não está disponível
export function databaseError(detalhe?: string): Error {
  const msg = 'O RUFUS precisa do banco de dados (Supabase) para funcionar neste ambiente. ' +
    'Verifique se o projeto Supabase está configurado e se há conexão com a internet.';
  return new Error(detalhe ? `${msg}\n${detalhe}` : msg);
}

// Retorna a data local no formato YYYY-MM-DD (evita bug de fuso do toISOString)
export function getLocalDateStr(d: Date = new Date()): string {
  const offsetMin = d.getTimezoneOffset();
  return new Date(d.getTime() - offsetMin * 60000).toISOString().split('T')[0];
}

// ID da escola usada pelo kiosk: localStorage > env > padrão
// A escola é definida na instalação (tela de configuração do aparelho).
// Se o aparelho não tiver escola configurada, usa VITE_ESCOLA_ID do build.
export function getEscolaId(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ESCOLA);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    console.warn('Erro ao ler escola do localStorage', e);
  }
  return import.meta.env.VITE_ESCOLA_ID || DEFAULT_ESCOLA_ID;
}

// Se o aparelho já tem uma escola definida (no localStorage, escolhida na
// instalação por código). Usado para decidir se o terminal precisa do
// instalador no primeiro uso (sem login). Ignora VITE_ESCOLA_ID de propósito:
// num deploy multi-escola, uma escola fixa no build impediria a instalação
// por código e travaria todos os terminais na mesma escola.
export function hasEscolaConfigurada(): boolean {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ESCOLA);
    return !!(saved && saved.trim());
  } catch (e) {
    console.warn('Erro ao ler escola do localStorage', e);
    return false;
  }
}

export function saveStoredEscolaId(escolaId: string) {
  try {
    if (escolaId.trim()) {
      localStorage.setItem(LOCAL_STORAGE_KEY_ESCOLA, escolaId.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_ESCOLA);
    }
  } catch (e) {
    console.error('Erro ao salvar escola', e);
  }
}

// Segmento (grupo) que este terminal exibe. Se vazio, mostra todas as turmas.
export function getSegmento(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SEGMENTO);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    console.warn('Erro ao ler segmento do localStorage', e);
  }
  return '';
}

export function saveStoredSegmento(segmento: string) {
  try {
    if (segmento.trim()) {
      localStorage.setItem(LOCAL_STORAGE_KEY_SEGMENTO, segmento.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_SEGMENTO);
    }
  } catch (e) {
    console.error('Erro ao salvar segmento', e);
  }
}

// IDs das turmas que este terminal deve exibir. Array vazio = todas as turmas.
export function getTurmasTerminal(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_TURMAS_TERMINAL);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler turmas do terminal do localStorage', e);
  }
  return [];
}

export function saveTurmasTerminal(turmasIds: string[]) {
  try {
    if (turmasIds.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY_TURMAS_TERMINAL, JSON.stringify(turmasIds));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_TURMAS_TERMINAL);
    }
  } catch (e) {
    console.error('Erro ao salvar turmas do terminal', e);
  }
}

// Busca o nome da escola na tabela `escolas` (partilhada com o JustificaE).
// Retorna null quando o banco não está disponível; o chamador mostra fallback.
export async function fetchEscolaNome(escolaId: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('escolas').select('nome').eq('id', escolaId).limit(1);
    if (error) {
      console.warn('Erro ao buscar nome da escola:', error.message);
      return null;
    }
    const nome = data?.[0]?.nome;
    return typeof nome === 'string' && nome.trim() ? nome.trim() : null;
  } catch (err) {
    console.warn('Falha ao buscar nome da escola:', err);
    return null;
  }
}

// Helper to get environment or custom saved credentials
// A instalação pode ter credenciais próprias (configuradas na tela do aparelho).
// Se não houver nada salvo, usa as variáveis de ambiente do build (Vercel).
export function getStoredCredentials(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CREDENTIALS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.key) {
        return { url: parsed.url, key: parsed.key };
      }
    }
  } catch (e) {
    console.warn('Erro ao ler credenciais do localStorage', e);
  }

  return { url: envUrl, key: envKey };
}

export function saveStoredCredentials(url: string, key: string) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_CREDENTIALS, JSON.stringify({ url, key }));
  } catch (e) {
    console.error('Erro ao salvar credenciais', e);
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getStoredCredentials();
  
  // Check if valid non-placeholder url
  if (!url || !key || url.includes('your-project') || key.includes('your-anon-key')) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key);
    } catch (err) {
      console.error('Falha ao instanciar Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

// Update visibility of a turma in the call dashboard (per school, shared turmas table)
export async function updateTurmaVisibilidade(turmaId: string, mostrarNoPainel: boolean): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('turmas')
      .update({ mostrar_no_painel: mostrarNoPainel })
      .eq('id', turmaId);
    if (error) {
      console.error('Erro ao atualizar visibilidade da turma:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao atualizar visibilidade da turma:', err);
    return false;
  }
}

export async function updateTurmaSegmento(turmaId: string, segmento: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('turmas')
      .update({ segmento: segmento.trim() ? segmento.trim() : null })
      .eq('id', turmaId);
    if (error) {
      console.error('Erro ao atualizar segmento da turma:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao atualizar segmento da turma:', err);
    return false;
  }
}

// Senha de 4 dígitos da ESCOLA deste terminal, exigida ao abrir a chamada.
// Leitura pública (rufus_senhas_chamada); retorna '' quando não configurada ou em erro.
export async function fetchSenhaChamadaTerminal(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) return '';
  try {
    const { data, error } = await client.from('rufus_senhas_chamada').select('senha').eq('escola_id', getEscolaId()).limit(1);
    if (error) return '';
    const valor = (data as { senha: string }[] | null)?.[0]?.senha || '';
    return /^\d{4}$/.test(valor.trim()) ? valor.trim() : '';
  } catch (err) {
    console.warn('Falha ao ler senha da chamada no terminal:', err);
    return '';
  }
}

// Check real Supabase connectivity (existing tables + rufus_* tables created)
export async function testSupabaseConnection(): Promise<SupabaseConfig> {
  const { url, key } = getStoredCredentials();
  const client = getSupabaseClient();

  if (!client) {
    return { url, key, isConnected: false, isMock: true };
  }

  try {
    const { data, error } = await client.from('turmas').select('id').limit(1);
    if (error) {
      console.warn('Supabase query error (likely project not configured):', error.message);
      return { url, key, isConnected: false, isMock: true };
    }
    // As tabelas rufus_* precisam existir para o kiosk gravar chamadas
    const { error: errRufus } = await client.from('rufus_chamadas').select('id').limit(1);
    if (errRufus) {
      console.warn('Tabelas rufus_* ainda não criadas (rode o script SQL):', errRufus.message);
      return { url, key, isConnected: false, isMock: true };
    }
    // Camada administrativa (Busca Ativa / APOIA)
    // Usa rufus_config (leitura pública) para detectar a camada; o dossiê
    // (busca_ativa_registros) tem leitura restrita a admins logados.
    const { error: errAdmin } = await client.from('rufus_config').select('chave').limit(1);
    const adminReady = !errAdmin;
    if (errAdmin) {
      console.warn('Tabelas administrativas ainda não criadas (Busca Ativa):', errAdmin.message);
    }
    return { url, key, isConnected: true, isMock: false, adminReady };
  } catch (err) {
    return { url, key, isConnected: false, isMock: true };
  }
}

// --- LOCAL STORAGE FALLBACK ENGINE ---
function getLocalData() {
  let turmas: Turma[] = [];
  let alunos: Aluno[] = [];
  let chamadas: Chamada[] = [];
  let faltas: ChamadaFalta[] = [];

  try {
    const rawT = localStorage.getItem(LOCAL_STORAGE_KEY_TURMAS);
    const rawA = localStorage.getItem(LOCAL_STORAGE_KEY_ALUNOS);
    const rawC = localStorage.getItem(LOCAL_STORAGE_KEY_CHAMADAS);
    const rawF = localStorage.getItem(LOCAL_STORAGE_KEY_FALTAS);

    if (rawT && rawA && rawC && rawF) {
      turmas = JSON.parse(rawT);
      alunos = JSON.parse(rawA);
      chamadas = JSON.parse(rawC);
      faltas = JSON.parse(rawF);
    } else {
      // Seed initial data
      turmas = INITIAL_TURMAS;
      alunos = INITIAL_ALUNOS;
      const initial = generateInitialChamadasToday();
      chamadas = initial.chamadas;
      faltas = initial.faltas;

      localStorage.setItem(LOCAL_STORAGE_KEY_TURMAS, JSON.stringify(turmas));
      localStorage.setItem(LOCAL_STORAGE_KEY_ALUNOS, JSON.stringify(alunos));
      localStorage.setItem(LOCAL_STORAGE_KEY_CHAMADAS, JSON.stringify(chamadas));
      localStorage.setItem(LOCAL_STORAGE_KEY_FALTAS, JSON.stringify(faltas));
    }
  } catch (e) {
    turmas = INITIAL_TURMAS;
    alunos = INITIAL_ALUNOS;
    const initial = generateInitialChamadasToday();
    chamadas = initial.chamadas;
    faltas = initial.faltas;
  }

  return { turmas, alunos, chamadas, faltas };
}

function saveLocalData(chamadas: Chamada[], faltas: ChamadaFalta[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_CHAMADAS, JSON.stringify(chamadas));
    localStorage.setItem(LOCAL_STORAGE_KEY_FALTAS, JSON.stringify(faltas));
  } catch (e) {
    console.error('Erro ao salvar local storage:', e);
  }
}

// Reset Local Data to Seed
export function resetLocalData() {
  localStorage.removeItem(LOCAL_STORAGE_KEY_TURMAS);
  localStorage.removeItem(LOCAL_STORAGE_KEY_ALUNOS);
  localStorage.removeItem(LOCAL_STORAGE_KEY_CHAMADAS);
  localStorage.removeItem(LOCAL_STORAGE_KEY_FALTAS);
}

// --- CORE DATA OPERATIONS (SUPABASE WITH LOCAL FALLBACK) ---

/**
 * 1. Fetch Turmas with Chamada Status for CURRENT_DATE
 * Usa a tabela turmas existente (JustificaE) e as tabelas rufus_* do kiosk.
 */
export async function fetchTurmasComStatus(dataChamadaDateStr?: string): Promise<{ data: TurmaComChamada[]; isMock: boolean }> {
  const targetDate = dataChamadaDateStr || getLocalDateStr();
  const client = getSupabaseClient();
  const escolaId = getEscolaId();

  if (client) {
    try {
      // Fetch turmas da escola (tabela existente do JustificaE)
      const { data: turmasDb, error: errT } = await client
        .from('turmas')
        .select('*')
        .eq('escola_id', escolaId);
      if (errT) throw errT;
      let turmasVisiveis: Turma[];
      const temCampoSegmento = (turmasDb || []).some((t: Turma) => 'segmento' in t);
      const segmento = getSegmento();
      if (segmento && temCampoSegmento) {
        // Terminal fixo em um segmento: mostra apenas as turmas dele,
        // mesmo as marcadas como ocultas do painel geral (ex.: F1).
        turmasVisiveis = (turmasDb || []).filter((t: Turma) => t.segmento === segmento);
      } else {
        turmasVisiveis = (turmasDb || []).filter((t: Turma) => t.mostrar_no_painel !== false);
      }

      // Filtro por turmas selecionadas para este terminal (multi-seleção)
      const turmasTerminal = getTurmasTerminal();
      if (turmasTerminal.length > 0) {
        turmasVisiveis = turmasVisiveis.filter((t: Turma) => turmasTerminal.includes(t.id));
      }

      if (turmasVisiveis.length === 0) {
        // Banco ok, mas nenhuma turma visível para esta escola
        return { data: [], isMock: false };
      }

      const turmaIds = turmasVisiveis.map((t: Turma) => t.id);

      // Fetch chamadas rufus de hoje + contagem de alunos ativos por turma
      const [chamadasRes, alunosRes] = await Promise.all([
        client
          .from('rufus_chamadas')
          .select('*')
          .eq('data_chamada', targetDate)
          .in('turma_id', turmaIds),
        client
          .from('alunos')
          .select('id, turma_id')
          .eq('escola_id', escolaId)
      ]);

      const chamadasDb = chamadasRes.data || [];
      const alunosDb = alunosRes.data || [];

      // Fetch faltas das chamadas de hoje
      const chamadaIdsToday = chamadasDb.map((c: { id: string }) => c.id);
      let faltasDb: ChamadaFalta[] = [];
      if (chamadaIdsToday.length > 0) {
        const { data: fData } = await client
          .from('rufus_chamada_faltas')
          .select('*')
          .in('chamada_id', chamadaIdsToday);
        faltasDb = fData || [];
      }

      const result: TurmaComChamada[] = turmasVisiveis.map((t: Turma) => {
        const cham = chamadasDb.find((c: { turma_id: string }) => c.turma_id === t.id);
        const totalAlunos = alunosDb.filter(a => a.turma_id === t.id).length;

        if (cham) {
          const qtdFaltas = faltasDb.filter(f => f.chamada_id === cham.id).length;
          const criadoEmDate = new Date(cham.criado_em);
          const horarioFormated = criadoEmDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          return {
            id: t.id,
            nome: t.nome,
            escola_id: t.escola_id,
            ano_letivo: t.ano_letivo,
            total_alunos: totalAlunos || 0,
            realizada: true,
            chamada_id: cham.id,
            horario_registro: horarioFormated,
            qtd_faltantes: qtdFaltas
          };
        } else {
          return {
            id: t.id,
            nome: t.nome,
            escola_id: t.escola_id,
            ano_letivo: t.ano_letivo,
            total_alunos: totalAlunos || 0,
            realizada: false,
            qtd_faltantes: 0
          };
        }
      });

      return { data: result, isMock: false };
    } catch (err) {
      if (REQUIRE_DATABASE) throw databaseError((err as Error).message);
      console.warn('Erro ao conectar com Supabase, usando local fallback:', err);
    }
  } else if (REQUIRE_DATABASE) {
    throw databaseError();
  }

  // --- LOCAL FALLBACK ENGINE (apenas fora de produção) ---
  const { turmas, alunos, chamadas, faltas } = getLocalData();
  let turmasVisiveis = turmas.filter(t => t.mostrar_no_painel !== false);
  const turmasTerminalLocal = getTurmasTerminal();
  if (turmasTerminalLocal.length > 0) {
    turmasVisiveis = turmasVisiveis.filter(t => turmasTerminalLocal.includes(t.id));
  }
  const chamadasToday = chamadas.filter(c => c.data_chamada === targetDate);

  const result: TurmaComChamada[] = turmasVisiveis.map(t => {
    const cham = chamadasToday.find(c => c.turma_id === t.id);
    const totalAlunos = alunos.filter(a => a.turma_id === t.id).length;

    if (cham) {
      const qtdFaltas = faltas.filter(f => f.chamada_id === cham.id).length;
      const horarioFormated = new Date(cham.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        ...t,
        total_alunos: totalAlunos,
        realizada: true,
        chamada_id: cham.id,
        horario_registro: horarioFormated,
        qtd_faltantes: qtdFaltas
      };
    } else {
      return {
        ...t,
        total_alunos: totalAlunos,
        realizada: false,
        qtd_faltantes: 0
      };
    }
  });

  return { data: result, isMock: true };
}

/**
 * 1b. Fetch ALL turmas da escola (sem filtro de terminal/multi-seleção).
 * Usado pelo TurmasTerminalModal para mostrar todas as turmas disponíveis.
 */
export async function fetchTodasTurmasEscola(): Promise<Turma[]> {
  const client = getSupabaseClient();
  const escolaId = getEscolaId();

  if (client) {
    try {
      const { data: turmasDb, error: errT } = await client
        .from('turmas')
        .select('*')
        .eq('escola_id', escolaId);
      if (errT) throw errT;
      let turmasVisiveis: Turma[];
      const temCampoSegmento = (turmasDb || []).some((t: Turma) => 'segmento' in t);
      const segmento = getSegmento();
      if (segmento && temCampoSegmento) {
        turmasVisiveis = (turmasDb || []).filter((t: Turma) => t.segmento === segmento);
      } else {
        turmasVisiveis = (turmasDb || []).filter((t: Turma) => t.mostrar_no_painel !== false);
      }
      return turmasVisiveis;
    } catch (err) {
      console.warn('Erro ao buscar todas as turmas da escola:', err);
    }
  }

  // Fallback local
  const { turmas } = getLocalData();
  return turmas.filter(t => t.mostrar_no_painel !== false);
}

/**
 * 2. Fetch Alunos of a Turma and their absence status for target date
 * Usa a tabela alunos existente (JustificaE) — sem coluna "ativo", mostra todos.
 */
export async function fetchAlunosDaTurma(turmaId: string, dataChamadaDateStr?: string): Promise<{ alunos: AlunoComFalta[]; jaRealizada: boolean; chamadaId?: string }> {
  const targetDate = dataChamadaDateStr || getLocalDateStr();
  const client = getSupabaseClient();
  const escolaId = getEscolaId();

  if (client) {
    try {
      // 1. Fetch alunos da turma (tabela existente)
      const { data: alunosDb, error: errA } = await client
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('escola_id', escolaId)
        .order('nome', { ascending: true });
      if (errA) throw errA;

      if (alunosDb && alunosDb.length > 0) {
        // 2. Fetch chamada rufus de hoje se existir
        const { data: chamadasDb } = await client
          .from('rufus_chamadas')
          .select('*')
          .eq('turma_id', turmaId)
          .eq('data_chamada', targetDate)
          .limit(1);

        const cham = chamadasDb?.[0];
        let faltasSet = new Set<string>();

        if (cham) {
          const { data: faltasDb } = await client
            .from('rufus_chamada_faltas')
            .select('aluno_id')
            .eq('chamada_id', cham.id);

          (faltasDb || []).forEach(f => faltasSet.add(f.aluno_id));
        }

        const alunosComFalta: AlunoComFalta[] = alunosDb.map((a: Aluno) => ({
          id: a.id,
          turma_id: a.turma_id,
          nome: a.nome,
          matricula: a.matricula,
          ativo: true,
          faltante: faltasSet.has(a.id)
        }));

        return {
          alunos: alunosComFalta,
          jaRealizada: !!cham,
          chamadaId: cham?.id
        };
      }

      // Banco ok, mas turma sem alunos
      return { alunos: [], jaRealizada: false };
    } catch (err) {
      if (REQUIRE_DATABASE) throw databaseError((err as Error).message);
      console.warn('Erro ao carregar alunos do Supabase, usando fallback local:', err);
    }
  } else if (REQUIRE_DATABASE) {
    throw databaseError();
  }

  // --- LOCAL FALLBACK (apenas fora de produção) ---
  const { alunos, chamadas, faltas } = getLocalData();
  const turmaAlunos = alunos
    .filter(a => a.turma_id === turmaId && a.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const cham = chamadas.find(c => c.turma_id === turmaId && c.data_chamada === targetDate);
  const faltasSet = new Set<string>();

  if (cham) {
    faltas.filter(f => f.chamada_id === cham.id).forEach(f => faltasSet.add(f.aluno_id));
  }

  const alunosComFalta: AlunoComFalta[] = turmaAlunos.map(a => ({
    ...a,
    faltante: faltasSet.has(a.id)
  }));

  return {
    alunos: alunosComFalta,
    jaRealizada: !!cham,
    chamadaId: cham?.id
  };
}

/**
 * 3. Save or Update Chamada and Faltas in Supabase (rufus_* tables, with UPSERT and clearance of previous faltas)
 */
export async function salvarOuAtualizarChamada(
  turmaId: string,
  dataChamada: string,
  alunosFaltantesIds: string[]
): Promise<{ success: boolean; isMock: boolean; message: string }> {
  const client = getSupabaseClient();
  const escolaId = getEscolaId();
  const criadoEm = new Date().toISOString();

  if (client) {
    try {
      // Step A: UPSERT in rufus_chamadas table (unique constraint on turma_id, data_chamada)
      const { data: chamData, error: chamErr } = await client
        .from('rufus_chamadas')
        .upsert(
          { escola_id: escolaId, turma_id: turmaId, data_chamada: dataChamada, criado_em: criadoEm },
          { onConflict: 'turma_id,data_chamada' }
        )
        .select()
        .single();

      if (chamErr || !chamData) {
        console.error('Erro no UPSERT de rufus_chamadas:', chamErr);
        throw chamErr || new Error('Falha ao registrar chamada');
      }

      const chamadaId = chamData.id;

      // Step B: Delete existing records in rufus_chamada_faltas for this chamada_id
      const { error: delErr } = await client
        .from('rufus_chamada_faltas')
        .delete()
        .eq('chamada_id', chamadaId);

      if (delErr) {
        console.error('Erro ao limpar faltas anteriores:', delErr);
      }

      // Step C: Insert new absent student IDs if any
      if (alunosFaltantesIds.length > 0) {
        const payload = alunosFaltantesIds.map(alunoId => ({
          chamada_id: chamadaId,
          aluno_id: alunoId
        }));

        const { error: insErr } = await client.from('rufus_chamada_faltas').insert(payload);
        if (insErr) {
          console.error('Erro ao inserir novas faltas:', insErr);
          throw insErr;
        }
      }

      return {
        success: true,
        isMock: false,
        message: 'Chamada registrada com sucesso no Supabase!'
      };
    } catch (err: any) {
      if (REQUIRE_DATABASE) throw databaseError(err?.message);
      console.warn('Erro ao salvar no Supabase, caindo para fallback local:', err);
    }
  } else if (REQUIRE_DATABASE) {
    throw databaseError();
  }

  // --- LOCAL FALLBACK persistence (apenas fora de produção) ---
  const { chamadas, faltas } = getLocalData();
  let existingIndex = chamadas.findIndex(c => c.turma_id === turmaId && c.data_chamada === dataChamada);
  let chamadaId: string;

  if (existingIndex >= 0) {
    chamadas[existingIndex].criado_em = criadoEm;
    chamadaId = chamadas[existingIndex].id;
  } else {
    chamadaId = `chamada-${turmaId}-${Date.now()}`;
    chamadas.push({
      id: chamadaId,
      turma_id: turmaId,
      data_chamada: dataChamada,
      criado_em: criadoEm
    });
  }

  // Clear previous faltas for this chamada
  const newFaltas = faltas.filter(f => f.chamada_id !== chamadaId);

  // Append new faltas
  alunosFaltantesIds.forEach((alunoId, idx) => {
    newFaltas.push({
      id: `falta-${chamadaId}-${alunoId}-${idx}`,
      chamada_id: chamadaId,
      aluno_id: alunoId
    });
  });

  saveLocalData(chamadas, newFaltas);

  return {
    success: true,
    isMock: true,
    message: 'Chamada salva localmente com sucesso (Modo Standalone / Cache)!'
  };
}

/**
 * 4. Generate APOIA Program Report for missing students / absenteeism tracking
 * Lê as chamadas reais gravadas nas tabelas rufus_* (com fallback local).
 */
export async function fetchRelatorioApoia(): Promise<ApoiaAlert[]> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const escolaId = getEscolaId();
      const monthPrefix = getLocalDateStr().slice(0, 7);

      const [chamadasRes, alunosRes, turmasRes] = await Promise.all([
        client.from('rufus_chamadas').select('id, turma_id, data_chamada').eq('escola_id', escolaId),
        client.from('alunos').select('id, nome, turma_id').eq('escola_id', escolaId),
        client.from('turmas').select('id, nome').eq('escola_id', escolaId)
      ]);
      if (chamadasRes.error) throw chamadasRes.error;
      if (alunosRes.error) throw alunosRes.error;
      if (turmasRes.error) throw turmasRes.error;

      const chamadas = (chamadasRes.data || []).filter((c: { data_chamada: string }) =>
        c.data_chamada && c.data_chamada.slice(0, 7) === monthPrefix
      );
      const alunosDb = alunosRes.data || [];
      const turmasDb = turmasRes.data || [];

      const chamadaIds = chamadas.map((c: { id: string }) => c.id);
      let faltasDb: { aluno_id: string }[] = [];
      if (chamadaIds.length > 0) {
        const { data } = await client
          .from('rufus_chamada_faltas')
          .select('aluno_id')
          .in('chamada_id', chamadaIds);
        faltasDb = data || [];
      }

      const faltasPerAluno: Record<string, number> = {};
      faltasDb.forEach(f => {
        faltasPerAluno[f.aluno_id] = (faltasPerAluno[f.aluno_id] || 0) + 1;
      });

      const alerts: ApoiaAlert[] = [];
      alunosDb.forEach((a: { id: string; nome: string; turma_id: string }) => {
        const totalFaltas = faltasPerAluno[a.id] || 0;
        if (totalFaltas > 0) {
          const turma = turmasDb.find((t: { id: string }) => t.id === a.turma_id);
          alerts.push({
            aluno_id: a.id,
            aluno_nome: a.nome,
            turma_nome: turma ? turma.nome : 'Turma',
            total_faltas_mes: totalFaltas,
            faltas_consecutivas: totalFaltas > 1 ? totalFaltas : 1,
            status: totalFaltas >= 2 ? 'ALERTA_APOIA' : 'MONITORAMENTO'
          });
        }
      });

      return alerts.sort((x, y) => y.total_faltas_mes - x.total_faltas_mes);
    } catch (err) {
      if (REQUIRE_DATABASE) throw databaseError((err as Error).message);
      console.warn('Erro ao gerar relatório APOIA no Supabase, usando fallback local:', err);
    }
  } else if (REQUIRE_DATABASE) {
    throw databaseError();
  }

  const { alunos, turmas, chamadas, faltas } = getLocalData();

  // Count total faltas per student across all chamadas
  const faltasPerAluno: Record<string, number> = {};
  faltas.forEach(f => {
    faltasPerAluno[f.aluno_id] = (faltasPerAluno[f.aluno_id] || 0) + 1;
  });

  const alerts: ApoiaAlert[] = [];

  alunos.forEach(a => {
    const totalFaltas = faltasPerAluno[a.id] || 0;
    const turma = turmas.find(t => t.id === a.turma_id);
    const turmaNome = turma ? turma.nome : 'Turma';

    if (totalFaltas > 0) {
      alerts.push({
        aluno_id: a.id,
        aluno_nome: a.nome,
        turma_nome: turmaNome,
        total_faltas_mes: totalFaltas,
        faltas_consecutivas: totalFaltas > 1 ? totalFaltas : 1,
        status: totalFaltas >= 2 ? 'ALERTA_APOIA' : 'MONITORAMENTO'
      });
    }
  });

  return alerts.sort((a, b) => b.total_faltas_mes - a.total_faltas_mes);
}
