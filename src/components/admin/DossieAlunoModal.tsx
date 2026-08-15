import React, { useEffect, useState } from 'react';
import {
  fetchDossie,
  salvarRegistroBuscaAtiva,
  excluirRegistroBuscaAtiva,
  uploadAnexo,
  DadosDossie,
  DadosKanbanAluno,
  TipoContato,
  StatusBuscaAtiva,
  TIPOS_CONTATO,
  STATUS_BUSCA_ATIVA,
  getAdminEscolaId,
  getAdminSession
} from '../../lib/adminClient';
import { X, Loader2, CalendarX2, Paperclip, Save, Trash2, PhoneCall, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface DossieAlunoModalProps {
  isOpen: boolean;
  card: DadosKanbanAluno | null;
  mes: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_LABEL: Record<StatusBuscaAtiva, string> = {
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  SEM_SUCESSO: 'Sem sucesso',
  RESOLVIDO: 'Resolvido'
};

type AbaDossie = 'faltas' | 'novoRegistro' | 'timeline';

const ABAS: { id: AbaDossie; rotulo: string; icon: React.ReactNode }[] = [
  { id: 'faltas', rotulo: 'Histórico de Faltas', icon: <CalendarX2 className="w-3.5 h-3.5" /> },
  { id: 'novoRegistro', rotulo: 'Novo Registro de Busca Ativa', icon: <PhoneCall className="w-3.5 h-3.5" /> },
  { id: 'timeline', rotulo: 'Linha do Tempo', icon: <FileText className="w-3.5 h-3.5" /> }
];

export const DossieAlunoModal: React.FC<DossieAlunoModalProps> = ({ isOpen, card, mes, onClose, onSaved }) => {
  const [dossie, setDossie] = useState<DadosDossie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aba, setAba] = useState<AbaDossie>('faltas');

  // Formulário de novo registro
  const [tipoContato, setTipoContato] = useState<TipoContato>('Ligacao');
  const [dataContato, setDataContato] = useState(() => new Date().toISOString().slice(0, 10));
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [statusRegistro, setStatusRegistro] = useState<StatusBuscaAtiva>('EM_ANDAMENTO');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [dataContatoInicial] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!isOpen || !card) return;
    setLoading(true);
    setError(null);
    setAba('faltas');
    setTipoContato('Ligacao');
    setDataContato(new Date().toISOString().slice(0, 10));
    setResponsavel('');
    setObservacoes('');
    setStatusRegistro('EM_ANDAMENTO');
    setAnexo(null);
    fetchDossie(card.aluno.id, mes)
      .then(setDossie)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, card, mes]);

  if (!isOpen || !card) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let anexoUrl: string | undefined;
      if (anexo) {
        anexoUrl = await uploadAnexo(anexo, card.aluno.id);
      }
      const sessao = getAdminSession();
      await salvarRegistroBuscaAtiva({
        aluno_id: card.aluno.id,
        escola_id: getAdminEscolaId(),
        tipo_contato: tipoContato,
        data_contato: dataContato,
        responsavel_contatado: responsavel || undefined,
        observacoes: observacoes || undefined,
        anexo_url: anexoUrl,
        status: statusRegistro,
        criado_por: sessao?.nome || sessao?.email || undefined
      });

      // Reset form
      setTipoContato('Ligacao');
      setResponsavel('');
      setObservacoes('');
      setStatusRegistro('EM_ANDAMENTO');
      setAnexo(null);
      document.getElementById('anexo-input') && ((document.getElementById('anexo-input') as HTMLInputElement).value = '');

      // Reload dossier + notify parent
      const novo = await fetchDossie(card.aluno.id, mes);
      setDossie(novo);
      setAba('timeline');
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Excluir este registro de busca ativa?')) return;
    try {
      await excluirRegistroBuscaAtiva(id);
      const novo = await fetchDossie(card.aluno.id, mes);
      setDossie(novo);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatarData = (iso?: string) => {
    if (!iso) return '—';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  };

  const faltasInjust = (dossie?.faltas || []).filter(f => !f.justificado).length;

  const alterado =
    tipoContato !== 'Ligacao' ||
    dataContato !== dataContatoInicial ||
    responsavel.trim() !== '' ||
    observacoes.trim() !== '' ||
    statusRegistro !== 'EM_ANDAMENTO' ||
    anexo !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight">Dossiê do Aluno</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Turma {dossie?.turma_nome || card.turma_nome}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {dossie?.aluno.nome || card.aluno.nome}
              {dossie?.aluno.matricula ? ` • Matrícula ${dossie.aluno.matricula}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="py-14 text-center text-slate-400 font-semibold text-sm">Carregando dossiê do aluno...</div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">{error}</div>
          ) : (
            <>
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-500">Faltas (até {mes})</span>
                  <div className="text-lg font-black text-slate-900 leading-tight">{dossie?.faltas.length || 0}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-500">Injustificadas</span>
                  <div className="text-lg font-black text-amber-700 leading-tight">{faltasInjust}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-500">Justificadas</span>
                  <div className="text-lg font-black text-emerald-700 leading-tight">{dossie?.faltas.filter(f => f.justificado).length || 0}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-500">Intervenções</span>
                  <div className="text-lg font-black text-slate-900 leading-tight">{dossie?.registros.length || 0}</div>
                </div>
              </div>

              {/* Abas */}
              <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
                {ABAS.map(a => {
                  const ativa = aba === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAba(a.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                        ativa
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {a.icon}
                      {a.rotulo}
                    </button>
                  );
                })}
              </div>

              {/* Conteúdo da aba */}
              {aba === 'faltas' && (
                <div>
                  {dossie && dossie.faltas.length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs font-semibold text-emerald-700">
                      Nenhuma falta registrada neste mês para este aluno.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                            <th className="px-3 py-1.5">Data</th>
                            <th className="px-3 py-1.5">Turma</th>
                            <th className="px-3 py-1.5">Situação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {dossie?.faltas.map((f, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-1 font-bold text-slate-900">{formatarData(f.data)}</td>
                              <td className="px-3 py-1 text-slate-600">Turma {f.turma_nome}</td>
                              <td className="px-3 py-1">
                                {f.justificado ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Justificada (Atestado)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] border border-red-200">
                                    <AlertCircle className="w-3 h-3" /> Não justificada
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
              )}

              {aba === 'novoRegistro' && (
                <form id="form-novo-registro" onSubmit={handleSave} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Contato</label>
                      <select
                        value={tipoContato}
                        onChange={e => setTipoContato(e.target.value as TipoContato)}
                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 focus:border-slate-900 text-xs outline-none transition-all"
                      >
                        {TIPOS_CONTATO.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Data do Contato</label>
                      <input
                        type="date"
                        value={dataContato}
                        onChange={e => setDataContato(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 focus:border-slate-900 text-xs outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Responsável Contatado</label>
                      <input
                        type="text"
                        value={responsavel}
                        onChange={e => setResponsavel(e.target.value)}
                        placeholder="Nome do responsável / contato"
                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 focus:border-slate-900 text-xs outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                      <select
                        value={statusRegistro}
                        onChange={e => setStatusRegistro(e.target.value as StatusBuscaAtiva)}
                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 focus:border-slate-900 text-xs outline-none transition-all"
                      >
                        {STATUS_BUSCA_ATIVA.map(s => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Observações da Conversa</label>
                    <textarea
                      value={observacoes}
                      onChange={e => setObservacoes(e.target.value)}
                      rows={2}
                      placeholder="Descreva o que foi conversado, combinados, próximos passos..."
                      className="w-full px-2.5 py-1.5 rounded-lg border-2 border-slate-300 focus:border-slate-900 text-xs outline-none transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" />
                      Anexo / Comprovante (Atestado, recibo, foto)
                    </label>
                    <input
                      id="anexo-input"
                      type="file"
                      accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
                      onChange={e => setAnexo(e.target.files?.[0] || null)}
                      className="w-full text-xs file:mr-3 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:text-[10px] file:font-bold hover:file:bg-slate-700 cursor-pointer"
                    />
                    {anexo && (
                      <p className="text-[10px] font-semibold text-emerald-700 mt-1">✓ {anexo.name} selecionado (upload no save)</p>
                    )}
                  </div>

                  {error && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] font-semibold text-red-700">{error}</div>
                  )}
                </form>
              )}

              {aba === 'timeline' && (
                <div>
                  {!dossie || dossie.registros.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-300 p-3 rounded-lg text-xs text-slate-500 font-semibold">
                      Nenhuma intervenção registrada ainda. Use a aba "Novo Registro" para iniciar a busca ativa.
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-200 ml-3 pl-5 space-y-3">
                      {dossie.registros.map((r) => (
                        <div key={r.id} className="relative">
                          <span className={`absolute -left-[29px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            r.status === 'RESOLVIDO' ? 'bg-emerald-500' : r.status === 'SEM_SUCESSO' ? 'bg-red-500' : r.status === 'CONCLUIDO' ? 'bg-blue-500' : 'bg-orange-500'
                          }`} />
                          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-xs">{r.tipo_contato}</span>
                                <span className="text-[11px] font-semibold text-slate-500">• {formatarData(r.data_contato)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  r.status === 'RESOLVIDO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  r.status === 'SEM_SUCESSO' ? 'bg-red-50 text-red-700 border-red-200' :
                                  r.status === 'CONCLUIDO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-orange-50 text-orange-700 border-orange-200'
                                }`}>
                                  {STATUS_LABEL[r.status]}
                                </span>
                                <button
                                  onClick={() => handleExcluir(r.id)}
                                  title="Excluir registro"
                                  className="text-slate-400 hover:text-red-600 p-0.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {r.responsavel_contatado && (
                              <p className="text-[11px] font-semibold text-slate-600 mt-1">Responsável: <strong>{r.responsavel_contatado}</strong></p>
                            )}
                            {r.observacoes && <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{r.observacoes}</p>}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {r.criado_por && <span className="text-[10px] text-slate-400 font-semibold">Por: {r.criado_por}</span>}
                              {r.anexo_url && (
                                <a
                                  href={r.anexo_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Paperclip className="w-3 h-3" /> Ver anexo
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {aba === 'novoRegistro' && alterado && (
          <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={() => {
                setTipoContato('Ligacao');
                setDataContato(dataContatoInicial);
                setResponsavel('');
                setObservacoes('');
                setStatusRegistro('EM_ANDAMENTO');
                setAnexo(null);
                setError(null);
                document.getElementById('anexo-input') && ((document.getElementById('anexo-input') as HTMLInputElement).value = '');
              }}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-novo-registro"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};