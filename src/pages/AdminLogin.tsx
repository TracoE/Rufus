import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginAdmin, alterarSenhaAdmin } from '../lib/adminClient';
import { getAdminSession } from '../lib/adminClient';
import { Lock, Mail, LogIn, KeyRound, ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fluxo de troca de senha obrigatória (1º acesso / senha padrão 000000)
  const [trocarSenha, setTrocarSenha] = useState<{ email: string; nome: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sessao = await loginAdmin(email.trim(), senha);
      if (sessao.senha_padrao) {
        setTrocarSenha({ email: sessao.email, nome: sessao.nome });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Falha no login.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (novaSenha.length < 4) {
      setError('A nova senha deve ter ao menos 4 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não conferem.');
      return;
    }
    setChangeLoading(true);
    try {
      await alterarSenhaAdmin(trocarSenha!.email, senha, novaSenha);
      setTrocarSenha(null);
      setNovaSenha('');
      setConfirmarSenha('');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Não foi possível alterar a senha.');
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img
            src="/rufus.png"
            alt="RUFUS"
            className="w-20 h-20 object-contain"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Painel Administrativo APOIA
            </h1>
            <p className="text-xs text-slate-400 mt-1">Controle de Busca Ativa e risco de evasão escolar</p>
          </div>

          <div className="p-6 space-y-5">
            {trocarSenha ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 font-medium flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Senha padrão detectada.</strong> Por segurança, defina uma nova senha antes de continuar.
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nova Senha</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={e => setNovaSenha(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 font-mono text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Confirmar Nova Senha</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="password"
                        value={confirmarSenha}
                        onChange={e => setConfirmarSenha(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 font-mono text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={changeLoading}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {changeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    SALVAR NOVA SENHA E ACESSAR
                  </button>
                </form>
              </>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">E-mail do Administrador</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@escola.edu.br"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Senha de Acesso</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="password"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 font-mono text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  ENTRAR NO PAINEL
                </button>
              </form>
            )}
          </div>
        </div>

        <Link to="/" className="mt-5 flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Terminal de Sala de Aula
        </Link>
      </div>
    </div>
  );
};
