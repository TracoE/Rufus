import React, { useEffect, useState } from 'react';
import { fetchDossie, DadosDossie } from '../../lib/adminClient';
import { X, Printer, Loader2, ShieldAlert, School, FileText } from 'lucide-react';

interface RelatorioApoiaModalProps {
  isOpen: boolean;
  card: { aluno: { id: string; nome: string; matricula?: string }; turma_nome: string } | null;
  mes: string;
  onClose: () => void;
}

export const RelatorioApoiaModal: React.FC<RelatorioApoiaModalProps> = ({ isOpen, card, mes, onClose }) => {
  const [dossie, setDossie] = useState<DadosDossie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !card) return;
    setLoading(true);
    setError(null);
    fetchDossie(card.aluno.id, mes)
      .then(setDossie)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, card, mes]);

  if (!isOpen || !card) return null;

  const handlePrint = () => {
    document.body.classList.add('rufus-printing');
    window.print();
    setTimeout(() => document.body.classList.remove('rufus-printing'), 500);
  };

  const formatarData = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  const nomeMes = new Date(`${mes}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const faltasInjust = (dossie?.faltas || []).filter(f => !f.justificado).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Chrome do modal (não sai na impressão) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Relatório de Encaminhamento APOIA</h3>
              <p className="text-xs text-slate-400">Documento oficial — pronto para impressão em PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto print-area p-8 bg-white">
          {loading ? (
            <div className="py-16 text-center text-slate-400 font-semibold flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Gerando relatório...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700">{error}</div>
          ) : (
            <div className="space-y-6">
              {/* Cabeçalho do documento */}
              <div className="flex justify-between items-start border-b-4 border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <School className="w-10 h-10 text-slate-700" />
                  <div>
                    <h1 className="text-xl font-black text-slate-900">RELATÓRIO DE ENCAMINHAMENTO APOIA</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">EEB Roland Harold Dornbusch</p>
                    <p className="text-xs text-slate-500">Programa de Prevenção à Evasão Escolar — Mês de {nomeMes}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500 font-semibold">
                  <div>Emitido em: {new Date().toLocaleDateString('pt-BR')}</div>
                  <div className="mt-1 font-black text-slate-900">ALERTA CRÍTICO APOIA</div>
                </div>
              </div>

              {/* Dados do aluno */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500">Aluno</span>
                  <p className="font-black text-slate-900 text-base">{dossie?.aluno.nome}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500">Matrícula</span>
                  <p className="font-black text-slate-900">{dossie?.aluno.matricula || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500">Turma</span>
                  <p className="font-black text-slate-900">Turma {dossie?.turma_nome || card.turma_nome}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500">Faltas não justificadas</span>
                  <p className="font-black text-red-700 text-lg">{faltasInjust} no mês</p>
                </div>
              </div>

              {/* Tabela de faltas */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-700" /> Tabela de Faltas Registradas
                </h4>
                {!dossie || dossie.faltas.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma falta registrada no mês.</p>
                ) : (
                  <table className="w-full border-collapse text-sm border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Data</th>
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Turma</th>
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossie.faltas.map((f, i) => (
                        <tr key={i}>
                          <td className="border border-slate-300 p-2 font-bold">{formatarData(f.data)}</td>
                          <td className="border border-slate-300 p-2">Turma {f.turma_nome}</td>
                          <td className="border border-slate-300 p-2">{f.justificado ? 'Justificada (Atestado)' : 'Não justificada'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Cronologia de busca ativa */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-600" /> Cronologia das Tentativas de Busca Ativa
                </h4>
                {!dossie || dossie.registros.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma tentativa de contato registrada pela escola.</p>
                ) : (
                  <table className="w-full border-collapse text-sm border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Data</th>
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Contato</th>
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Responsável</th>
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Status</th>
                        <th className="border border-slate-300 p-2 text-left text-xs uppercase">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossie.registros.map(r => (
                        <tr key={r.id}>
                          <td className="border border-slate-300 p-2 font-bold">{formatarData(r.data_contato)}</td>
                          <td className="border border-slate-300 p-2">{r.tipo_contato}</td>
                          <td className="border border-slate-300 p-2">{r.responsavel_contatado || '—'}</td>
                          <td className="border border-slate-300 p-2">{r.status.replace(/_/g, ' ')}</td>
                          <td className="border border-slate-300 p-2 text-xs">{r.observacoes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Recomendação */}
              <div className="border-2 border-red-700 rounded-xl p-4 bg-red-50">
                <p className="text-sm font-black text-red-900 uppercase tracking-wide mb-1">Recomendação da Equipe Pedagógica</p>
                <p className="text-sm text-slate-700">
                  Encaminhar o aluno ao <strong>Programa APOIA</strong> para acompanhamento especializado, devido ao acúmulo de
                  faltas injustificadas e esgotamento das tentativas de busca ativa realizadas pela unidade escolar.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="text-center">
                  <div className="border-t-2 border-slate-400 pt-2 text-xs font-bold text-slate-600">Assinatura da Equipe Pedagógica</div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-slate-400 pt-2 text-xs font-bold text-slate-600">Assinatura da Coordenação APOIA</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer do modal */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-between print:hidden">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-sm cursor-pointer">
            FECHAR
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-extrabold text-sm flex items-center gap-2 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            IMPRIMIR / SALVAR PDF
          </button>
        </div>
      </div>
    </div>
  );
};
