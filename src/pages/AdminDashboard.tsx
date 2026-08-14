import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchKanbanData,
  DadosKanban,
  DadosKanbanAluno,
  StatusKanban,
  getLocalDateStr,
  getAdminSession,
  SessaoAdmin
} from '../lib/adminClient';
import { updateTurmaVisibilidade, testSupabaseConnection } from '../lib/supabaseClient';
import { getAdminEscolaId, fetchEscolaNome } from '../lib/adminClient';
import { SupabaseConfig } from '../types';
import { StatusTabs } from '../components/admin/StatusTabs';
import { DossieAlunoModal } from '../components/admin/DossieAlunoModal';
import { RelatorioApoiaModal } from '../components/admin/RelatorioApoiaModal';
import { NovaEscolaModal } from '../components/admin/NovaEscolaModal';
import { LogOut, Calendar, Search, RefreshCw, ArrowLeft, Eye, EyeOff, Settings, X, School, PlusCircle } from 'lucide-react';

type FiltroStatus = 'TODOS' | StatusKanban;

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DadosKanban | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sessão do administrador logado (vazia quando acessar direto pela URL)
  const [sessao] = useState<SessaoAdmin | null>(() => getAdminSession());

  // Status da conexão Supabase (banner do painel)
  const [conn, setConn] = useState<SupabaseConfig | null>(null);

  // Nome da escola em trabalho (vem da sessão do admin ou do aparelho)
  const [escolaNome, setEscolaNome] = useState<string | null>(null);

  // Filtros
  const [mes, setMes] = useState(() => getLocalDateStr().slice(0, 7));
  const [turmaId, setTurmaId] = useState('');
  const [alerta, setAlerta] = useState<FiltroStatus>('TODOS');
  const [busca, setBusca] = useState('');

  // Modais
  const [dossieCard, setDossieCard] = useState<DadosKanbanAluno | null>(null);
  const [relatorioCard, setRelatorioCard] = useState<DadosKanbanAluno | null>(null);
  const [configAberta, setConfigAberta] = useState(false);
  const [novaEscolaAberta, setNovaEscolaAberta] = useState(false);

  // Toggle visibilidade de turmas no painel de chamadas
  const [salvandoTurma, setSalvandoTurma] = useState<string | null>(null);

  const toggleVisibilidadeTurma = async (turmaId: string, mostrar: boolean) => {
    setSalvandoTurma(turmaId);
    const ok = await updateTurmaVisibilidade(turmaId, mostrar);
    setSalvandoTurma(null);
    if (ok) {
      setData(prev => prev ? {
        ...prev,
        turmas: prev.turmas.map(t => t.id === turmaId ? { ...t, mostrar_no_painel: mostrar } : t)
      } : prev);
    } else {
      alert('Erro ao salvar. Verifique a conexão com o Supabase.');
    }
  };

  const carregar = useCallback(async (mesRef: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchKanbanData(mesRef);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar(mes);
  }, [mes, carregar]);

  useEffect(() => {
    if (!getAdminSession()) {
      navigate('/admin/login', { replace: true });
      return;
    }
    testSupabaseConnection().then(setConn);
  }, [navigate]);

  useEffect(() => {
    const escolaId = getAdminEscolaId();
    if (escolaId) {
      fetchEscolaNome(escolaId).then(nome => setEscolaNome(nome));
    }
  }, []);

  const conectado = conn?.isConnected === true;
  const adminOk = conectado && conn?.adminReady !== false;

  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Aplica filtros
  const cardsFiltrados = (data?.cards || []).filter(c => {
    if (turmaId && c.aluno.turma_id !== turmaId) return false;
    if (alerta !== 'TODOS' && c.status !== alerta) return false;
    if (busca && !c.aluno.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="px-5 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
              <img
                src="/rufus.png"
                alt="RUFUS"
                className="w-8 h-8 object-contain"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="min-w-0">
              <div className="font-black tracking-tight flex items-center gap-2 text-sm md:text-base">
                PAINEL ADMINISTRATIVO
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase hidden sm:inline">Busca Ativa APOIA</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${conectado ? (adminOk ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-500'}`} />
                {conectado
                  ? (adminOk
                    ? 'Conectado ao Supabase • Painel ativo'
                    : 'Conectado ao kiosk, mas a camada Busca Ativa ainda não foi criada')
                  : 'Modo teste (sem banco) • configure o Supabase para produção'}
              </div>
              {escolaNome && (
                <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5 truncate">
                  <School className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">{escolaNome}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sessao?.is_super && (
              <button
                onClick={() => setNovaEscolaAberta(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold border border-emerald-500 transition-all cursor-pointer"
                title="Criar nova escola + administrador"
              >
                <PlusCircle className="w-4 h-4" />
                Nova Escola
              </button>
            )}
            <button
              onClick={() => setConfigAberta(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              title="Configurações das turmas"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Terminal
            </button>
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="capitalize">{dataHoje}</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold border border-red-800/60 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Corpo */}
      <div className="px-5 md:px-8 py-5 max-w-[1700px] mx-auto">
        {/* Barra única compacta: filtros + totalizadores */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs mb-3">
          <div className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mês</label>
              <input
                type="month"
                value={mes}
                onChange={e => setMes(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300 focus:border-slate-900 text-xs font-semibold outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Turma</label>
              <select
                value={turmaId}
                onChange={e => setTurmaId(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300 focus:border-slate-900 text-xs font-semibold outline-none transition-all"
              >
                <option value="">Todas</option>
                {(data?.turmas || []).map(t => (
                  <option key={t.id} value={t.id}>Turma {t.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                value={alerta}
                onChange={e => setAlerta(e.target.value as FiltroStatus)}
                className="px-2 py-1 rounded-lg border border-slate-300 focus:border-slate-900 text-xs font-semibold outline-none transition-all"
              >
                <option value="TODOS">Todos</option>
                <option value="JUSTIFICADAS">Justificadas (Atestado)</option>
                <option value="EM_ATENCAO">Em Atenção</option>
                <option value="EM_BUSCA_ATIVA">Em Busca Ativa</option>
                <option value="PRONTO_PARA_APOIA">Pronto p/ APOIA</option>
                <option value="RESOLVIDO">Resolvido / Arquivado</option>
              </select>
            </div>

            <div className="flex-1 min-w-[150px] max-w-xs">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Buscar</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Nome do aluno..."
                  className="w-full pl-8 pr-2 py-1 rounded-lg border border-slate-300 focus:border-slate-900 text-xs outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => carregar(mes)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-extrabold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700">{error}</div>
        )}

        {conectado && !adminOk && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <p className="font-bold mb-1">⚠️ Tabelas da Busca Ativa não encontradas no banco</p>
            <p className="text-xs opacity-90">
              O kiosk está conectado, mas a tabela <code className="font-mono">busca_ativa_registros</code> (e a camada administrativa)
              não existe neste projeto. Até criá-la, o painel mostrará os alunos e faltas, porém <strong>não será possível salvar
              registros de contato</strong> (botão "APOIA" no Dossiê). Rode o script <em>"Administrativo / Busca Ativa"</em> no
              SQL Editor do Supabase e atualize a página.
            </p>
          </div>
        )}

        {!conectado && (
          <div className="mb-4 p-4 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700">
            <p className="font-bold mb-1">⚡ Modo teste — sem conexão com o banco</p>
            <p className="text-xs opacity-90">
              O painel não está conectado ao Supabase. Os dados exibidos abaixo podem estar desatualizados ou indisponíveis até que
              as credenciais sejam configuradas no modal de configuração do terminal.
            </p>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
            <p className="font-semibold text-slate-600">Consolidando faltas e intervenções do mês...</p>
          </div>
        ) : (
          <StatusTabs
            cards={cardsFiltrados}
            onOpenDossie={setDossieCard}
            onGerarRelatorio={setRelatorioCard}
          />
        )}
      </div>

      <footer className="px-5 md:px-8 pb-5 text-center text-[11px] text-slate-500">
        Sistema de Frequência & Programa APOIA • Painel Administrativo
      </footer>

      {/* Modais */}
      {/* Configurações: turmas exibidas no painel de chamadas */}
      {configAberta && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 md:p-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                <h3 className="font-extrabold text-slate-900">Configurações</h3>
              </div>
              <button onClick={() => setConfigAberta(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="mb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-500" />
                  Turmas no Painel Geral de Chamadas
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Desative as turmas que não devem aparecer no terminal do professor. Configuração feita, via de regra, uma única vez.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[50vh] overflow-y-auto">
                {[...(data?.turmas || [])].sort((a, b) => a.nome.localeCompare(b.nome, undefined, { numeric: true })).map(t => {
                  const visivel = t.mostrar_no_painel !== false;
                  return (
                    <button
                      key={t.id}
                      disabled={salvandoTurma === t.id}
                      onClick={() => toggleVisibilidadeTurma(t.id, !visivel)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${
                        visivel
                          ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-700'
                          : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {visivel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {t.nome}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase ${visivel ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {visivel ? 'Visível' : 'Oculto'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
              <button onClick={() => setConfigAberta(false)} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-xs font-extrabold transition-all cursor-pointer">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <DossieAlunoModal
        isOpen={!!dossieCard}
        card={dossieCard}
        mes={mes}
        onClose={() => setDossieCard(null)}
        onSaved={() => carregar(mes)}
      />
      <RelatorioApoiaModal
        isOpen={!!relatorioCard}
        card={relatorioCard}
        mes={mes}
        onClose={() => setRelatorioCard(null)}
      />
      {sessao?.is_super && (
        <NovaEscolaModal
          sessao={sessao}
          isOpen={novaEscolaAberta}
          onClose={() => setNovaEscolaAberta(false)}
        />
      )}
    </div>
  );
};
