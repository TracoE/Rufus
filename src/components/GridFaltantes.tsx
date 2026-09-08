import React, { useState, useEffect } from 'react';
import { AlunoComFalta, TurmaComChamada } from '../types';
import { ArrowLeft, Check, CheckCircle2, ShieldAlert, Calendar, AlertCircle, CheckCheck } from 'lucide-react';

interface GridFaltantesProps {
  turma: TurmaComChamada;
  alunosInitial: AlunoComFalta[];
  dataAtualFormatada: string;
  onBackToDashboard: () => void;
  onOpenConfirmModal: (faltantes: AlunoComFalta[], totalAlunos: number) => void;
  onMarcarTodosPresentes: () => void;
  isEdicao: boolean;
}

/**
 * Re-index alphabetical array so the CSS grid (grid-cols-5) displays names in
 * natural reading order: top-to-bottom, LEFT-to-RIGHT (alphabetical row by row).
 */
function organizeStudentsVertical5Columns(alunosList: AlunoComFalta[]): { item: AlunoComFalta; colIndex: number }[] {
  const N = alunosList.length;
  if (N === 0) return [];

  const numCols = 5;
  const numRows = Math.ceil(N / numCols);

  // Create empty 2D matrix [rows][cols]
  const matrix: (AlunoComFalta | null)[][] = Array.from({ length: numRows }, () => Array(numCols).fill(null));

  let studentIndex = 0;

  // Fill row by row (natural alphabetical reading order)
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      if (studentIndex < N) {
        matrix[row][col] = alunosList[studentIndex];
        studentIndex++;
      }
    }
  }

  // Flatten row by row for grid-cols-5 rendering
  const result: { item: AlunoComFalta; colIndex: number }[] = [];
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const student = matrix[row][col];
      if (student) {
        result.push({ item: student, colIndex: col });
      }
    }
  }

  return result;
}

function sortAlfabetica(alunos: AlunoComFalta[]): AlunoComFalta[] {
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  return [...alunos].sort((a, b) => collator.compare(a.nome, b.nome));
}

