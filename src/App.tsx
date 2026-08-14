import React, { useState, useEffect, useCallback } from 'react';
import { TurmaComChamada, AlunoComFalta, SupabaseConfig } from './types';
import {
  fetchTurmasComStatus,
  fetchAlunosDaTurma,
  salvarOuAtualizarChamada,
  testSupabaseConnection,
  getLocalDateStr
} from './lib/supabaseClient';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { GridFaltantes } from './components/GridFaltantes';
import { ModalConfirmacao } from './components/ModalConfirmacao';
import { SupabaseModal } from './components/SupabaseModal';
import { ApoiaReportModal } from './components/ApoiaReportModal';
import { ToastNotification } from './components/ToastNotification';

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
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isApoiaModalOpen, setIsApoiaModalOpen] = useState<boolean>(false);

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
  }, []);

  // 2. Load Turmas Status for Today (TELA 1)
  const loadTurmas = useCallback(async () => {
    setLoadingTurmas(true);
    try {
      const { data } = await fetchTurmasComStatus(dataChamadaStr);
      setTurmas(data);
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
      setToast({ message: 'Erro ao carregar turmas do banco de dados.', type: 'error' });
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

  // Calculate total missing students today across all recorded classes
  const totalFaltasHoje = turmas.reduce((acc, t) => acc + (t.qtd_faltantes || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Fixed Header */}
      <Header
        dataAtualFormatada={dataAtualFormatada}
        supabaseConfig={supabaseConfig}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenApoiaModal={() => setIsApoiaModalOpen(true)}
        salaId="SALA 102"
        totalFaltasHoje={totalFaltasHoje}
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

      {/* Supabase Connection Config & SQL Script Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        config={supabaseConfig}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={() => {
          loadSupabaseStatus();
          loadTurmas();
        }}
      />

      {/* APOIA Program Absenteeism Report Modal */}
      <ApoiaReportModal
        isOpen={isApoiaModalOpen}
        onClose={() => setIsApoiaModalOpen(false)}
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
