import React, { useEffect, useState } from 'react';
import { ApoiaAlert } from '../types';
import { fetchRelatorioApoia } from '../lib/supabaseClient';
import { ShieldAlert, X, Printer, Download, UserX, CheckCircle2, AlertTriangle, Search } from 'lucide-react';

interface ApoiaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApoiaReportModal: React.FC<ApoiaReportModalProps> = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState<ApoiaAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchRelatorioApoia().then(data => {
        setAlerts(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = alerts.filter(a =>
    a.aluno_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.turma_nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEmAlerta = alerts.filter(a => a.status === 'ALERTA_APOIA').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-red-950 text-white flex justify-between items-center border-b border-red-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                Programa APOIA <span className="text-xs font-semibold bg-red-800 text-red-100 px-2 py-0.5 rounded-full uppercase">Relatório Oficial</span>
              </h3>
              <p className="text-xs text-red-300">
                Acompanhamento de Frequência Escolar & Prevenção da Evasão de Alunos Faltantes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-300 hover:text-white p-2 rounded-xl hover:bg-red-900 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600">Alunos em Alerta APOIA</span>
              <div className="text-3xl font-black text-red-700 mt-1">{totalEmAlerta}</div>
              <p className="text-xs text-red-600 mt-1">Acima do limite de faltas injustificadas</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Faltas Registradas</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {alerts.reduce((acc, a) => acc + a.total_faltas_mes, 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total acumulado neste mês no terminal</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Encaminhamentos</span>
              <div className="text-3xl font-black text-emerald-700 mt-1">{totalEmAlerta}</div>
              <p className="text-xs text-emerald-700 mt-1">Prontos para ficha de notificação APOIA</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar aluno ou turma..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-slate-900 outline-none text-sm font-semibold"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-semibold">
              Carregando registros do banco de dados...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-extrabold text-emerald-900 text-lg">
                Excelente! Nenhum aluno com alerta crítico do APOIA.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-extrabold text-xs tracking-wider border-b border-slate-200">
                    <th className="p-3.5">Aluno</th>
                    <th className="p-3.5">Turma</th>
                    <th className="p-3.5 text-center">Faltas Registradas</th>
                    <th className="p-3.5 text-center">Status APOIA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filtered.map(alert => (
                    <tr key={alert.aluno_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{alert.aluno_nome}</td>
                      <td className="p-3.5 text-slate-600">{alert.turma_nome}</td>
                      <td className="p-3.5 text-center font-extrabold text-slate-900">
                        {alert.total_faltas_mes}
                      </td>
                      <td className="p-3.5 text-center">
                        {alert.status === 'ALERTA_APOIA' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 font-bold text-xs border border-red-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            ALERTA APOIA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                            Monitoramento
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>IMPRIMIR RELATÓRIO APOIA</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm cursor-pointer"
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
};
