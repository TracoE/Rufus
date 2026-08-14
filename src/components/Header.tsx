import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ShieldAlert, Database, ShieldCheck, School } from 'lucide-react';
import { SupabaseConfig } from '../types';
import { fetchEscolaNome } from '../lib/supabaseClient';

interface HeaderProps {
  dataAtualFormatada: string;
  supabaseConfig: SupabaseConfig;
  onOpenSupabaseModal: () => void;
  onOpenApoiaModal: () => void;
  salaId?: string;
  totalFaltasHoje: number;
  escolaId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  dataAtualFormatada,
  supabaseConfig,
  onOpenSupabaseModal,
  onOpenApoiaModal,
  salaId = 'SALA 102',
  totalFaltasHoje,
  escolaId
}) => {
  const [escolaNome, setEscolaNome] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (escolaId) {
      fetchEscolaNome(escolaId).then(nome => {
        if (ativo) setEscolaNome(nome);
      });
    } else {
      setEscolaNome(null);
    }
    return () => { ativo = false; };
  }, [escolaId]);

  return (
    <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 md:px-10 h-[76px] bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Left: Classroom Identity */}
      <div className="flex items-center gap-3">
        <img
          src="/rufus.png"
          alt="RUFUS"
          className="w-10 h-10 md:w-11 md:h-11 object-contain"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <div>
          <div className="text-[11px] text-slate-400 uppercase tracking-wider">Sistema de Frequência</div>
          <h1 className="font-bold text-lg md:text-xl text-white tracking-tight">Registros Unificado de Frequências</h1>
          {escolaNome && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <School className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px] md:max-w-[260px]">{escolaNome}</span>
            </div>
          )}
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

        {/* Link para o Painel Administrativo (acesso pela equipe pedagógica) */}
        <Link
          to="/admin/login"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all cursor-pointer"
          title="Painel Administrativo APOIA (Busca Ativa)"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </Link>

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
