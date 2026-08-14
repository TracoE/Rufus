import React from 'react';
import { Calendar, ShieldAlert, Database } from 'lucide-react';
import { SupabaseConfig } from '../types';

interface HeaderProps {
  dataAtualFormatada: string;
  supabaseConfig: SupabaseConfig;
  onOpenSupabaseModal: () => void;
  onOpenApoiaModal: () => void;
  salaId?: string;
  totalFaltasHoje: number;
}

export const Header: React.FC<HeaderProps> = ({
  dataAtualFormatada,
  supabaseConfig,
  onOpenSupabaseModal,
  onOpenApoiaModal,
  salaId = 'SALA 102',
  totalFaltasHoje
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 md:px-10 h-[76px] bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Left: Classroom Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center overflow-hidden">
          <img src="/icone.svg" alt="RUFUS" className="w-8 h-8 object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              RUFUS
            </span>
            <span className="text-slate-400 text-xs">| Sistema de Frequência</span>
          </div>
          <h1 className="font-bold text-lg md:text-xl text-white tracking-tight flex items-center gap-2">
            RUFUS <span className="text-slate-400 font-normal text-sm md:text-base">— Registros Unificado de Frequências</span>
          </h1>
        </div>
      </div>

      {/* Center: Current Date */}
      <div className="hidden lg:flex items-center gap-2 px-5 py-2 bg-slate-800/80 rounded-full border border-slate-700/60 text-slate-200 font-medium text-base shadow-xs">
        <Calendar className="w-5 h-5 text-emerald-400" />
        <span className="capitalize">{dataAtualFormatada}</span>
      </div>

      {/* Right: APOIA Program Badge & Database Connection Status */}
      <div className="flex items-center gap-3">
        {/* APOIA Alert Button */}
        <button
          onClick={onOpenApoiaModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/60 transition-all cursor-pointer"
          title="Ver Relatório de Faltas APOIA"
        >
          <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
          <div className="text-left hidden sm:block">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-300">Programa APOIA</div>
            <div className="text-xs font-semibold">{totalFaltasHoje} Faltas Hoje</div>
          </div>
        </button>

        {/* Link para o Painel Administrativo — removido do terminal público
            (acesso apenas via URL /admin/dashboard pela equipe pedagógica) */}

        {/* Supabase Status Pill / Settings */}
        <button
          onClick={onOpenSupabaseModal}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            supabaseConfig.isConnected
              ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60'
              : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-700/60'
          }`}
          title="Clique para configurar o Supabase"
        >
          <Database className="w-4 h-4" />
          <span className="hidden md:inline">
            {supabaseConfig.isConnected ? 'Supabase Conectado' : 'Modo Standalone (Local)'}
          </span>
          <span className={`w-2.5 h-2.5 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </button>
      </div>
    </header>
  );
};
