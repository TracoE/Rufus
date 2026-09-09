import { getSupabaseClient, getEscolaId, getLocalDateStr, fetchEscolaNome } from './supabaseClient';
import { Aluno } from '../types';

export { getEscolaId, getLocalDateStr, fetchEscolaNome };

// ---------------------------------------------------------------------------
// Tipos da camada administrativa
// ---------------------------------------------------------------------------

export type TipoContato = 'Ligacao' | 'WhatsApp' | 'Reuniao Presencial' | 'Carta Registrada' | 'Visita Domiciliar';
export type StatusBuscaAtiva = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'SEM_SUCESSO' | 'RESOLVIDO';
export type StatusKanban = 'JUSTIFICADAS' | 'EM_ATENCAO' | 'EM_BUSCA_ATIVA' | 'PRONTO_PARA_APOIA' | 'RESOLVIDO';

export const TIPOS_CONTATO: TipoContato[] = ['Ligacao', 'WhatsApp', 'Reuniao Presencial', 'Carta Registrada', 'Visita Domiciliar'];
export const STATUS_BUSCA_ATIVA: StatusBuscaAtiva[] = ['EM_ANDAMENTO', 'CONCLUIDO', 'SEM_SUCESSO', 'RESOLVIDO'];

export interface RegistroBuscaAtiva {
  id: string;
  aluno_id: string;
  escola_id: string;
  tipo_contato: TipoContato;
  data_contato: string; // YYYY-MM-DD
  responsavel_contatado?: string;
  observacoes?: string;
  anexo_url?: string;
  status: StatusBuscaAtiva;
  criado_por?: string;
  criado_em: string;
}

export interface FaltaAluno {
  data: string; // YYYY-MM-DD
  chamada_id: string;
  turma_id: string;
  turma_nome: string;
  justificado: boolean;
}

export interface DadosKanbanAluno {
  aluno: Aluno;
  turma_nome: string;
  total_faltas_mes: number;
  faltas_justificadas: number;
  faltas_injustificadas: number;
  faltas: FaltaAluno[];
  registros: RegistroBuscaAtiva[];
  status: StatusKanban;
}

export interface ConfigRufus {
  limite_faltas_atencao: number;
  limite_faltas_apoia: number;
  limite_tentativas_apoia: number;
}

export interface DadosDossie {
  aluno: Aluno;
  turma_nome: string;
  faltas: FaltaAluno[];
  registros: RegistroBuscaAtiva[];
}

export interface SessaoAdmin {
  email: string;
  nome: string;
  escola_id?: string;
  is_super?: boolean;
}

// ---------------------------------------------------------------------------
// Sessão administrativa — login com conta Google (Supabase Auth compartilhado
// com o JustificaE). A escola de atuação é resolvida pelas tabelas do
// JustificaE: professores (email/email_google) ou escolas.email_admin.
// RUFUS não possui senha própria nem criação de escola.
// ---------------------------------------------------------------------------

const ADMIN_SESSION_KEY = 'rufus_admin_session_v2';

function limparSessaoStorage() {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (e) {
    console.warn('Erro ao limpar sessão admin', e);
  }
}

export function getAdminSession(): SessaoAdmin | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Erro ao ler sessão admin', e);
  }
  return null;
}

// Escola de atuação do administrador: vem da sessão do login.
// Fallback para a escola do dispositivo (getEscolaId) em instalações antigas.
export function getAdminEscolaId(): string {
  const sessao = getAdminSession();
  if (sessao?.escola_id) return sessao.escola_id;
  return getEscolaId();
}

// Define/seleciona a escola de atuação do superusuário na sessão.
export function setAdminEscolaId(escolaId: string) {
  const sessao = getAdminSession();
  if (!sessao) return;
  sessao.escola_id = escolaId;
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessao));
  } catch (e) {
    console.warn('Erro ao salvar escola na sessão', e);
  }
}

