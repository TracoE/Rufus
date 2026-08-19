import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Sparkles, ShieldCheck, School, Download } from 'lucide-react';
import { LogoRufus } from './LogoRufus';
import { fetchEscolaNome, getSegmento } from '../lib/supabaseClient';
import { usePwaInstall } from '../lib/usePwaInstall';

interface HeaderProps {
  dataAtualFormatada: string;
  onOpenSegmentoModal: () => void;
  salaId?: string;
  escolaId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  dataAtualFormatada,
  onOpenSegmentoModal,
  salaId = 'SALA 102',
  escolaId
}) => {
  const [escolaNome, setEscolaNome] = useState<string | null>(null);
  const segmento = getSegmento();
  const { canInstall, promptInstall } = usePwaInstall();

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
        <LogoRufus height={46} />
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

      {/* Right: School Identity & Segment Selector */}
      <div className="flex items-center gap-3">
        {/* Instalar app (PWA) — aparece apenas quando o navegador permite */}
        {canInstall && (
          <button
            onClick={promptInstall}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-sm border border-emerald-500/60 transition-all cursor-pointer"
            title="Instalar o RUFUS na tela inicial deste dispositivo"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Instalar</span>
          </button>
        )}

        {/* Link para o Painel Administrativo (acesso pela equipe pedagógica) */}
        <Link
          to="/admin/login"
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition-all cursor-pointer"
          title="Painel Administrativo APOIA (Busca Ativa)"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </Link>

        {/* Seletor de Segmento do Terminal (discreto — apenas ícone; F1, F2, M...) */}
        <button
          onClick={onOpenSegmentoModal}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-all cursor-pointer"
          title={
            segmento
              ? `Terminal exibindo o segmento ${segmento} (clique para alterar)`
              : 'Exibindo todos os segmentos deste terminal'
          }
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
