import React, { useEffect, useMemo, useState } from 'react';
import { fetchEscolas } from '../lib/adminClient';
import { saveStoredEscolaId } from '../lib/supabaseClient';
import { School, X, Search, Loader2, RefreshCw, Check } from 'lucide-react';

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
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<string>('');

  const carregarEscolas = async () => {
    setLoading(true);
    setErro(null);
    try {
      const lista = await fetchEscolas();
      setEscolas(lista);
      if (lista.length === 0) {
        setErro('Nenhuma escola encontrada no banco. Verifique a conexão com o Supabase.');
      }
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar a lista de escolas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setBusca('');
      setSelecionada('');
      carregarEscolas();
    }
  }, [isOpen]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return escolas;
    return escolas.filter(e => e.nome.toLowerCase().includes(q));
  }, [escolas, busca]);

  const confirmar = () => {
    if (!selecionada) return;
    saveStoredEscolaId(selecionada);
    onSaved();
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Escola deste terminal</h3>
              <p className="text-xs text-slate-400">Escolha a escola uma única vez na instalação</p>
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
          {bloqueante && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
              Este aparelho ainda não está vinculado a uma escola. Selecione abaixo para o terminal mostrar as turmas
              e a chamada correta. Essa escolha fica salva neste aparelho.
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar escola pelo nome..."
              className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm font-semibold outline-none transition-all"
            />
          </div>

          <div className="max-h-[38vh] overflow-y-auto space-y-1.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm font-semibold">Carregando escolas...</p>
              </div>
            ) : erro && escolas.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs font-semibold text-red-600 mb-3">{erro}</p>
                <button
                  onClick={carregarEscolas}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-extrabold flex items-center gap-2 mx-auto cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  TENTAR NOVAMENTE
                </button>
              </div>
            ) : filtradas.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhuma escola encontrada com "{busca}".</p>
            ) : (
              filtradas.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelecionada(e.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selecionada === e.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                  }`}
                >
                  <School className={`w-4 h-4 shrink-0 ${selecionada === e.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="text-sm font-bold leading-snug">{e.nome}</span>
                  {selecionada === e.id && <Check className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                </button>
              ))
            )}
          </div>

          <button
            onClick={confirmar}
            disabled={!selecionada}
            className="w-full px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            CONFIRMAR ESCOLA
          </button>
        </div>
      </div>
    </div>
  );
};