export const GridFaltantes: React.FC<GridFaltantesProps> = ({
  turma,
  alunosInitial,
  dataAtualFormatada,
  onBackToDashboard,
  onOpenConfirmModal,
  onMarcarTodosPresentes,
  isEdicao
}) => {
  const [alunosState, setAlunosState] = useState<AlunoComFalta[]>(sortAlfabetica(alunosInitial));

  // Sync state if initial changes
  useEffect(() => {
    setAlunosState(sortAlfabetica(alunosInitial));
  }, [alunosInitial]);

  // Toggle absence state for student
  const handleToggleFalta = (studentId: string) => {
    setAlunosState(prev =>
      prev.map(a => (a.id === studentId ? { ...a, faltante: !a.faltante } : a))
    );
  };

  const faltantes = alunosState.filter(a => a.faltante);
  const totalAlunos = alunosState.length;
  const faltantesCount = faltantes.length;

  // Detecta se há alterações não salvas em relação ao estado inicial (para
  // exibir "Salvar" também quando o professor DESMARCAR uma falta, ex. aluno
  // que chegou atrasado — aí não há faltantes marcados, mas há mudança a gravar).
  const initialFaltantePorId = new Map<string, boolean>();
  sortAlfabetica(alunosInitial).forEach(a => initialFaltantePorId.set(a.id, a.faltante));
  const temAlteracoes = alunosState.some(a => a.faltante !== initialFaltantePorId.get(a.id));

  // Organize vertical list into 5 columns layout (cabe até 40 alunos: 5 × 8)
  const verticalGridData = organizeStudentsVertical5Columns(alunosState);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 flex flex-col justify-between font-sans select-none">
      {/* 1. Header Fixo superior */}
      <header className="fixed top-0 left-0 w-full z-30 h-[76px] px-6 md:px-10 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        {/* Left: Voltar ao Dashboard + Nome da Turma */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-300 transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
            <span>Voltar ao Dashboard</span>
          </button>

          <div className="h-8 w-[1px] bg-slate-300 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {turma.sala || 'SALA 102'} {turma.ano_letivo ? `• Ano Letivo ${turma.ano_letivo}` : ''}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isEdicao ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {isEdicao ? '🟢 Chamada Já Realizada (Modo Edição)' : '🔴 Lançamento Pendente'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              TURMA {turma.nome.toUpperCase()}
            </h1>
          </div>
        </div>

        {/* Right: Date */}
        <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="capitalize">{dataAtualFormatada}</span>
        </div>
      </header>

      {/* 2. Corpo da Tela: GRID FIXO DE EXACTAMENTE 4 COLUNAS VERTICAIS */}
      <main className="pt-[90px] pb-[96px] md:pb-[104px] px-4 md:px-6 flex-1 flex flex-col justify-center overflow-hidden">
        {alunosState.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-semibold">
            Nenhum aluno cadastrado nesta turma.
          </div>
        ) : (
          <div className="w-full h-full max-h-[calc(100vh-200px)] flex flex-col justify-center">
            {/* Grid Container with exactly 5 columns */}
            <div className="grid grid-cols-5 gap-1.5 items-stretch">
              {verticalGridData.map(({ item }) => {
                const isFaltante = item.faltante;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleFalta(item.id)}
                    className={`rounded border-2 px-2 py-1 flex items-center cursor-pointer transition-all duration-100 select-none active:scale-[0.98] ${
                      isFaltante
                        ? 'bg-[#FEE2E2] border-[#EF4444]'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                    title={item.nome}
                  >
                    {/* Nome do Aluno em linha única — Arial 16px */}
                    <span
                      className="truncate leading-tight"
                      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 16, fontWeight: isFaltante ? 700 : 500, color: isFaltante ? '#7f1d1d' : '#0f172a' }}
                    >
                      {item.nome}
                    </span>
                    {isFaltante && (
                      <Check className="w-3.5 h-3.5 text-red-600 ml-1 shrink-0 stroke-[3]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Bar Fixa (~88px) */}
      <footer className="fixed bottom-0 left-0 w-full z-40 min-h-[72px] md:h-[88px] px-3 md:px-10 bg-slate-900 text-white border-t border-slate-800 flex items-center justify-between gap-2 shadow-2xl">
        {/* Left: Dynamic Real-time Counter */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-base md:text-lg ${
            faltantesCount > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
          }`}>
            {faltantesCount}
          </div>
          <div className="min-w-0">
            <div className="text-sm md:text-xl font-black text-white tracking-tight truncate">
              Faltantes: <span className={faltantesCount > 0 ? 'text-red-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>{faltantesCount}</span> / {totalAlunos}
            </div>
            <div className="text-[10px] md:text-xs text-slate-400 flex items-center gap-2 mt-0.5 truncate">
              <span className="hidden sm:inline">Terminal de Quiosque — Programa APOIA</span>
              <span className="text-emerald-400 font-semibold">
                {totalAlunos > 0 ? `${(((totalAlunos - faltantesCount) / totalAlunos) * 100).toFixed(0)}% Presença` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Retornar/Cancelar + Sem Faltas + Salvar */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-4 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-extrabold text-sm md:text-lg transition-all cursor-pointer border border-slate-600 whitespace-nowrap"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            <span>{temAlteracoes ? '[ Cancelar ]' : '[ Retornar ]'}</span>
          </button>

          <button
            onClick={async () => { if (faltantesCount > 0) return; await onMarcarTodosPresentes(); onBackToDashboard(); }}
            disabled={faltantesCount > 0}
            title={faltantesCount > 0 ? "Desmarque os faltantes para usar o Sem Faltas" : "Marca a turma com 100% de presença (zero faltas)"}
            className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-4 rounded-xl font-extrabold text-sm md:text-lg transition-all border-2 whitespace-nowrap ${
              faltantesCount > 0
                ? 'bg-slate-800/50 text-slate-500 border-slate-700/50 opacity-40 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border-emerald-500/50 cursor-pointer'
            }`}
          >
            <CheckCheck className="w-5 h-5 md:w-6 md:h-6" />
            <span>[ Sem Faltas ]</span>
          </button>

          {temAlteracoes && (
            <button
              onClick={() => onOpenConfirmModal(faltantes, totalAlunos)}
              className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2.5 md:py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-sm md:text-lg transition-all cursor-pointer shadow-lg whitespace-nowrap"
            >
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
              <span>[ Salvar ]</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
