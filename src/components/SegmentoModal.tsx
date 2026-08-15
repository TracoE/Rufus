import React, { useState } from 'react';
import { getSegmento, saveStoredSegmento } from '../lib/supabaseClient';
import { Sparkles, X, Save, Info } from 'lucide-react';

interface SegmentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SegmentoModal: React.FC<SegmentoModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [segmento, setSegmento] = useState(getSegmento());

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredSegmento(segmento);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Segmento deste terminal</h3>
              <p className="text-xs text-slate-400">Quais turmas aparecem neste aparelho</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Segmento (F1, F2, M...)
            </label>
            <input
              type="text"
              value={segmento}
              onChange={e => setSegmento(e.target.value)}
              placeholder="F1, F2, M... (deixe vazio para todos)"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm font-semibold outline-none transition-all"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-[11px] text-slate-600">
            <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <p>
              Se preenchido, este terminal mostra apenas as turmas desta escola marcadas com esse
              segmento (ex.: <strong>F1</strong> mostra só as turmas do Fundamental 1). Vazio =
              mostra todas as turmas visíveis.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            SALVAR
          </button>
        </div>
      </div>
    </div>
  );
};