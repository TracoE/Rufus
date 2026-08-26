import React, { useState } from 'react';
import { TurmaComChamada } from '../types';
import { CheckCircle2, AlertCircle, Clock, Users, Play, ShieldAlert, CheckCheck } from 'lucide-react';

interface DashboardProps {
  turmas: TurmaComChamada[];
  loading: boolean;
  onSelectTurma: (turma: TurmaComChamada) => void;
  onRefresh: () => void;
  onMarcarTodosPresentes: (turma: TurmaComChamada) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  turmas,
  loading,
  onSelectTurma,
  onRefresh,
  onMarcarTodosPresentes
}) => {
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const realizadas = [...turmas.filter(t => t.realizada)].sort((a, b) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));
  const pendentes = [...turmas.filter(t => !t.realizada)].sort((a, b) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));

  const totalAlunos = turmas.reduce((acc, t) => acc + t.total_alunos, 0);
  const totalFaltantesHoje = turmas.reduce((acc, t) => acc + (t.qtd_faltantes || 0), 0);
  const percentualPresenca = totalAlunos > 0 ? (((totalAlunos - totalFaltantesHoje) / totalAlunos) * 100).toFixed(1) : '100';

  return (
    <div className="pt-[84px] pb-6 px-4 md:px-6 max-w-[1800px] mx-auto min-h-screen flex flex-col justify-between">
      <div>
        {/* Top Title */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Controle Diário de Frequência</span>
            </div>
            <h2 className="text-base md:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
              Painel Geral de Chamadas da Sala
            </h2>
          </div>

          {/* Summary Pill */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 shadow-inner shrink-0">
            <Users className="w-3 h-3 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-700">
              {turmas.length} turma{turmas.length !== 1 ? 's' : ''} • {totalAlunos} aluno{totalAlunos !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Quick Stats Summary Bar (compact) */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          <div className="bg-white p-1.5 rounded-md border border-slate-200 flex items-center justify-between gap-1.5">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 leading-none">Turmas</div>
              <div className="text-base font-black text-slate-900 leading-tight">{turmas.length}</div>
            </div>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-md border border-slate-200 flex items-center justify-between gap-1.5">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600 leading-none">Realizadas</div>
              <div className="text-base font-black text-emerald-600 leading-tight">{realizadas.length}</div>
            </div>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-md border border-slate-200 flex items-center justify-between gap-1.5">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-red-500 leading-none">Pendentes</div>
              <div className="text-base font-black text-red-600 leading-tight">{pendentes.length}</div>
            </div>
            <div className="w-6 h-6 rounded-md bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-md border border-slate-200 flex items-center justify-between gap-1.5">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 leading-none">Presença</div>
              <div className="text-base font-black text-slate-900 leading-tight">{percentualPresenca}%</div>
            </div>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
            <p className="font-semibold text-slate-600">Sincronizando com banco de dados Supabase...</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* SEÇÃO 1: 🟢 CHAMADAS REALIZADAS HOJE */}
            <section>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  Já Registradas
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    {realizadas.length}
                  </span>
                </h3>
              </div>

              {realizadas.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xl text-center">
                  <p className="text-slate-500 font-medium text-sm">Nenhuma chamada finalizada até o momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
                  {realizadas.map(turma => (
                    <div
                      key={turma.id}
                      onClick={() => onSelectTurma(turma)}
                      className="bg-white rounded-md border border-slate-200 border-l-4 border-l-emerald-500 p-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-[13px] font-black text-slate-900 tracking-tight group-hover:text-emerald-700 leading-tight">
                          {turma.nome}
                        </h4>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[9px] font-semibold text-slate-500">
                        <span className="flex items-center gap-0.5 truncate">
                          <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          {turma.horario_registro || '--:--'}
                        </span>
                        {turma.qtd_faltantes > 0 ? (
                          <span className="text-red-600 font-bold bg-red-50 px-1 py-0.5 rounded border border-red-200 shrink-0">
                            {turma.qtd_faltantes}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 shrink-0">
                            100%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SEÇÃO 2: 🔴 CHAMADAS PENDENTES HOJE */}
            <section>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  Pendentes
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                    {pendentes.length}
                  </span>
                </h3>
              </div>

              {pendentes.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                  <p className="text-emerald-900 font-bold text-sm">Parabéns! Todas as chamadas da sala foram realizadas hoje.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                  {pendentes.map(turma => {
                    const confirmando = confirmandoId === turma.id;
                    return (
                      <div
                        key={turma.id}
                        className="bg-red-50/50 rounded-md border border-red-200 border-l-4 border-l-red-500 p-1.5 shadow-xs hover:shadow-md transition-all flex flex-col gap-0.5 ring-2 ring-red-500/5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-[13px] font-black text-slate-900 tracking-tight leading-tight">
                            {turma.nome}
                          </h4>
                          {!confirmando && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[9px] font-semibold text-slate-500">
                          <span className="flex items-center gap-0.5 truncate">
                            <Users className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {turma.total_alunos}
                          </span>
                          {confirmando ? (
                            <span className="flex items-center gap-1">
                              <span className="text-slate-600">Confirmar?</span>
                              <button
                                onClick={() => { setConfirmandoId(null); onMarcarTodosPresentes(turma); }}
                                className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmandoId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                              >
                                Não
                              </button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <button
                                onClick={() => onSelectTurma(turma)}
                                className="flex items-center gap-0.5 text-blue-700 font-bold hover:text-blue-900"
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                Iniciar
                              </button>
                              <button
                                onClick={() => setConfirmandoId(turma.id)}
                                title="Marcar turma com 100% de presença"
                                className="flex items-center gap-0.5 text-emerald-700 font-bold hover:text-emerald-900"
                              >
                                <CheckCheck className="w-2.5 h-2.5" />
                                100%
                              </button>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Footer Info inside Dashboard */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-[11px] text-slate-500 gap-1">
        <div>
          <span>Terminal de Sala de Aula Kiosk — Sistema APOIA (Prevenção à Evasão Escolar)</span>
        </div>
        <div>
          <span>Atualização Automática Ativa • {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};
