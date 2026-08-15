export interface Turma {
  id: string;
  nome: string;
  escola_id?: string;
  ano_letivo?: number;
  periodo?: 'Matutino' | 'Vespertino' | 'Noturno';
  sala?: string;
  horario_previsto?: string;
  mostrar_no_painel?: boolean;
  segmento?: string;
}

export interface Aluno {
  id: string;
  turma_id: string;
  nome: string;
  matricula?: string;
  ativo: boolean;
}

export interface Chamada {
  id: string;
  turma_id: string;
  data_chamada: string; // YYYY-MM-DD
  criado_em: string;    // ISO string
}

export interface ChamadaFalta {
  id: string;
  chamada_id: string;
  aluno_id: string;
}

// Tabelas exclusivas do RUFUS (prefixo rufus_) no projeto Supabase compartilhado
export interface RufusChamada {
  id: string;
  escola_id: string;
  turma_id: string;
  data_chamada: string; // YYYY-MM-DD
  criado_em: string;    // ISO string
}

export interface RufusChamadaFalta {
  id: string;
  chamada_id: string;
  aluno_id: string;
}

export interface TurmaComChamada extends Turma {
  total_alunos: number;
  realizada: boolean;
  chamada_id?: string;
  horario_registro?: string;
  qtd_faltantes: number;
}

export interface AlunoComFalta extends Aluno {
  faltante: boolean;
}

export interface SupabaseConfig {
  url: string;
  key: string;
  isConnected: boolean;
  isMock: boolean;
  /** Indica se as tabelas da camada administrativa (busca_ativa_registros etc.) existem */
  adminReady?: boolean;
}

export interface ApoiaAlert {
  aluno_id: string;
  aluno_nome: string;
  turma_nome: string;
  total_faltas_mes: number;
  faltas_consecutivas: number;
  status: 'ALERTA_APOIA' | 'MONITORAMENTO' | 'NORMAL';
}
