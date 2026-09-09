import React, { useEffect, useRef, useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';

interface SenhaChamadaModalProps {
  isOpen: boolean;
  turmaNome: string;
  senhaCorreta: string;
  onSucesso: () => void;
  onCancelar: () => void;
}

export const SenhaChamadaModal: React.FC<SenhaChamadaModalProps> = ({
  isOpen,
  turmaNome,
  senhaCorreta,
  onSucesso,
  onCancelar
}) => {
  const [digitos, setDigitos] = useState<string[]>(['', '', '', '']);
  const [erro, setErro] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigitos(['', '', '', '']);
      setErro(false);
      // Cursor já na primeira posição
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    }
  }, [isOpen, turmaNome]);

  if (!isOpen) return null;

  const conferir = (lista: string[]) => {
    if (lista.every(d => d !== '')) {
      if (lista.join('') === senhaCorreta) {
        onSucesso();
      } else {
        setErro(true);
      }
    }
  };

  const handleChange = (i: number, valor: string) => {
    const d = valor.replace(/\D/g, '').slice(-1);
    const lista = [...digitos];
    lista[i] = d;
    setDigitos(lista);
    setErro(false);
    if (d && i < 3) {
      inputsRef.current[i + 1]?.focus();
    }
    conferir(lista);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const lista = [...digitos];
      if (lista[i]) {
        lista[i] = '';
        setDigitos(lista);
      } else if (i > 0) {
        lista[i - 1] = '';
        setDigitos(lista);
        inputsRef.current[i - 1]?.focus();
      }
      setErro(false);
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 3) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const nums = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!nums) return;
    const lista = [' ', ' ', ' ', ' '].map((_, i) => nums[i] || '');
    const completa: string[] = [lista[0] || '', lista[1] || '', lista[2] || '', lista[3] || ''];
    setDigitos(completa);
    setErro(false);
    const primeiroVazio = completa.findIndex(d => d === '');
    inputsRef.current[primeiroVazio === -1 ? 3 : primeiroVazio]?.focus();
    conferir(completa);
  };

  const tentarNovamente = () => {
    setDigitos(['', '', '', '']);
    setErro(false);
    inputsRef.current[0]?.focus();
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
          {/* Caixas de digitação */}
          <div className="flex items-center justify-center gap-3">
            {digitos.map((d, i) => (
              <input
                key={i}
                ref={el => { inputsRef.current[i] = el; }}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={e => e.target.select()}
                className={`w-12 h-14 rounded-xl border-2 text-center text-2xl font-black outline-none transition-all ${
                  erro
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-slate-900'
                }`}
              />
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
            <button
              onClick={onCancelar}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
