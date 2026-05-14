'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { errorMonitor } from '@/lib/error-monitor';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error monitor
    errorMonitor.captureException(error, {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Что-то пошло не так</AlertTitle>
            <AlertDescription>
              Произошла непредвиденная ошибка. Пожалуйста, попробуйте обновить страницу.
              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold">Детали ошибки</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs">
                    {this.state.error.toString()}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="outline">
              Попробовать снова
            </Button>
            <Button onClick={() => window.location.reload()} variant="default">
              Обновить страницу
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components.
 * Note: This is a workaround as hooks can't catch errors.
 * Use the ErrorBoundary class component for actual error catching.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