// Lista escolas cadastradas (para o seletor do superusuário).
export async function fetchEscolas(): Promise<{ id: string; nome: string }[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('escolas').select('id, nome').order('nome');
    if (error) return [];
    return (data || []) as { id: string; nome: string }[];
  } catch (e) {
    console.warn('Falha ao listar escolas', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Códigos de instalação dos terminais (por escola; gerados pelo super).
// O terminal não lista escolas: no 1º uso pede somente o código, que é
// resolvido pelo RPC validar (retorna a escola exata, sem enumeração).
// ---------------------------------------------------------------------------

export interface CodigoEscola {
  codigo: string;
  escola_id: string;
  criado_em: string;
  criado_por?: string;
}

// Lista os códigos visíveis para o admin/super logado.
export async function fetchCodigos(): Promise<CodigoEscola[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('rufus_codigos_acesso')
      .select('codigo, escola_id, criado_em, criado_por')
      .order('criado_em', { ascending: false });
    if (error) return [];
    return (data || []) as CodigoEscola[];
  } catch (e) {
    console.warn('Falha ao listar códigos de terminal', e);
    return [];
  }
}

// Gera (ou reusa) um código único para a escola (apenas superusuário).
export async function gerarCodigoEscola(escolaId: string): Promise<CodigoEscola | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc('rufus_gerar_codigo_escola', { p_escola_id: escolaId });
    if (error) {
      console.warn('Erro ao gerar código:', error.message);
      return null;
    }
    const codigo = typeof data === 'string' ? data : null;
    if (!codigo) return null;
    return {
      codigo,
      escola_id: escolaId,
      criado_em: new Date().toISOString(),
      criado_por: getAdminSession()?.email
    };
  } catch (e) {
    console.warn('Falha ao gerar código:', e);
    return null;
  }
}

// Exclui um código (somente admin/super logado).
export async function excluirCodigoEscola(codigo: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('rufus_codigos_acesso').delete().eq('codigo', codigo);
    if (error) {
      console.warn('Erro ao excluir código:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Falha ao excluir código:', e);
    return false;
  }
}

// Resolve o código digitado no instalador do terminal → escola exata (sem login).
export async function buscarEscolaPorCodigo(codigo: string): Promise<{ escola_id: string; nome: string } | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.rpc('rufus_validar_codigo_escola', { p_codigo: codigo });
    if (error) {
      console.warn('Erro ao validar código:', error.message);
      return null;
    }
    const row = (data as { escola_id: string; nome: string }[])?.[0];
    return row ? { escola_id: row.escola_id, nome: row.nome } : null;
  } catch (e) {
    console.warn('Falha ao validar código:', e);
    return null;
  }
}

// Inicia o login com o Google (mesma autenticação do JustificaE).
export async function loginGoogle(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado. Verifique as credenciais.');

  const currentUrl = window.location.origin + window.location.pathname;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: currentUrl,
      queryParams: { access_type: 'offline', prompt: 'select_account' }
    }
  });
  if (error) throw new Error(`Erro ao iniciar login Google: ${error.message}`);
}

// Mapeia o e-mail autenticado (conta Google) para o acesso administrativo.
// Regras:
//   1. Superusuário (email master OU professor com is_superadmin): acessa o painel
//      com o seletor de escolas (escola_id fica vazio).
//   2. Administrador de escola: apenas o email cadastrado em escolas.email_admin
//      (a mesma conta criada pelo superusuário no JustificaE).
// Nenhum outro professor do JustificaE tem acesso ao painel RUFUS.
async function montarSessao(client: any, email: string): Promise<SessaoAdmin | null> {
  const ehMaster = email === 'traco.e.sc@gmail.com';

  // Verifica se é superusuário (master ou professor is_superadmin)
  let isSuper = ehMaster;
  if (!isSuper) {
    try {
      const { data: profs } = await client
        .from('professores')
        .select('is_superadmin')
        .or(`email.ilike.${email},email_google.ilike.${email}`)
        .eq('ativo', true)
        .limit(1);
      isSuper = !!profs?.[0]?.is_superadmin;
    } catch (e) {
      // tabela sem email_google — trata como não-super
      try {
        const { data: profs } = await client
          .from('professores')
          .select('is_superadmin')
          .ilike('email', email)
          .eq('ativo', true)
          .limit(1);
        isSuper = !!profs?.[0]?.is_superadmin;
      } catch (e2) {
        console.warn('Falha na checagem de superusuário', e2);
      }
    }
  }

  if (isSuper) {
    const sessao: SessaoAdmin = {
      email,
      nome: email.split('@')[0],
      is_super: true
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessao));
    return sessao;
  }

  // Administrador de escola: somente escolas.email_admin
  const { data: escs } = await client
    .from('escolas')
    .select('id, nome')
    .ilike('email_admin', email)
    .limit(1);
  if (escs?.[0]) {
    const sessao: SessaoAdmin = {
      email,
      nome: escs[0].nome || email.split('@')[0],
      escola_id: escs[0].id
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessao));
    return sessao;
  }

  return null;
}

