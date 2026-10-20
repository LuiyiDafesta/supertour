import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 select-none">
          <div className="glass-card max-w-md w-full p-8 rounded-3xl border border-zinc-800 bg-zinc-950/90 text-center shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5 text-amber-400 glow-yellow">
              <AlertCircle size={32} />
            </div>

            <h2 className="text-xl font-black uppercase text-white tracking-tight">
              Algo no salió como esperábamos
            </h2>

            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Ocurrió un problema temporal al cargar esta sección. Podés reintentar cargar la página o volver a la pantalla de inicio.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary/95 text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all glow-yellow cursor-pointer"
              >
                <RotateCcw size={14} />
                Reintentar
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home size={14} />
                Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
