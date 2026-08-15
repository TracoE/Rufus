import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 rounded-2xl shadow-lg max-w-lg w-full p-6">
            <h2 className="text-lg font-black text-red-700 mb-2">Ocorreu um erro neste painel</h2>
            <p className="text-sm text-slate-700 mb-3">
              Envie a mensagem abaixo para a equipe técnica — isso ajuda a corrigir o problema.
            </p>
            <pre className="text-xs bg-red-50 border border-red-100 rounded-lg p-3 overflow-auto text-red-800 font-mono">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-extrabold cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}