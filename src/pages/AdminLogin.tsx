import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginGoogle, obterSessaoAdmin, assinarMudancaAuth } from '../lib/adminClient';
import { ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { LogoRufus } from '../components/LogoRufus';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checando, setChecando] = useState(true);

  // Ao carregar a página (inclusive no retorno do OAuth do Google), restaura a
  // sessão e redireciona para o painel quando já autenticado.
  useEffect(() => {
    let ativo = true;
    obterSessaoAdmin().then(sessao => {
      if (!ativo) return;
      if (sessao) navigate('/admin/dashboard', { replace: true });
      setChecando(false);
    }).catch(() => {
      if (ativo) setChecando(false);
    });

    const unsub = assinarMudancaAuth(sessao => {
      if (!ativo) return;
      if (sessao) navigate('/admin/dashboard', { replace: true });
    });
    return () => {
      ativo = false;
      if (unsub) unsub();
    };
  }, [navigate]);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginGoogle();
      // O redirect do Google acontece aqui; o restante é tratado no retorno.
    } catch (err: any) {
      setError(err.message || 'Falha ao iniciar o login com Google.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <LogoRufus height={72} />
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
            {checando ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-3" />
                <p className="text-sm font-semibold">Verificando sessão...</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 font-medium flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    O acesso é feito com a <strong>conta Google do administrador da escola</strong>,
                    a mesma cadastrada no JustificaE.
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">{error}</div>
                )}

                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-900 disabled:opacity-60 text-slate-800 font-extrabold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
                    </svg>
                  )}
                  {loading ? 'AUTENTICANDO...' : 'ENTRAR COM GOOGLE'}
                </button>
              </>
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