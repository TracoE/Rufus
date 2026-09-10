import React, { useEffect, useState } from 'react';
import {
  fetchCodigos,
  gerarCodigoEscola,
  excluirCodigoEscola,
  renomearCodigoEscola,
  CodigoEscola,
  fetchEscolas
} from '../../lib/adminClient';
import { X, Plus, Copy, Trash2, Loader2, KeyRound, Check, RefreshCw, Pencil, Save } from 'lucide-react';

interface CodigosTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Gera códigos de instalação por escola (somente super). O terminal usa o
// código no 1º uso — ele não lista escolas.
export const CodigosTerminalModal: React.FC<CodigosTerminalModalProps> = ({ isOpen, onClose }) => {
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([]);
  const [codigos, setCodigos] = useState<CodigoEscola[]>([]);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  // Edição inline do código (personalizar com um mais fácil de lembrar)
  const [editando, setEditando] = useState<string | null>(null);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setMensagem(null);
    try {
      const [escList, codList] = await Promise.all([fetchEscolas(), fetchCodigos()]);
      setEscolas(escList);
      setCodigos(codList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const gerar = async (escolaId: string) => {
    setGerando(escolaId);
    setMensagem(null);
    const novo = await gerarCodigoEscola(escolaId);
    setGerando(null);
    if (novo) {
      setCodigos(prev => [novo, ...prev]);
    } else {
      setMensagem('Erro ao gerar o código. Verifique se sua sessão ainda é de superusuário.');
    }
  };

  const excluir = async (codigo: string) => {
    if (!confirm('Excluir este código? Os terminais que já instalaram continuam funcionando (só não permitirá nova instalação com ele).')) return;
    const ok = await excluirCodigoEscola(codigo);
    if (ok) {
      setCodigos(prev => prev.filter(c => c.codigo !== codigo));
    } else {
      setMensagem('Erro ao excluir o código.');
    }
  };

  const iniciarEdicao = (codigo: string) => {
    setEditando(codigo);
    setNovoCodigo(codigo);
    setErroEdicao(null);
    setMensagem(null);
  };

  const salvarEdicao = async (codigoAntigo: string, escolaId: string) => {
    setSalvandoEdicao(true);
    setErroEdicao(null);
    try {
      const atualizado = await renomearCodigoEscola(codigoAntigo, escolaId, novoCodigo);
      setCodigos(prev => prev.map(c => (c.codigo === codigoAntigo ? atualizado : c)));
      setEditando(null);
      setNovoCodigo('');
      setMensagem(`Código da escola atualizado para ${atualizado.codigo}.`);
    } catch (err: any) {
      setErroEdicao(err.message || 'Erro ao salvar o código.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const copiar = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      setTimeout(() => setCopiado(null), 2000);
    } catch (e) {
      setMensagem('Não foi possível copiar automaticamente. Copie manualmente o código.');
    }
  };

  if (!isOpen) return null;

  const codigoPorEscola = (escolaId: string) => codigos.filter(c => c.escola_id === escolaId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Códigos dos Terminais</h3>
              <p className="text-xs text-slate-400">Automático ou personalizado — fácil de lembrar por escola</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
            O terminal <strong>não lista as escolas</strong>: na instalação ele pede apenas o código. Entregue o código
            de cada escola para a pessoa que instalar o aparelho. O app gera um código automático, mas você pode
            <strong> editar para um mais simples</strong> da escola lembrar (ex.: <code className="font-mono">ESCOLA-1</code>).
          </div>

          {mensagem && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">{mensagem}</div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm font-semibold">Carregando escolas...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {escolas.map(es => {
                const lista = codigoPorEscola(es.id);
                return (
                  <div key={es.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-sm font-extrabold text-slate-900 truncate">{es.nome}</span>
                        {lista.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0 uppercase">
                            {lista.length} código(s)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => gerar(es.id)}
                        disabled={gerando === es.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-extrabold transition-all cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        {gerando === es.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {gerando === es.id ? 'Gerando...' : (lista.length ? 'Novo código' : 'Gerar código')}
                      </button>
                    </div>

                    <div className="px-4 py-3 space-y-2">
                      {lista.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum código gerado para esta escola ainda.</p>
                      ) : (
                        lista.map(c => (
                          <div key={c.codigo} className="flex items-center gap-2 flex-wrap">
                            {editando === c.codigo ? (
                              <div className="flex items-center gap-2 flex-wrap flex-1">
                                <input
                                  type="text"
                                  value={novoCodigo}
                                  disabled={salvandoEdicao}
                                  onChange={e => setNovoCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20))}
                                  onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(c.codigo, c.escola_id); }}
                                  placeholder="Ex.: ESCOLA-1"
                                  title="4 a 20 caracteres: letras, números ou hífen"
                                  className="px-3 py-2 rounded-lg border-2 border-slate-900 font-mono text-sm font-bold tracking-wider uppercase outline-none w-44 disabled:opacity-50"
                                />
                                <button
                                  onClick={() => salvarEdicao(c.codigo, c.escola_id)}
                                  disabled={salvandoEdicao}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                                  title="Salvar novo código"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                                </button>
                                <button
                                  onClick={() => { setEditando(null); setErroEdicao(null); }}
                                  disabled={salvandoEdicao}
                                  className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                                >
                                  Cancelar
                                </button>
                                {erroEdicao && (
                                  <p className="w-full text-[11px] font-bold text-red-600">{erroEdicao}</p>
                                )}
                              </div>
                            ) : (
                              <>
                                <code className="px-3 py-2 rounded-lg bg-slate-900 text-emerald-300 font-mono text-sm font-bold tracking-wider">
                                  {c.codigo}
                                </code>
                                <button
                                  onClick={() => copiar(c.codigo)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                                  title="Copiar código"
                                >
                                  {copiado === c.codigo ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiado === c.codigo ? 'Copiado!' : 'Copiar'}
                                </button>
                                <button
                                  onClick={() => iniciarEdicao(c.codigo)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-all cursor-pointer"
                                  title="Personalizar código (mais fácil de lembrar)"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => excluir(c.codigo)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 text-xs font-bold transition-all cursor-pointer"
                                  title="Excluir código"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Excluir
                                </button>
                              </>
                            )}
                            <span className="text-[11px] text-slate-400 ml-auto">
                              Criado {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                              {c.criado_por ? ` por ${c.criado_por}` : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}

              {escolas.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">Nenhuma escola encontrada.</p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={() => { carregar(); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-extrabold cursor-pointer transition-all">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold cursor-pointer">
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
};