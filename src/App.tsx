import React, { useState, useEffect, useCallback } from 'react';
import { TurmaComChamada, AlunoComFalta, SupabaseConfig } from './types';
import {
  fetchTurmasComStatus,
  fetchAlunosDaTurma,
  salvarOuAtualizarChamada,
  testSupabaseConnection,
  getLocalDateStr,
  getEscolaId,
  REQUIRE_DATABASE
} from './lib/supabaseClient';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { GridFaltantes } from './components/GridFaltantes';
import { ModalConfirmacao } from './components/ModalConfirmacao';
import { SegmentoModal } from './components/SegmentoModal';
import { ToastNotification } from './components/ToastNotification';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'dashboard' | 'grid_faltantes'>('dashboard');

  // Core Data States
  const [turmas, setTurmas] = useState<TurmaComChamada[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState<boolean>(true);

  // Active Selection State for Tela 2
  const [selectedTurma, setSelectedTurma] = useState<TurmaComChamada | null>(null);
  const [alunosTurma, setAlunosTurma] = useState<AlunoComFalta[]>([]);
  const [isEdicao, setIsEdicao] = useState<boolean>(false);

  // Modal States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSegmentoModalOpen, setIsSegmentoModalOpen] = useState<boolean>(false);

  // Faltantes for confirmation modal
  const [faltantesParaConfirmar, setFaltantesParaConfirmar] = useState<AlunoComFalta[]>([]);
  const [totalAlunosTurma, setTotalAlunosTurma] = useState<number>(0);

  // Supabase Config State
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>({
    url: '',
    key: '',
    isConnected: false,
    isMock: true
  });

  // Bloqueio de produção quando o banco está indisponível
  const [dbError, setDbError] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string | null; type: 'success' | 'error' }>({
    message: null,
    type: 'success'
  });

  // Current date formatted in Portuguese (e.g. Sexta-feira, 31 de Julho)
  const today = new Date();
  const dataAtualFormatada = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const dataChamadaStr = getLocalDateStr(today);

  // 1. Load Supabase Config Status
  const loadSupabaseStatus = useCallback(async () => {
    const config = await testSupabaseConnection();
    setSupabaseConfig(config);
    if (REQUIRE_DATABASE && !config.isConnected) {
      setDbError('Não foi possível conectar ao banco de dados (Supabase). Configure as credenciais e verifique a conexão para usar o sistema.');
    } else {
      setDbError(null);
    }
  }, []);

  // 2. Load Turmas Status for Today (TELA 1)
  const loadTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    try {
      const { data } = await fetchTurmasComStatus(dataChamadaStr);
      setTurmas(data);
    } catch (err: any) {
      console.error('Erro ao carregar turmas:', err);
      if (REQUIRE_DATABASE) {
        setDbError(err?.message || 'Falha ao consultar o banco de dados (Supabase).');
      } else {
        setToast({ message: 'Erro ao carregar turmas do banco de dados.', type: 'error' });
      }
    } finally {
      setLoadingTurmas(false);
    }
  }, [dataChamadaStr]);

  // Initial Boot
  useEffect(() => {
    loadSupabaseStatus();
    loadTurmas();
  }, [loadSupabaseStatus, loadTurmas]);

  // Handle selecting a class from Dashboard (Tela 1 -> Tela 2)
  const handleSelectTurma = async (turma: TurmaComChamada) => {
    setSelectedTurma(turma);
    setLoadingTurmas(true);

    try {
      const { alunos, jaRealizada } = await fetchAlunosDaTurma(turma.id, dataChamadaStr);
      setAlunosTurma(alunos);
      setIsEdicao(jaRealizada);
      setCurrentView('grid_faltantes');
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
      setToast({ message: 'Erro ao carregar lista de alunos.', type: 'error' });
    } finally {
      setLoadingTurmas(false);
    }
  };

  // Open Confirmation Modal from Tela 2
  const handleOpenConfirmModal = (faltantes: AlunoComFalta[], total: number) => {
    setFaltantesParaConfirmar(faltantes);
    setTotalAlunosTurma(total);
    setIsConfirmModalOpen(true);
  };

  // Perform Chamada Persistence in Supabase / Fallback (UPSERT)
  const handleConfirmSalvarChamada = async () => {
    if (!selectedTurma) return;

    const faltantesIds = faltantesParaConfirmar.map(a => a.id);

    try {
      const res = await salvarOuAtualizarChamada(selectedTurma.id, dataChamadaStr, faltantesIds);

      if (res.success) {
        setIsConfirmModalOpen(false);
        setToast({
          message: `Chamada da turma ${selectedTurma.nome} salva com sucesso! (${faltantesIds.length} faltantes)`,
          type: 'success'
        });

        // Auto redirect to TELA 1 (Dashboard)
        setCurrentView('dashboard');

        // Refresh Dashboard Cards so card changes to "Realizada"
        await loadTurmas();
      }
    } catch (err: any) {
      console.error('Erro ao gravar chamada:', err);
      setToast({
        message: 'Erro ao gravar chamada no Supabase. Tente novamente.',
        type: 'error'
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {dbError ? (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-slate-900 mb-2">Sem conexão com o banco de dados</h1>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{dbError}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a
                href="/admin/login"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-extrabold cursor-pointer transition-all text-center"
              >
                Configurar (Painel Administrativo)
              </a>
              <button
                onClick={() => { loadSupabaseStatus(); loadTurmas(); }}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-extrabold cursor-pointer transition-all"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
      {/* Fixed Header */}
      <Header
        dataAtualFormatada={dataAtualFormatada}
        supabaseConfig={supabaseConfig}
        onOpenSegmentoModal={() => setIsSegmentoModalOpen(true)}
        salaId="SALA 102"
        escolaId={getEscolaId()}
      />

      {/* Main Screen View Navigation */}
      {currentView === 'dashboard' ? (
        <Dashboard
          turmas={turmas}
          loading={loadingTurmas}
          onSelectTurma={handleSelectTurma}
          onRefresh={loadTurmas}
        />
      ) : selectedTurma ? (
        <GridFaltantes
          turma={selectedTurma}
          alunosInitial={alunosTurma}
          dataAtualFormatada={dataAtualFormatada}
          onBackToDashboard={() => setCurrentView('dashboard')}
          onOpenConfirmModal={handleOpenConfirmModal}
          isEdicao={isEdicao}
        />
      ) : null}

      {/* Confirmation Modal */}
      {selectedTurma && (
        <ModalConfirmacao
          isOpen={isConfirmModalOpen}
          turma={selectedTurma}
          faltantes={faltantesParaConfirmar}
          totalAlunos={totalAlunosTurma}
          dataAtualFormatada={dataAtualFormatada}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmSalvarChamada}
          isEdicao={isEdicao}
        />
      )}
        </>
      )}

      {/* Seletor de segmento deste terminal (apenas isso — sem acesso à configuração completa) */}
      <SegmentoModal
        isOpen={isSegmentoModalOpen}
        onClose={() => setIsSegmentoModalOpen(false)}
        onSaved={() => {
          loadSupabaseStatus();
          loadTurmas();
        }}
      />

      {/* Toast Feedback */}
      <ToastNotification
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, message: null }))}
      />
    </div>
  );
}
