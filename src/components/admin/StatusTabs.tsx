import React, { useMemo, useState } from 'react';
import { DadosKanbanAluno, StatusKanban } from '../../lib/adminClient';
import { FileText, Users, PhoneCall } from 'lucide-react';

interface StatusTabsProps {
  cards: DadosKanbanAluno[];
  onOpenDossie: (card: DadosKanbanAluno) => void;
  onGerarRelatorio: (card: DadosKanbanAluno) => void;
}

const ABAS: { status: StatusKanban; rotulo: string; dot: string }[] = [
  { status: 'JUSTIFICADAS', rotulo: 'Justificadas', dot: 'bg-slate-400' },
  { status: 'EM_ATENCAO', rotulo: 'Em Atenção', dot: 'bg-amber-500' },
  { status: 'EM_BUSCA_ATIVA', rotulo: 'Em Busca Ativa', dot: 'bg-orange-500' },
  { status: 'PRONTO_PARA_APOIA', rotulo: 'Pronto p/ APOIA', dot: 'bg-red-600' },
  { status: 'RESOLVIDO', rotulo: 'Resolvidos', dot: 'bg-emerald-600' }
];

const ORDEM: Record<StatusKanban, number> = {
  JUSTIFICADAS: 1, EM_ATENCAO: 2, EM_BUSCA_ATIVA: 3, PRONTO_PARA_APOIA: 4, RESOLVIDO: 5
};

export const StatusTabs: React.FC<StatusTabsProps> = ({ cards, onOpenDossie, onGerarRelatorio }) => {
  const [abaSelecionada, setAbaSelecionada] = useState<StatusKanban>('PRONTO_PARA_APOIA');

  const contagens = useMemo(() => {
    const c: Record<string, number> = {};
    cards.forEach(card => { c[card.status] = (c[card.status] || 0) + 1; });
    return c;
  }, [cards]);

  const alunosAba = useMemo(() => {
    return cards
      .filter(c => c.status === abaSelecionada)
      .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome, undefined, { numeric: true }));
  }, [cards, abaSelecionada]);

  const rotuloAba = ABAS.find(a => a.status === abaSelecionada)?.rotulo || '';
  const abasOrdenadas = [...ABAS].sort((a, b) => ORDEM[a.status] - ORDEM[b.status]);

  return (
    <div>
      {/* Guias de status */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {abasOrdenadas.map(aba => {
          const qtd = contagens[aba.status] || 0;
          const ativa = aba.status === abaSelecionada;
          return (
            <button
              key={aba.status}
              onClick={() => setAbaSelecionada(aba.status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                ativa
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${aba.dot}`} />
              {aba.rotulo}
              <span className={`text-[10px] font-black px-1.5 py-px rounded-full ${
                ativa ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {qtd}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabela zebrada */}
      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-300">
              <th className="px-3 py-1.5 w-8" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14 }}>#</th>
              <th className="px-3 py-1.5" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14 }}>Aluno</th>
              <th className="px-3 py-1.5 hidden sm:table-cell" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14 }}>Turma</th>
              <th className="px-3 py-1.5 text-center w-14" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14 }}>Faltas</th>
              <th className="px-3 py-1.5 text-center w-14 hidden md:table-cell" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14 }}>Justif.</th>
              <th className="px-3 py-1.5 text-center w-16 hidden md:table-cell" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14 }}>Contatos</th>
              <th className="px-3 py-1.5 text-right whitespace-nowrap" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 14 }}>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {alunosAba.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-slate-400 font-semibold">
                  Nenhum aluno neste status.
                </td>
              </tr>
            )}
            {alunosAba.map((card, i) => (
              <tr
                key={card.aluno.id}
                className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors cursor-pointer`}
                onClick={() => onOpenDossie(card)}
              >
                <td className="px-3 py-0.5 text-slate-400" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }}>{i + 1}</td>
                <td className="px-3 py-0.5">
                  <span className="font-bold text-slate-800 truncate" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }}>{card.aluno.nome}</span>
                  {card.aluno.matricula && (
                    <span className="text-slate-400 hidden lg:inline" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 10 }}> M {card.aluno.matricula}</span>
                  )}
                </td>
                <td className="px-3 py-0.5 text-slate-600 hidden sm:table-cell" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }}>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3 text-slate-400" />T {card.turma_nome}</span>
                </td>
                <td className="px-3 py-0.5 text-center">
                  <span className={`inline-block font-bold px-1.5 py-px rounded border ${
                    card.faltas_injustificadas > 0 ? 'text-red-700 border-red-300 bg-red-50' : 'text-slate-600 border-slate-300 bg-slate-50'
                  }`} style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }}>
                    {card.faltas_injustificadas}
                  </span>
                </td>
                <td className="px-3 py-0.5 text-center hidden md:table-cell" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }}>{card.faltas_justificadas}</td>
                <td className="px-3 py-0.5 text-center hidden md:table-cell">
                  <span className="flex items-center gap-1 justify-center" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 }}>
                    <PhoneCall className="w-3 h-3 text-slate-400" />{card.registros.length}
                  </span>
                </td>
                <td className="px-3 py-0.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {card.status === 'PRONTO_PARA_APOIA' && (
                      <button
                        onClick={e => { e.stopPropagation(); onGerarRelatorio(card); }}
                        className="font-extrabold px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 text-white flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                        style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 11 }}
                      >
                        <FileText className="w-3 h-3" /> APOIA
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onOpenDossie(card); }}
                      className="font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
                      style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 11 }}
                    >
                      Dossiê
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-500 font-semibold mt-2">
        {alunosAba.length} aluno{alunosAba.length !== 1 ? 's' : ''} em "{rotuloAba}". Clique em uma linha para abrir o dossiê.
      </p>
    </div>
  );
};