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
}

// ---------------------------------------------------------------------------
// Sessão administrativa — login com conta Google (Supabase Auth compartilhado
// com o JustificaE). A escola de atuação é resolvida pelas tabelas do
// JustificaE: professores (email/email_google) ou escolas.email_admin.
// RUFUS não possui senha própria nem criação de escola.
// ---------------------------------------------------------------------------

const ADMIN_SESSION_KEY = 'rufus_admin_session_v2';

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

// Mapeia o e-mail autenticado para a escola cadastrada no JustificaE.
// 1ª tentativa: professor ativo (conta criada pelo master JustificaE).
// 2ª: admin de escola (escolas.email_admin).
async function mapearEscolaDoEmail(client: any, email: string): Promise<{ escola_id: string; nome: string } | null> {
  try {
    const { data: profs } = await client
      .from('professores')
      .select('escola_id')
      .or(`email.ilike.${email},email_google.ilike.${email}`)
      .eq('ativo', true)
      .limit(1);
    const prof = profs?.[0];
    if (prof?.escola_id) {
      const esc = await client.from('escolas').select('nome').eq('id', prof.escola_id).limit(1);
      return { escola_id: prof.escola_id, nome: esc.data?.[0]?.nome || '' };
    }
  } catch (e) {
    // tabela sem email_google — segue para o fallback
  }

  const { data: escs } = await client
    .from('escolas')
    .select('id, nome')
    .ilike('email_admin', email)
    .limit(1);
  if (escs?.[0]) return { escola_id: escs[0].id, nome: escs[0].nome };
  return null;
}

async function montarSessao(client: any, email: string): Promise<SessaoAdmin | null> {
  const mapa = await mapearEscolaDoEmail(client, email);
  const sessao: SessaoAdmin = {
    email,
    nome: email.split('@')[0],
    escola_id: mapa?.escola_id
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessao));
  return sessao;
}

// Restaura a sessão vinda do retorno do Google (e resolve a escola).
export async function obterSessaoAdmin(): Promise<SessaoAdmin | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  if (!user?.email) return null;
  return montarSessao(client, user.email.toLowerCase());
}

// Assina mudanças de autenticação (retorno do OAuth, signOut). Retorna unsub.
export function assinarMudancaAuth(cb: (sessao: SessaoAdmin | null) => void): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = client.auth.onAuthStateChange(async (event, session) => {
    if (session?.user?.email) {
      const sessao = await montarSessao(client, session.user.email.toLowerCase());
      cb(sessao);
    } else {
      try {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      } catch (e) {
        console.warn(e);
      }
      cb(null);
    }
  });
  return () => data.subscription.unsubscribe();
}

export async function logoutAdmin() {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (e) {
    console.warn(e);
  }
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

export async function fetchKanbanData(mes: string): Promise<DadosKanban> {
  const client = getSupabaseClient();
  const escolaId = getAdminEscolaId();
  if (!client) throw new Error('Supabase não configurado.');

  const [turmasRes, alunosRes, chamadasRes, atestadosRes, registrosRes, config] = await Promise.all([
    fetchTurmasPainel(client, escolaId),
    client.from('alunos').select('*').eq('escola_id', escolaId),
    client.from('rufus_chamadas').select('*').eq('escola_id', escolaId),
    client.from('atestados').select('aluno_id, data_inicio, data_fim').eq('escola_id', escolaId),
    client.from('busca_ativa_registros').select('*').eq('escola_id', escolaId).order('data_contato', { ascending: false }),
    fetchConfig()
  ]);

  const turmas = (turmasRes.data || []) as { id: string; nome: string; mostrar_no_painel?: boolean; segmento?: string | null }[];
  const alunos = (alunosRes.data || []) as Aluno[];
  // Acumulativo no ano letivo: considera todas as chamadas desde o início
  // (inclusive meses anteriores) até o mês selecionado. Assim a situação
  // do aluno persiste entre os meses até ser resolvida (encaminhada p/ APOIA).
  const chamadas = ((chamadasRes.data || []) as { id: string; turma_id: string; data_chamada: string }[])
    .filter(c => c.data_chamada && c.data_chamada.slice(0, 7) <= mes);
  const atestados = (atestadosRes.data || []) as { aluno_id: string; data_inicio: string; data_fim: string }[];
  const registros = (registrosRes.data || []) as RegistroBuscaAtiva[];

  const chamadaIds = chamadas.map(c => c.id);
  let faltasRaw: { chamada_id: string; aluno_id: string }[] = [];
  if (chamadaIds.length > 0) {
    const { data } = await client.from('rufus_chamada_faltas').select('chamada_id, aluno_id').in('chamada_id', chamadaIds);
    faltasRaw = (data || []) as { chamada_id: string; aluno_id: string }[];
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

  return { cards, config, turmas };
}

function computeStatusKanban(
  inj: number,
  just: number,
  registros: RegistroBuscaAtiva[],
  cfg: ConfigRufus
): StatusKanban | null {
  const temAndamento = registros.some(r => r.status === 'EM_ANDAMENTO');
  const semSucesso = registros.filter(r => r.status === 'SEM_SUCESSO').length;

  if (registros.some(r => r.status === 'RESOLVIDO')) return 'RESOLVIDO';

  if (inj >= cfg.limite_faltas_apoia) {
    if (temAndamento && semSucesso < cfg.limite_tentativas_apoia) return 'EM_BUSCA_ATIVA';
    return 'PRONTO_PARA_APOIA';
  }

  if (temAndamento) return 'EM_BUSCA_ATIVA';

  if (inj >= cfg.limite_faltas_atencao) return 'EM_ATENCAO';

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

export async function fetchDossie(alunoId: string, mes: string): Promise<DadosDossie> {
  const client = getSupabaseClient();
  const escolaId = getAdminEscolaId();
  if (!client) throw new Error('Supabase não configurado.');

  const [alunoRes, turmasRes, chamadasRes, atestadosRes, registrosRes] = await Promise.all([
    client.from('alunos').select('*').eq('id', alunoId).single(),
    client.from('turmas').select('id, nome').eq('escola_id', escolaId),
    client.from('rufus_chamadas').select('*').eq('escola_id', escolaId),
    client.from('atestados').select('aluno_id, data_inicio, data_fim').eq('escola_id', escolaId),
    client.from('busca_ativa_registros').select('*').eq('aluno_id', alunoId).order('data_contato', { ascending: false })
  ]);

  if (alunoRes.error || !alunoRes.data) throw new Error('Aluno não encontrado.');

  const aluno = alunoRes.data as Aluno;
  const turmas = (turmasRes.data || []) as { id: string; nome: string }[];
  const turma = turmas.find(t => t.id === aluno.turma_id);
  const chamadas = ((chamadasRes.data || []) as { id: string; turma_id: string; data_chamada: string }[])
    .filter(c => c.data_chamada && c.data_chamada.slice(0, 7) <= mes && c.turma_id === aluno.turma_id);
  const atestados = (atestadosRes.data || []) as { aluno_id: string; data_inicio: string; data_fim: string }[];

  const chamadaIds = chamadas.map(c => c.id);
  let faltasRaw: { chamada_id: string }[] = [];
  if (chamadaIds.length > 0) {
    const { data } = await client.from('rufus_chamada_faltas').select('chamada_id').eq('aluno_id', alunoId).in('chamada_id', chamadaIds);
    faltasRaw = (data || []) as { chamada_id: string }[];
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
