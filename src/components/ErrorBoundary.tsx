import React, { Component, ReactNode } from "react";
import { RefreshCw, WifiOff, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Import lazily to avoid circular deps
    import("@/lib/error-reporter").then(({ reportError }) => {
      reportError(error, { componentStack: info.componentStack?.slice(0, 500) ?? "" });
    }).catch(() => {});
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 gap-3 text-center animate-in fade-in">
          <AlertTriangle className="w-8 h-8 text-destructive/60" />
          <p className="text-sm font-medium text-foreground">
            {this.props.fallbackTitle || "Algo deu errado nesta seção"}
          </p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Estamos trabalhando para resolver. / We're working on it. Try refreshing the page.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Offline banner component
export function OfflineBanner() {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-50 bg-destructive/90 text-destructive-foreground px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2 backdrop-blur-sm animate-in slide-in-from-top">
      <WifiOff className="w-3.5 h-3.5" />
      Você parece estar offline — mostrando dados em cache / You appear to be offline
    </div>
  );
}

// Source error card
export function SourceErrorCard({ source, onRetry }: { source: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/30">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">Fonte temporariamente indisponível</p>
        <p className="text-[10px] text-muted-foreground">{source}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
