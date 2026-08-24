import { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "./Button";
import Icon from "./Icon";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Uncaught rendering error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center bg-surface-bright p-8 rounded-2xl border border-surface-variant shadow-lg">
            <div className="w-16 h-16 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto mb-4">
              <Icon name="warning" size={32} />
            </div>
            <h2 className="font-display text-headline-md text-on-surface mb-2">Something went wrong</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-6">
              An unexpected error occurred while rendering this page. Please try refreshing or return to home.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button onClick={this.handleReset}>Back to Home</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
