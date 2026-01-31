'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (in production, send to error tracking service)
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Default fallback UI - can be used standalone or as the default for ErrorBoundary
interface ErrorFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export function ErrorFallback({
  error,
  onRetry,
  title = 'Something went wrong',
  message = "We hit an unexpected bump. Your data is safe — let's try that again.",
}: ErrorFallbackProps) {
  return (
    <div className="atmosphere min-h-screen flex flex-col items-center justify-center px-6">
      <div className="relative z-10 w-full max-w-md text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-9 w-9 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-light tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">{message}</p>
        </div>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="bg-muted/50 rounded-xl p-4 text-left overflow-auto">
            <p className="text-xs text-muted-foreground font-mono break-all">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {onRetry && (
            <Button onClick={onRetry} className="w-full h-12 text-base">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          )}
          <Button variant="outline" asChild className="w-full h-12 text-base">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Return home
            </Link>
          </Button>
        </div>

        {/* Reassurance */}
        <p className="text-sm text-muted-foreground/60">
          Your sessions and data remain safely stored on your device.
        </p>
      </div>
    </div>
  );
}

// Hook-based error boundary alternative using react-error-boundary pattern
// For use with functional components that need custom error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((err: Error) => {
    setError(err);
  }, []);

  // Throw the error to be caught by nearest ErrorBoundary
  if (error) {
    throw error;
  }

  return { handleError, resetError };
}
