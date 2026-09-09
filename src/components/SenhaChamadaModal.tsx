import React, { useEffect, useState } from 'react';
import { Lock, X, Delete, AlertCircle } from 'lucide-react';

interface SenhaChamadaModalProps {
  isOpen: boolean;
  turmaNome: string;
  senhaCorreta: string;
  onSucesso: () => void;
  onCancelar: () => void;
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar'];

export const SenhaChamadaModal: React.FC<SenhaChamadaModalProps> = ({
  isOpen,
  turmaNome,
  senhaCorreta,
  onSucesso,
  onCancelar
}) => {
  const [digitos, setDigitos] = useState('');
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDigitos('');
      setErro(false);
    }
  }, [isOpen, turmaNome]);

  if (!isOpen) return null;

  const teclar = (t: string) => {
    if (t === 'apagar') {
      setDigitos(prev => prev.slice(0, -1));
      return;
    }
    if (!t || digitos.length >= 4) return;
    const novo = digitos + t;
    setDigitos(novo);
    setErro(false);
    if (novo.length === 4) {
      if (novo === senhaCorreta) {
        onSucesso();
      } else {
        setErro(true);
      }
    }
  };

  const tentarNovamente = () => {
    setDigitos('');
    setErro(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Turma {turmaNome}</h3>
              <p className="text-xs text-slate-400">Digite a senha de 4 dígitos para abrir a chamada</p>
            </div>
          </div>
          <button
            onClick={onCancelar}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancelar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Visor dos dígitos */}
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                  erro ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-300 bg-slate-50 text-slate-900'
                }`}
              >
                {digitos[i] ? '•' : ''}
              </div>
            ))}
          </div>

          {erro ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Senha incorreta. Toque em "Tentar novamente" ou "Cancelar".</p>
            </div>
          ) : (
            <p className="text-center text-xs font-semibold text-slate-500">
              A senha é solicitada sempre que uma turma é selecionada.
            </p>
          )}

          {erro ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={tentarNovamente}
                className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-extrabold text-sm cursor-pointer transition-all active:scale-95"
              >
                Tentar novamente
              </button>
              <button
                onClick={onCancelar}
                className="px-4 py-3 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-extrabold text-sm cursor-pointer transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              {/* Teclado numérico (toque) */}
              <div className="grid grid-cols-3 gap-2">
                {TECLAS.map((t, i) =>
                  t === '' ? (
                    <div key={i} />
                  ) : (
                    <button
                      key={i}
                      onClick={() => teclar(t)}
                      className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center"
                    >
                      {t === 'apagar' ? <Delete className="w-6 h-6" /> : t}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={onCancelar}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer transition-all"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
