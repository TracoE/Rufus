import React, { useState } from 'react';
import { AlunoComFalta, TurmaComChamada } from '../types';
import { AlertTriangle, CheckCircle2, X, UserX, Loader2 } from 'lucide-react';

interface ModalConfirmacaoProps {
  isOpen: boolean;
  turma: TurmaComChamada;
  faltantes: AlunoComFalta[];
  totalAlunos: number;
  dataAtualFormatada: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isEdicao: boolean;
}

export const ModalConfirmacao: React.FC<ModalConfirmacaoProps> = ({
  isOpen,
  turma,
  faltantes,
  totalAlunos,
  dataAtualFormatada,
  onClose,
  onConfirm,
  isEdicao
}) => {
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  };

  const totalFaltantes = faltantes.length;
  const totalPresentes = totalAlunos - totalFaltantes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">
                {isEdicao ? 'Confirmar Atualização de Chamada' : 'Confirmar Lançamento de Chamada'}
              </h3>
              <p className="text-xs text-slate-400">
                Turma {turma.nome} • {dataAtualFormatada}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Banner */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-600">Alunos Faltantes</span>
                <div className="text-3xl font-black text-red-700 mt-0.5">{totalFaltantes}</div>
              </div>
              <UserX className="w-8 h-8 text-red-400" />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Alunos Presentes</span>
                <div className="text-3xl font-black text-emerald-700 mt-0.5">{totalPresentes}</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          {/* Nominal List of Faltantes */}
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Relação Nominal dos Alunos Faltantes ({totalFaltantes}):</span>
              {totalFaltantes > 0 && (
                <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                  Encaminhado para o APOIA
                </span>
              )}
            </h4>

            {totalFaltantes === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="font-extrabold text-emerald-900 text-lg">
                  🟢 PRESENÇA TOTAL (100%)
                </p>
                <p className="text-emerald-700 text-sm mt-1">
                  Nenhum aluno faltante foi marcado nesta turma. Todos os {totalAlunos} alunos receberão presença.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-60 overflow-y-auto space-y-2">
                {faltantes.map((aluno, index) => (
                  <div
                    key={aluno.id}
                    className="bg-white p-3 rounded-xl border border-red-200 flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 font-extrabold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-bold text-slate-900 text-base">{aluno.nome}</span>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                      FALTANTE
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 font-medium leading-relaxed">
              Ao confirmar, a chamada será gravada na tabela <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">rufus_chamadas</code> do Supabase e a tabela de faltas será sincronizada para o acompanhamento pedagógico do programa APOIA.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-3 rounded-xl bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-sm transition-all cursor-pointer"
          >
            [ CANCELAR / REVISAR ]
          </button>

          <button
            onClick={handleConfirmClick}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm md:text-base flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>GRAVANDO NO SUPABASE...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>[ CONFIRMAR E SALVAR CHAMADA ]</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
