import React, { useState, useMemo, useEffect } from 'react';
import { Turma } from '../types';
import { getTurmasTerminal, saveTurmasTerminal, fetchTodasTurmasEscola } from '../lib/supabaseClient';
import { LayoutGrid, X, Save, CheckSquare, Square, DoorOpen } from 'lucide-react';

interface TurmasTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const TurmasTerminalModal: React.FC<TurmasTerminalModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [todasTurmas, setTodasTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const saved = getTurmasTerminal();
    return new Set(saved);
  });

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchTodasTurmasEscola().then(turmas => {
      setTodasTurmas(turmas);
      setLoading(false);
    });
  }, [isOpen]);

  const todasMarcadas = useMemo(() => {
    if (todasTurmas.length === 0) return false;
    return todasTurmas.every(t => selectedIds.has(t.id));
  }, [todasTurmas, selectedIds]);

  if (!isOpen) return null;

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(todasTurmas.map(t => t.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSave = () => {
    saveTurmasTerminal(Array.from(selectedIds));
    onSaved();
    onClose();
  };

  const turmasPorSala = useMemo(() => {
    const grouped: Record<string, Turma[]> = {};
    for (const t of todasTurmas) {
      const sala = t.sala || 'Sem sala definida';
      if (!grouped[sala]) grouped[sala] = [];
      grouped[sala].push(t);
    }
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Sem sala definida') return 1;
      if (b === 'Sem sala definida') return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map(sala => ({ sala, turmas: grouped[sala] }));
  }, [todasTurmas]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Turmas deste terminal</h3>
              <p className="text-xs text-slate-400">
                {selectedIds.size > 0
                  ? `${selectedIds.size} turma${selectedIds.size > 1 ? 's' : ''} selecionada${selectedIds.size > 1 ? 's' : ''}`
                  : 'Todas as turmas serão exibidas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              disabled={todasMarcadas || loading}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 inline mr-1" />
              Selecionar todas
            </button>
            <button
              onClick={clearAll}
              disabled={selectedIds.size === 0 || loading}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 inline mr-1" />
              Limpar seleção
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Nenhuma turma marcada = todas as turmas da escola aparecem no terminal
          </p>

          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm font-medium">
              Carregando turmas...
            </div>
          ) : todasTurmas.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm font-medium">
              Nenhuma turma encontrada para esta escola.
            </div>
          ) : (
            <div className="space-y-3">
              {turmasPorSala.map(({ sala, turmas: turmasDaSala }) => (
                <div key={sala}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {sala}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {turmasDaSala.map(t => {
                      const isSelected = selectedIds.has(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggle(t.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                              {t.nome}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {t.periodo && `${t.periodo}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 shrink-0">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            SALVAR
          </button>
        </div>
      </div>
    </div>
  );
};
