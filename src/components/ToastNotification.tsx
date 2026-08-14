import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
  type?: 'success' | 'error';
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type = 'success',
  onClose
}) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-5 duration-300">
      <div
        className={`px-5 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-extrabold max-w-md ${
          type === 'success'
            ? 'bg-slate-900 text-white border-emerald-500 shadow-emerald-950/20'
            : 'bg-red-900 text-white border-red-500 shadow-red-950/20'
        }`}
      >
        {type === 'success' ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
        )}
        <span className="flex-1 tracking-tight">{message}</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
