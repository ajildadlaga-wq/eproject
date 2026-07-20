import { Component, ErrorInfo, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: string; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card border-rose-200 bg-rose-50 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="font-semibold">{this.props.fallback ?? "Something went wrong rendering this view."}</p>
          <p className="mt-1 text-xs opacity-80">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
