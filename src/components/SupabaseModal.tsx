import React, { useState } from 'react';
import { SupabaseConfig } from '../types';
import { saveStoredCredentials, testSupabaseConnection, resetLocalData, getEscolaId, saveStoredEscolaId, getSegmento, saveStoredSegmento } from '../lib/supabaseClient';
import { SUPABASE_SQL_SCRIPT } from '../lib/supabaseSchema';
import { ADMIN_SQL_SCRIPT } from '../lib/supabaseAdminSchema';
import { Database, Copy, Check, RefreshCw, X, Key, ExternalLink, ShieldAlert, Sparkles, School } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  config: SupabaseConfig;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  config,
  onClose,
  onConfigChanged
}) => {
  const [url, setUrl] = useState(config.url);
  const [key, setKey] = useState(config.key);
  const [escolaId, setEscolaId] = useState(getEscolaId());
  const [segmento, setSegmento] = useState(getSegmento());
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [scriptAtivo, setScriptAtivo] = useState<'kiosk' | 'admin'>('kiosk');

  const scriptSql = scriptAtivo === 'admin' ? ADMIN_SQL_SCRIPT : SUPABASE_SQL_SCRIPT;

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    setTesting(true);
    setTestResult(null);

    saveStoredCredentials(url.trim(), key.trim());
    saveStoredEscolaId(escolaId);
    saveStoredSegmento(segmento);

    const result = await testSupabaseConnection();
    setTesting(false);

    if (result.isConnected) {
      if (result.adminReady === false) {
        setTestResult('⚠️ Conectado ao Supabase, porém a camada administrativa ainda não foi criada. Execute o script "Administrativo / Busca Ativa" no SQL Editor para habilitar o painel e os registros.');;
      } else {
        setTestResult('✅ Conexão estabelecida com sucesso! Tabelas verificadas no Supabase.');
      }
    } else {
      setTestResult('⚠️ Não foi possível conectar ao Supabase ou as tabelas ainda não foram criadas. O sistema continuará operando normalmente em Modo Standalone / Demo.');
    }

    onConfigChanged();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(scriptSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('Deseja reiniciar os dados de teste locais para o padrão original?')) {
      resetLocalData();
      onConfigChanged();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Configuração da Integração Supabase</h3>
              <p className="text-xs text-slate-400">
                Gerencie as credenciais do banco de dados e sincronize com a escola
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Status Alert Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            config.isConnected && config.adminReady !== false
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <Database className={`w-5 h-5 shrink-0 mt-0.5 ${config.isConnected && config.adminReady !== false ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <div className="font-bold text-sm">
                {config.isConnected && config.adminReady !== false
                  ? '🟢 Conectado ao Supabase (Produção)'
                  : config.isConnected
                    ? '🟡 Conectado, mas falta a camada administrativa'
                    : '⚡ Modo Standalone / Demo (Cache Local)'}
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {config.isConnected && config.adminReady !== false
                  ? 'Todas as chamadas e faltas estão sendo salvas em tempo real no seu banco de dados Supabase.'
                  : config.isConnected
                    ? 'O kiosk está conectado, mas as tabelas administrativas (rufus_config, busca_ativa_registros) não existem ainda. Rode o script "Administrativo / Busca Ativa" no SQL Editor para habilitar o Painel Administrativo.'
                    : 'O aplicativo funciona 100% de forma autônoma sem travar! Insira suas credenciais abaixo ou copie o script SQL para conectar ao seu banco de dados oficial do programa APOIA.'}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" />
              Credenciais do Projeto Supabase
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                VITE_SUPABASE_URL
              </label>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://sua-url-supabase.supabase.co"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 font-mono text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                VITE_SUPABASE_ANON_KEY
              </label>
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 font-mono text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-slate-500" />
                Escola do Kiosk (ID)
              </label>
              <input
                type="text"
                value={escolaId}
                onChange={e => setEscolaId(e.target.value)}
                placeholder="UUID da escola (tabela escolas)"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 font-mono text-sm outline-none transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Deixe em branco para usar o valor de VITE_ESCOLA_ID. O kiosk mostra apenas as turmas e alunos desta escola.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                Segmento deste terminal (opcional)
              </label>
              <input
                type="text"
                value={segmento}
                onChange={e => setSegmento(e.target.value)}
                placeholder="Ex.: EF, F2, Med (deixe vazio para mostrar todas as turmas)"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-slate-900 text-sm outline-none transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Se preenchido, este terminal exibe apenas as turmas desta escola marcadas com esse segmento no Painel › Configurações.
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleSaveAndTest}
                disabled={testing}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>SALVAR E TESTAR CONEXÃO</span>
              </button>

              <button
                onClick={handleResetData}
                className="text-xs text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
              >
                Resetar Dados Locais
              </button>
            </div>

            {testResult && (
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                {testResult}
              </div>
            )}
          </div>

          {/* SQL Script Accordion */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Scripts de Criação de Tabelas (SQL Schema)
                </h4>
                <p className="text-xs text-slate-500">
                  Execute no SQL Editor do Supabase. Os scripts <strong>não alteram</strong> as tabelas do JustificaE.
                </p>
              </div>

              <button
                onClick={handleCopySql}
                className="px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center gap-2 border border-emerald-300 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'COPIADO!' : 'COPIAR SCRIPT SQL'}</span>
              </button>
            </div>

            {/* Seletor de script */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { setScriptAtivo('kiosk'); setCopied(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                  scriptAtivo === 'kiosk'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                }`}
              >
                Kiosk (rufus_*)
              </button>
              <button
                onClick={() => { setScriptAtivo('admin'); setCopied(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                  scriptAtivo === 'admin'
                    ? 'bg-red-800 text-white border-red-800'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                }`}
              >
                Administrativo / Busca Ativa
              </button>
            </div>

            {scriptAtivo === 'admin' && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-semibold text-red-800">
                Cria: rufus_config (gatilhos), busca_ativa_registros e o bucket de anexos. Com o login Google, o painel usa as tabelas do JustificaE (escolas.email_admin / professores). Necessário para o Painel Administrativo.
              </div>
            )}

            <div className="relative">
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-48 border border-slate-800 shadow-inner">
                {scriptSql}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end">
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
