import React from 'react';
import { DadosKanbanAluno, StatusKanban, ConfigRufus } from '../../lib/adminClient';
import { UserX, FileText, PhoneCall } from 'lucide-react';

interface KanbanBoardProps {
  cards: DadosKanbanAluno[];
  config: ConfigRufus;
  onOpenDossie: (card: DadosKanbanAluno) => void;
  onGerarRelatorio: (card: DadosKanbanAluno) => void;
}

const COLUNAS: { status: StatusKanban; titulo: string; descricao: string; cor: { header: string; badge: string; border: string; dot: string } }[] = [
  {
    status: 'JUSTIFICADAS',
    titulo: 'JUSTIFICADAS (ATESTADO)',
    descricao: 'Faltas registradas cobertas por atestado — não contam para o APOIA',
    cor: { header: 'bg-sky-100 text-sky-800 border-sky-200', badge: 'bg-sky-50 text-sky-700 border-sky-200', border: 'border-sky-200', dot: 'bg-sky-500' }
  },
  {
    status: 'EM_ATENCAO',
    titulo: 'EM ATENÇÃO',
    descricao: 'Faltas nos últimos 30 dias atingiram o gatilho configurado',
    cor: { header: 'bg-amber-100 text-amber-800 border-amber-200', badge: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-amber-200', dot: 'bg-amber-500' }
  },
  {
    status: 'EM_BUSCA_ATIVA',
    titulo: 'EM BUSCA ATIVA',
    descricao: 'Tentativas de contato em andamento',
    cor: { header: 'bg-orange-100 text-orange-800 border-orange-200', badge: 'bg-orange-50 text-orange-700 border-orange-200', border: 'border-orange-200', dot: 'bg-orange-500' }
  },
  {
    status: 'PRONTO_PARA_APOIA',
    titulo: 'PRONTO PARA APOIA',
    descricao: 'Faltas excessivas e contatos esgotados',
    cor: { header: 'bg-red-100 text-red-800 border-red-200', badge: 'bg-red-50 text-red-700 border-red-200', border: 'border-red-200', dot: 'bg-red-500' }
  },
  {
    status: 'RESOLVIDO',
    titulo: 'RESOLVIDO / ARQUIVADO',
    descricao: 'Faltas justificadas ou regularizadas',
    cor: { header: 'bg-emerald-100 text-emerald-800 border-emerald-200', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-emerald-200', dot: 'bg-emerald-500' }
  }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ cards, config, onOpenDossie, onGerarRelatorio }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
      {COLUNAS.map(col => {
        const colCards = cards.filter(c => c.status === col.status);
        const limite = col.status === 'EM_ATENCAO' ? config.limite_faltas_atencao : col.status === 'PRONTO_PARA_APOIA' ? config.limite_faltas_apoia : null;
        const descricao = limite !== null ? `Gatilho: ${limite} falta${limite !== 1 ? 's' : ''} acumuladas` : col.descricao;

        return (
          <div key={col.status} className={`rounded-xl border ${col.cor.border} bg-slate-50 flex flex-col h-[calc(100vh-210px)] min-h-[200px]`}>
            {/* Cabeçalho da coluna */}
            <div className={`px-2.5 py-1.5 rounded-t-xl border-b ${col.cor.header} flex items-center justify-between`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-full ${col.cor.dot} shrink-0`} />
                <h3 className="font-black text-[11px] tracking-wide truncate">{col.titulo}</h3>
              </div>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${col.cor.badge} shrink-0`}>{colCards.length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
              {colCards.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-slate-400 font-semibold border border-dashed border-slate-300 rounded-lg bg-white/50">
                  Nenhum aluno
                </div>
              ) : (
                colCards.map(card => (
                  <div
                    key={card.aluno.id}
                    className="bg-white rounded-lg border border-slate-200 hover:shadow-sm hover:border-slate-300 transition-all px-2 py-1.5 cursor-pointer group flex items-center gap-2"
                    onClick={() => onOpenDossie(card)}
                    title={`${card.aluno.nome} — ${card.faltas_injustificadas} falta(s) injust. • Turma ${card.turma_nome}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-slate-900 text-[12px] truncate group-hover:text-slate-600">
                          {card.aluno.nome}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">T{card.turma_nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-1 py-px rounded border ${card.faltas_injustificadas > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {card.faltas_injustificadas} falt.
                        </span>
                        {card.faltas_justificadas > 0 && (
                          <span className="text-[10px] font-bold px-1 py-px rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {card.faltas_justificadas} just.
                          </span>
                        )}
                        {card.registros.length > 0 && (
                          <span className="text-[10px] font-bold px-1 py-px rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-0.5">
                            <PhoneCall className="w-2.5 h-2.5" />
                            {card.registros.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {card.status === 'PRONTO_PARA_APOIA' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onGerarRelatorio(card);
                          }}
                          className="text-[10px] font-extrabold px-1.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer active:scale-95"
                          title="Gerar relatório APOIA"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      )}
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center ${col.cor.badge}`}>
                        <UserX className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