// Restaura a sessão vinda do retorno do Google (e resolve a escola).
export async function obterSessaoAdmin(): Promise<SessaoAdmin | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user?.email) {
    limparSessaoStorage();
    return null;
  }
  const sessao = await montarSessao(client, user.email.toLowerCase());
  // Email autenticado mas sem permissão administrativa: limpa a sessão local
  // para não ficar preso em "entrando no painel" (fix de sessão antiga).
  if (!sessao) limparSessaoStorage();
  return sessao;
}

// Assina mudanças de autenticação (retorno do OAuth, signOut). Retorna unsub.
export function assinarMudancaAuth(cb: (sessao: SessaoAdmin | null) => void): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = client.auth.onAuthStateChange(async (event, session) => {
    if (session?.user?.email) {
      const sessao = await montarSessao(client, session.user.email.toLowerCase());
      if (sessao) {
        cb(sessao);
      } else {
        // Conta Google sem permissão administrativa: encerra a sessão no Google
        // e limpa o local para não travar na tela de entrada.
        limparSessaoStorage();
        try {
          await client.auth.signOut();
        } catch (e) {
          console.warn(e);
        }
        cb(null);
      }
    } else {
      limparSessaoStorage();
      cb(null);
    }
  });
  return () => data.subscription.unsubscribe();
}

