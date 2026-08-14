import { Turma, Aluno, Chamada, ChamadaFalta } from '../types';

export const INITIAL_TURMAS: Turma[] = [
  {
    id: 'turma-8a',
    nome: '8º Ano A',
    periodo: 'Matutino',
    sala: 'SALA 102',
    horario_previsto: '07:30 - 08:20'
  },
  {
    id: 'turma-7b',
    nome: '7º Ano B',
    periodo: 'Matutino',
    sala: 'SALA 102',
    horario_previsto: '08:20 - 09:10'
  },
  {
    id: 'turma-9a',
    nome: '9º Ano A',
    periodo: 'Matutino',
    sala: 'SALA 102',
    horario_previsto: '09:30 - 10:20'
  },
  {
    id: 'turma-9c',
    nome: '9º Ano C',
    periodo: 'Matutino',
    sala: 'SALA 102',
    horario_previsto: '10:20 - 11:10'
  },
  {
    id: 'turma-6a',
    nome: '6º Ano A',
    periodo: 'Vespertino',
    sala: 'SALA 102',
    horario_previsto: '13:00 - 13:50'
  },
  {
    id: 'turma-7a',
    nome: '7º Ano A',
    periodo: 'Vespertino',
    sala: 'SALA 102',
    horario_previsto: '13:50 - 14:40'
  }
];

// Generates ~35 realistic student names per class
const NAMES_8A = [
  "Adriana Lima", "Alice Vieira", "Bernardo Cruz", "Bruno Oliveira", "Camila Santos",
  "Clara Fernandes", "Daniel Ferreira", "Diego Ramos", "Eduardo Souza", "Erika Machado",
  "Felipe Batista", "Fernanda Costa", "Gabriel Pereira", "Giovanna Reis", "Helena Silva",
  "Henrique Paz", "Igor Rodrigues", "Isabela Moraes", "Julia Martins", "Kevin Albuquerque",
  "Larissa Gomes", "Marcos Rocha", "Natália Mendes", "Otávio Cardoso", "Patrícia Lima",
  "Quitéria Alves", "Ricardo Borges", "Sabrina Duarte", "Tiago Nunes", "Ursula Teixeira",
  "Vitor Hugo", "Wagner Freitas", "Xavier Filho", "Yara Amaral", "Zeca Pagodinho"
];

const NAMES_7B = [
  "Arthur Aguiar", "Beatriz Mendonça", "Caio Castro", "Debora Secco", "Enzo Gabriel",
  "Fabiana Karla", "Guilherme Fontes", "Heitor Martinez", "Inês Brasil", "João Pedro",
  "Kauan Silva", "Luana Piovani", "Mateus Solano", "Nayana Miranda", "Orlando Drummond",
  "Priscila Fantin", "Rafael Cardoso", "Sophia Valverde", "Thiago Lacerda", "Vinícius Jr",
  "Yasmin Brunet", "Alana Rocha", "Breno Lopes", "Catarina Furtado", "Davi Lucca",
  "Elisa Sanches", "Fernando Colunga", "Gisele Bündchen", "Hélio de la Peña", "Isadora Cruz",
  "Jair Oliveira", "Lívia Andrade", "Marcelo Adnet", "Nanda Costa", "Otávio Mesquita"
];

const NAMES_9A = [
  "Amanda Seyfried", "Bruna Marquezine", "Cauã Reymond", "Dira Paes", "Edson Celulari",
  "Flávia Alessandra", "Grazi Massafera", "Humberto Carrão", "Isis Valverde", "Juliana Paes",
  "Klébber Toledo", "Lilia Cabral", "Murilo Benício", "Nathalia Dill", "Osmar Prado",
  "Paolla Oliveira", "Rodrigo Santoro", "Sheron Menezzes", "Taís Araújo", "Umberto Magnani",
  "Vanessa Giácomo", "Wagner Moura", "Xuxa Meneghel", "Yanna Lavigne", "Zezé Polessa",
  "Alexandre Nero", "Bete Mendes", "Chay Suede", "Deborah Evelyn", "Euclydes Marinho",
  "Fábio Assunção", "Gloria Pires", "Herson Capri", "Ingrid Guimarães"
];

const NAMES_9C = [
  "Alanis Guillen", "Bella Campos", "Carmo Dalla Vecchia", "Dandara Mariana", "Emilio Dantas",
  "Fábio Porchat", "Giovanna Antonelli", "Heavy Baile", "Iza Lima", "Jesuíta Barbosa",
  "Karine Teles", "Lucy Alves", "Marcos Palmeira", "Nicolas Prattes", "Olívia Araújo",
  "Palo de Arara", "Rafa Kalimann", "Silvero Pereira", "Thales Bretas", "Ulisses Maia",
  "Vera Fischer", "Welligton Silva", "Xande de Pilares", "Yuri Alberto", "Zeca Camargo",
  "Aline Moraes", "Babu Santana", "Cássia Kis", "Dudu Azevedo", "Eliane Giardini",
  "Felipe Simas", "Gabriel Sater", "Heloísa Périssé", "Irandhir Santos", "José Loreto"
];

