import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
             <AlertTriangle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Oops, something went wrong!</h1>
          <p className="text-gray-400 mb-8 max-w-xs">
            Don't worry, your progress is saved. Please try restarting the app.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-white text-black font-bold rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <RotateCcw size={20} />
            Reload App
          </button>
          
          {import.meta.env.DEV && (
            <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 max-w-sm text-left overflow-auto max-h-40">
              <p className="text-xs font-mono text-red-400 break-words">
                {this.state.error?.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