export async function logoutAdmin() {
  limparSessaoStorage();
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Erro ao encerrar sessão Google', e);
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: fetch all rows from Supabase (handles 1000-row default limit)
// ---------------------------------------------------------------------------

const PAGE_SIZE = 1000;

async function fetchAll(
  client: any,
  table: string,
  columns: string,
  eq?: { column: string; value: string },
  opts?: { order?: { column: string; ascending?: boolean } }
): Promise<any[]> {
  const all: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = client.from(table).select(columns);
    if (eq) q = q.eq(eq.column, eq.value);
    if (opts?.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? false });
    q = q.range(from, from + PAGE_SIZE - 1);
    const { data, error } = await q;
    if (error) {
      console.warn(`fetchAll(${table}) error at offset ${from}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Configuração de gatilhos
// ---------------------------------------------------------------------------

export async function fetchConfig(): Promise<ConfigRufus> {
  const client = getSupabaseClient();
  const defaults: ConfigRufus = { limite_faltas_atencao: 3, limite_faltas_apoia: 5, limite_tentativas_apoia: 3 };
  if (!client) return defaults;

  const { data } = await client.from('rufus_config').select('chave, valor');
  const map: Record<string, string> = {};
  (data || []).forEach((c: { chave: string; valor: string }) => { map[c.chave] = c.valor; });

  return {
    limite_faltas_atencao: Number(map['limite_faltas_atencao']) || defaults.limite_faltas_atencao,
    limite_faltas_apoia: Number(map['limite_faltas_apoia']) || defaults.limite_faltas_apoia,
    limite_tentativas_apoia: Number(map['limite_tentativas_apoia']) || defaults.limite_tentativas_apoia
  };
}

// ---------------------------------------------------------------------------
// Dados do Kanban (faltas do mês + justificativas + busca ativa)
// ---------------------------------------------------------------------------

export interface DadosKanban {
  cards: DadosKanbanAluno[];
  config: ConfigRufus;
  turmas: { id: string; nome: string; mostrar_no_painel?: boolean; segmento?: string | null }[];
  periodo: { inicio: string; fim: string; todasFaltas: boolean };
}

// Janela padrão de encaminhamento: últimos 30 dias anteriores a hoje.
// Retorna { inicio, fim } em YYYY-MM-DD (comparável por string com data_chamada).
export function getJanelaUltimos30Dias(): { inicio: string; fim: string } {
  const fim = getLocalDateStr();
  const d = new Date(`${fim}T12:00:00`);
  d.setDate(d.getDate() - 30);
  const inicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { inicio, fim };
}

export interface OpcoesPeriodoFaltas {
  todasFaltas?: boolean;
}

// Busca as turmas da escola. Se a coluna `segmento` ainda não existir no banco
// (script administrativo desatualizado), repete a consulta sem ela para o painel
// continuar funcionando normalmente.
async function fetchTurmasPainel(client: any, escolaId: string): Promise<{ data: any[]; error: any }> {
  const res = await client.from('turmas').select('id, nome, mostrar_no_painel, segmento').eq('escola_id', escolaId);
  if (res.error) {
    return client.from('turmas').select('id, nome, mostrar_no_painel').eq('escola_id', escolaId);
  }
  return res;
}

export async function fetchKanbanData(mes: string, opts?: OpcoesPeriodoFaltas): Promise<DadosKanban> {
  const client = getSupabaseClient();
  const escolaId = getAdminEscolaId();
  if (!client) throw new Error('Supabase não configurado.');

  const todasFaltas = opts?.todasFaltas === true;
  const janela = getJanelaUltimos30Dias();

  // Usamos fetchAll para superar o limite padrão de 1000 linhas do Supabase.
  const [turmasRes, alunos, chamadasAll, atestados, registros, config] = await Promise.all([
    fetchTurmasPainel(client, escolaId),
    fetchAll(client, 'alunos', '*', { column: 'escola_id', value: escolaId }),
    fetchAll(client, 'rufus_chamadas', '*', { column: 'escola_id', value: escolaId }),
    fetchAll(client, 'atestados', 'aluno_id, data_inicio, data_fim', { column: 'escola_id', value: escolaId }),
    fetchAll(client, 'busca_ativa_registros', '*', { column: 'escola_id', value: escolaId }, { order: { column: 'data_contato', ascending: false } }),
    fetchConfig()
  ]);

  const turmas = (turmasRes.data || []) as { id: string; nome: string; mostrar_no_painel?: boolean; segmento?: string | null }[];

  // Encaminhamento para os status (Em Atenção / Busca Ativa / Pronto p/ APOIA):
  // por padrão considera SOMENTE as faltas dos últimos 30 dias anteriores a hoje.
  // Se `todasFaltas` estiver marcado, considera todas as faltas (acumulativo
  // desde o início até o mês selecionado), independentemente do período.
  const chamadas = (chamadasAll as { id: string; turma_id: string; data_chamada: string }[])
    .filter(c => {
      if (!c.data_chamada) return false;
      if (todasFaltas) return c.data_chamada.slice(0, 7) <= mes;
      return c.data_chamada >= janela.inicio && c.data_chamada <= janela.fim;
    });

  const chamadaIds = chamadas.map(c => c.id);
  let faltasRaw: { chamada_id: string; aluno_id: string }[] = [];
  if (chamadaIds.length > 0) {
    // O .in() vai na URL: lotes de 1000 UUIDs (~40KB) estouram o limite e a
    // requisição falha em silêncio, sumindo com as faltas do lote (ex. agosto).
    // Lotes pequenos (150) + log de erro evitam alunos "fantasma" no kanban.
    const FALTAS_LOTE = 150;
    for (let i = 0; i < chamadaIds.length; i += FALTAS_LOTE) {
      const lote = chamadaIds.slice(i, i + FALTAS_LOTE);
      const { data, error } = await client.from('rufus_chamada_faltas').select('chamada_id, aluno_id').in('chamada_id', lote);
      if (error) {
        console.warn(`fetchKanbanData(faltas) erro no lote ${i / FALTAS_LOTE + 1}:`, error.message);
        continue;
      }
      if (data) faltasRaw = faltasRaw.concat(data as { chamada_id: string; aluno_id: string }[]);
    }
  }

  const chamadaPorId = new Map(chamadas.map(c => [c.id, c]));
  const turmaPorId = new Map(turmas.map(t => [t.id, t]));

  const atestadoCobre = (alunoId: string, dateStr: string): boolean => {
    const d = new Date(`${dateStr}T12:00:00`);
    return atestados.some(a =>
      a.aluno_id === alunoId &&
      new Date(`${a.data_inicio}T00:00:00`) <= d &&
      d <= new Date(`${a.data_fim}T23:59:59`)
    );
  };

  const faltasPorAluno = new Map<string, FaltaAluno[]>();
  faltasRaw.forEach(f => {
    const cham = chamadaPorId.get(f.chamada_id);
    if (!cham) return;
    const fa: FaltaAluno = {
      data: cham.data_chamada,
      chamada_id: f.chamada_id,
      turma_id: cham.turma_id,
      turma_nome: turmaPorId.get(cham.turma_id)?.nome || 'Turma',
      justificado: atestadoCobre(f.aluno_id, cham.data_chamada)
    };
    if (!faltasPorAluno.has(f.aluno_id)) faltasPorAluno.set(f.aluno_id, []);
    faltasPorAluno.get(f.aluno_id)!.push(fa);
  });

  const registrosPorAluno = new Map<string, RegistroBuscaAtiva[]>();
  registros.forEach(r => {
    if (!registrosPorAluno.has(r.aluno_id)) registrosPorAluno.set(r.aluno_id, []);
    registrosPorAluno.get(r.aluno_id)!.push(r);
  });

  const cards: DadosKanbanAluno[] = [];
  alunos.forEach((a: Aluno) => {
    const faltasAluno = (faltasPorAluno.get(a.id) || []).sort((x, y) => x.data.localeCompare(y.data));
    const registrosAluno = registrosPorAluno.get(a.id) || [];
    const injustificadas = faltasAluno.filter(f => !f.justificado).length;
    const justificadas = faltasAluno.filter(f => f.justificado).length;
    const status = computeStatusKanban(injustificadas, justificadas, registrosAluno, config);
    if (!status) return;

    cards.push({
      aluno: a,
      turma_nome: turmaPorId.get(a.turma_id)?.nome || 'Turma',
      total_faltas_mes: faltasAluno.length,
      faltas_justificadas: justificadas,
      faltas_injustificadas: injustificadas,
      faltas: faltasAluno,
      registros: registrosAluno,
      status
    });
  });

  return { cards, config, turmas, periodo: { inicio: janela.inicio, fim: janela.fim, todasFaltas } };
}

function computeStatusKanban(
  inj: number,
  just: number,
  registros: RegistroBuscaAtiva[],
  cfg: ConfigRufus
): StatusKanban | null {
  const temAndamento = registros.some(r => r.status === 'EM_ANDAMENTO');
  const semSucesso = registros.filter(r => r.status === 'SEM_SUCESSO').length;

  // ---- Faltas acima do gatilho têm prioridade sobre qualquer status anterior ----
  if (inj >= cfg.limite_faltas_apoia) {
    if (temAndamento && semSucesso < cfg.limite_tentativas_apoia) return 'EM_BUSCA_ATIVA';
    return 'PRONTO_PARA_APOIA';
  }

  if (temAndamento) return 'EM_BUSCA_ATIVA';

  if (inj >= cfg.limite_faltas_atencao) return 'EM_ATENCAO';

  // ---- Abaixo do gatilho: verificar registros anteriores ----
  if (registros.some(r => r.status === 'RESOLVIDO')) return 'RESOLVIDO';

  // Teve faltas (justificadas ou abaixo do gatilho) mas já houve intervenção → arquivado
  if ((inj > 0 || just > 0) && registros.length > 0) return 'RESOLVIDO';

  // Faltas registradas, porém todas justificadas por atestado → não contam para o APOIA,
  // mas ficam visíveis no painel (coluna "Justificadas / Atestado")
  if (just > 0 && inj === 0) return 'JUSTIFICADAS';

  return null;
}

// ---------------------------------------------------------------------------
// Dossiê do aluno
// ---------------------------------------------------------------------------

export async function fetchDossie(alunoId: string, mes: string, opts?: OpcoesPeriodoFaltas): Promise<DadosDossie> {
  const client = getSupabaseClient();
  const escolaId = getAdminEscolaId();
  if (!client) throw new Error('Supabase não configurado.');

  const todasFaltas = opts?.todasFaltas === true;
  const janela = getJanelaUltimos30Dias();

  const [alunoRes, turmasRes, chamadasAll, atestados, registrosRes] = await Promise.all([
    client.from('alunos').select('*').eq('id', alunoId).single(),
    client.from('turmas').select('id, nome').eq('escola_id', escolaId),
    fetchAll(client, 'rufus_chamadas', '*', { column: 'escola_id', value: escolaId }),
    fetchAll(client, 'atestados', 'aluno_id, data_inicio, data_fim', { column: 'escola_id', value: escolaId }),
    client.from('busca_ativa_registros').select('*').eq('aluno_id', alunoId).order('data_contato', { ascending: false })
  ]);

  if (alunoRes.error || !alunoRes.data) throw new Error('Aluno não encontrado.');

  const aluno = alunoRes.data as Aluno;
  const turmas = (turmasRes.data || []) as { id: string; nome: string }[];
  const turma = turmas.find(t => t.id === aluno.turma_id);
  const chamadas = (chamadasAll as { id: string; turma_id: string; data_chamada: string }[])
    .filter(c => {
      if (!c.data_chamada || c.turma_id !== aluno.turma_id) return false;
      if (todasFaltas) return c.data_chamada.slice(0, 7) <= mes;
      return c.data_chamada >= janela.inicio && c.data_chamada <= janela.fim;
    });

  const chamadaIds = chamadas.map(c => c.id);
  let faltasRaw: { chamada_id: string }[] = [];
  if (chamadaIds.length > 0) {
    const FALTAS_LOTE = 150;
    for (let i = 0; i < chamadaIds.length; i += FALTAS_LOTE) {
      const lote = chamadaIds.slice(i, i + FALTAS_LOTE);
      const { data, error } = await client.from('rufus_chamada_faltas').select('chamada_id').eq('aluno_id', alunoId).in('chamada_id', lote);
      if (error) {
        console.warn(`fetchDossie(faltas) erro no lote ${i / FALTAS_LOTE + 1}:`, error.message);
        continue;
      }
      faltasRaw = faltasRaw.concat(((data || []) as { chamada_id: string }[]));
    }
  }

  const faltasSet = new Set(faltasRaw.map(f => f.chamada_id));
  const faltas: FaltaAluno[] = chamadas
    .filter(c => faltasSet.has(c.id))
    .map(c => {
      const d = new Date(`${c.data_chamada}T12:00:00`);
      const justificado = atestados.some(a =>
        a.aluno_id === alunoId &&
        new Date(`${a.data_inicio}T00:00:00`) <= d &&
        d <= new Date(`${a.data_fim}T23:59:59`)
      );
      return {
        data: c.data_chamada,
        chamada_id: c.id,
        turma_id: c.turma_id,
        turma_nome: turma?.nome || 'Turma',
        justificado
      };
    })
    .sort((x, y) => x.data.localeCompare(y.data));

  return {
    aluno,
    turma_nome: turma?.nome || 'Turma',
    faltas,
    registros: (registrosRes.data || []) as RegistroBuscaAtiva[]
  };
}

// ---------------------------------------------------------------------------
// Registro de busca ativa + anexos (Storage)
// ---------------------------------------------------------------------------

export interface NovoRegistroBuscaAtiva {
  aluno_id: string;
  escola_id: string;
  tipo_contato: TipoContato;
  data_contato: string;
  responsavel_contatado?: string;
  observacoes?: string;
  anexo_url?: string;
  status: StatusBuscaAtiva;
  criado_por?: string;
}

export async function salvarRegistroBuscaAtiva(payload: NovoRegistroBuscaAtiva): Promise<RegistroBuscaAtiva> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const { data, error } = await client.from('busca_ativa_registros').insert(payload).select().single();
  if (error) throw new Error(`Erro ao salvar registro: ${error.message}`);
  return data as RegistroBuscaAtiva;
}

export async function excluirRegistroBuscaAtiva(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');
  const { error } = await client.from('busca_ativa_registros').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir registro: ${error.message}`);
}

export async function uploadAnexo(file: File, alunoId: string): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase não configurado.');

  const path = `${alunoId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const { error } = await client.storage.from('busca_ativa_anexos').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw new Error(`Erro no upload do anexo: ${error.message}`);

  const { data } = client.storage.from('busca_ativa_anexos').getPublicUrl(path);
  return data.publicUrl;
}