const NAMES_6A = [
  "Ágatha Moreira", "Bruno Gagliasso", "Camila Pitanga", "David Junior", "Erica Januza",
  "Felipe Titto", "Giovanna Lancellotti", "Igor Rickli", "Jeniffer Nascimento", "Klara Castanho",
  "Lázaro Ramos", "Mariana Ximenes", "Nego do Borel", "Otávio Muller", "Paloma Duarte",
  "Rainer Cadete", "Sabrina Sato", "Thiago Martins", "Ullisses Campbell", "Vitória Strada",
  "Wanda Chase", "Xande de Pilares", "Ygor Marçal", "Zezé Di Camargo", "Ana Hickmann",
  "Beto Jamaica", "Cris Vianna", "Daniel Rocha", "Emanuelle Araújo", "Fiuk Kart",
  "Gabi Martins", "Hugo Gloss", "Isabeli Fontana", "Jonathan Azevedo", "Kika Sato"
];

const NAMES_7A = [
  "Adriel Souza", "Bento Ribeiro", "Cecília Dassi", "Davi Campolongo", "Esther Marcos",
  "Filipe Bragança", "Giulia Garcia", "Henry Fiuka", "Isabella Koppel", "Jean Paulo",
  "Kaik Pereira", "Lorena Queiroz", "Matheus Ueta", "Nicholas Torres", "Olivia Torres",
  "Pedro Henrique", "Raissa Chaddad", "Sophia Valverde", "Thomaz Costa", "Vitor Figueiredo",
  "Xande Valois", "Ygor Marçal", "Zaira Ribeiro", "Alana Cabral", "Bernardo Simões",
  "Cauã Martins", "Duda Wendling", "Enzo Diniz", "Fernanda Concon", "Gabriel Miller",
  "Guel Vieira", "Heitor Gomes", "Isadora Ribeiro", "João Guilherme", "Kaikky Oliveira"
];

export function generateInitialAlunos(): Aluno[] {
  const map: Record<string, string[]> = {
    'turma-8a': NAMES_8A,
    'turma-7b': NAMES_7B,
    'turma-9a': NAMES_9A,
    'turma-9c': NAMES_9C,
    'turma-6a': NAMES_6A,
    'turma-7a': NAMES_7A,
  };

  const alunos: Aluno[] = [];

  Object.entries(map).forEach(([turma_id, names]) => {
    // Sort names alphabetically
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sorted.forEach((nome, idx) => {
      alunos.push({
        id: `aluno-${turma_id}-${idx + 1}`,
        turma_id,
        nome,
        ativo: true
      });
    });
  });

  return alunos;
}

export const INITIAL_ALUNOS = generateInitialAlunos();

// Generate initial mock completed chamadas for today to make preview rich immediately
export function generateInitialChamadasToday(): { chamadas: Chamada[]; faltas: ChamadaFalta[] } {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Let's create completed chamadas for Turma 8º Ano A, 7º Ano B, 9º Ano A today
  const chamadas: Chamada[] = [
    {
      id: 'chamada-8a-today',
      turma_id: 'turma-8a',
      data_chamada: todayStr,
      criado_em: `${todayStr}T07:45:00.000Z`
    },
    {
      id: 'chamada-7b-today',
      turma_id: 'turma-7b',
      data_chamada: todayStr,
      criado_em: `${todayStr}T08:32:00.000Z`
    },
    {
      id: 'chamada-9a-today',
      turma_id: 'turma-9a',
      data_chamada: todayStr,
      criado_em: `${todayStr}T09:15:00.000Z`
    }
  ];

  // Faltas for 8A (3 faltantes)
  const alunos8A = INITIAL_ALUNOS.filter(a => a.turma_id === 'turma-8a');
  const faltas: ChamadaFalta[] = [
    { id: 'f-1', chamada_id: 'chamada-8a-today', aluno_id: alunos8A[3]?.id || 'aluno-turma-8a-4' }, // Bruno Oliveira
    { id: 'f-2', chamada_id: 'chamada-8a-today', aluno_id: alunos8A[7]?.id || 'aluno-turma-8a-8' }, // Diego Ramos
    { id: 'f-3', chamada_id: 'chamada-8a-today', aluno_id: alunos8A[15]?.id || 'aluno-turma-8a-16' }, // Henrique Paz
  ];

  // 7B (0 faltantes - Presença Total)
  // 9A (1 faltante)
  const alunos9A = INITIAL_ALUNOS.filter(a => a.turma_id === 'turma-9a');
  faltas.push({
    id: 'f-4',
    chamada_id: 'chamada-9a-today',
    aluno_id: alunos9A[2]?.id || 'aluno-turma-9a-3'
  });

  return { chamadas, faltas };
}
