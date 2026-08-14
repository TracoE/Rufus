import React, { useState } from 'react';
import { criarEscola, SessaoAdmin } from '../../lib/adminClient';
import { School, Mail, User, Lock, X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface NovaEscolaModalProps {
  sessao: SessaoAdmin;
  isOpen: boolean;
  onClose: () => void;
  onCriada?: (escolaId: string) => void;
}

export const NovaEscolaModal: React.FC<NovaEscolaModalProps> = ({ sessao, isOpen, onClose, onCriada }) => {
  const [nomeEscola, setNomeEscola] = useState('');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [nomeAdmin, setNomeAdmin] = useState('');
  const [senhaSuper, setSenhaSuper] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await criarEscola({
        emailSuper: sessao.email,
        senhaSuper,
        nomeEscola,
        emailAdmin,
        nomeAdmin: nomeAdmin || undefined
      });
      setOk(true);
      setLoading(false);
      onCriada?.(res.escola_id || '');
    } catch (err: any) {
      setError(err.message || 'Não foi possível criar a escola.');
      setLoading(false);
    }
  };

  const fechar = () => {
    setNomeEscola(''); setEmailAdmin(''); setNomeAdmin(''); setSenhaSuper('');
    setError(null); setOk(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Nova Escola</h3>
              <p className="text-xs text-slate-400">{sessao.nome}</p>
            </div>
          </div>
          <button onClick={fechar} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {ok ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                Escola e administrador criados com sucesso!<br />
                <span className="text-xs font-medium">Login do novo admin: <strong>{emailAdmin}</strong> — senha inicial <strong>000000</strong> (troca no 1º acesso).</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome da Escola</label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={nomeEscola}
                    onChange={e => setNomeEscola(e.target.value)}
                    placeholder="Ex.: EEB Nova Escola"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail do Administrador da Escola</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={emailAdmin}
                    onChange={e => setEmailAdmin(e.target.value)}
                    placeholder="admin@escola.edu.br"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome do Administrador (opcional)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={nomeAdmin}
                    onChange={e => setNomeAdmin(e.target.value)}
                    placeholder="Nome da pessoa responsável"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sua senha (confirmação de superusuário)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={senhaSuper}
                    onChange={e => setSenhaSuper(e.target.value)}
                    placeholder="Digite a senha do superusuário"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <School className="w-4 h-4" />}
                CRIAR ESCOLA E ADMINISTRADOR
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};