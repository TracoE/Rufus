import React, { useState } from 'react';
import { buscarEscolaPorCodigo } from '../lib/adminClient';
import { saveStoredEscolaId } from '../lib/supabaseClient';
import { School, X, Loader2, Check, Keyboard, AlertTriangle, HelpCircle } from 'lucide-react';

interface EscolaModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSaved: () => void;
  bloqueante?: boolean;
}

export const EscolaModal: React.FC<EscolaModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  bloqueante = false
}) => {
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [escolaEncontrada, setEscolaEncontrada] = useState<{ escola_id: string; nome: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const validar = async () => {
    setErro(null);
    setEscolaEncontrada(null);
    const codigoLimpo = codigo.trim().toUpperCase();
    if (!codigoLimpo) {
      setErro('Digite o código da escola.');
      return;
    }
    setValidando(true);
    try {
      const escola = await buscarEscolaPorCodigo(codigoLimpo);
      if (escola) {
        setEscolaEncontrada(escola);
      } else {
        setErro('Código inválido. Verifique com a direção/coordenação da escola.');
      }
    } finally {
      setValidando(false);
    }
  };

  const confirmar = () => {
    if (!escolaEncontrada) return;
    saveStoredEscolaId(escolaEncontrada.escola_id);
    onSaved();
    if (onClose) onClose();
  };

  const voltar = () => {
    setEscolaEncontrada(null);
    setErro(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Escola deste terminal</h3>
              <p className="text-xs text-slate-400">Instalação — acontece apenas uma vez</p>
            </div>
          </div>
          {!bloqueante && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {!escolaEncontrada ? (
            <>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                Este aparelho ainda não está vinculado a uma escola. Digite o <strong>código de instalação</strong> de
                sua escola (fornecido pela direção / coordenação). A escolha fica salva neste aparelho.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-slate-500" />
                  Código da escola
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') validar(); }}
                  placeholder="RUFUS-XXXXXXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 font-mono text-sm font-bold uppercase outline-none transition-all tracking-wider"
                />
              </div>

              {erro && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {erro}
                </div>
              )}

              <button
                onClick={validar}
                disabled={validando}
                className="w-full px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              >
                {validando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {validando ? 'VALIDANDO...' : 'VALIDAR CÓDIGO'}
              </button>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-[11px] text-emerald-900">
                <HelpCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <p>
                  Não tem o código? Peça ao responsável da escola (Login no Painel Administrativo &gt; Códigos
                  dos Terminais).
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-center">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Terminal vinculado a</p>
                <p className="text-lg font-black text-slate-900 leading-snug">{escolaEncontrada.nome}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                Confirme: este terminal pertence a <strong>{escolaEncontrada.nome}</strong>? Após confirmar, o terminal
                mostrará apenas as turmas e alunos desta escola.
              </div>

              <button
                onClick={confirmar}
                className="w-full px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                CONFIRMAR — É ESTA ESCOLA
              </button>

              <button
                onClick={voltar}
                className="w-full px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-extrabold transition-all cursor-pointer"
              >
                Trocar o código
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};