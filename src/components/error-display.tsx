'use client';

import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Inline Error Message
 *
 * Usage:
 * <ErrorMessage message="Something went wrong" onClose={handleClose} />
 */
interface ErrorMessageProps {
  message: string;
  title?: string;
  onClose?: () => void;
  onRetry?: () => void;
}

export function ErrorMessage({ message, title, onClose, onRetry }: ErrorMessageProps) {
  return (
    <Alert variant="destructive" className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-red-600 hover:text-red-800"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <AlertCircle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2"
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Try Again
        </Button>
      )}
    </Alert>
  );
}

/**
 * Page-level Error Display
 *
 * Usage:
 * <ErrorPage message="Failed to load data" onRetry={handleRetry} />
 */
interface ErrorPageProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

export function ErrorPage({ message, title, onRetry, onGoHome }: ErrorPageProps) {
  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <CardTitle>{title || 'Error'}</CardTitle>
          </div>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onGoHome || (() => (window.location.href = '/'))}
            >
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Empty State with Error
 *
 * Usage:
 * <EmptyStateError message="No data available" />
 */
interface EmptyStateErrorProps {
  message: string;
  title?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyStateError({ message, title, icon, action }: EmptyStateErrorProps) {
  return (
    <div className="text-center py-12">
      {icon || <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <p className="text-muted-foreground mb-4">{message}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Validation Error List
 *
 * Usage:
 * <ValidationErrors errors={formErrors} />
 */
interface ValidationErrorsProps {
  errors: Record<string, string | string[]>;
  onClose?: () => void;
}

export function ValidationErrors({ errors, onClose }: ValidationErrorsProps) {
  const errorEntries = Object.entries(errors);

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-red-600 hover:text-red-800"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Validation Errors</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1 mt-2">
          {errorEntries.map(([field, message]) => {
            const messages = Array.isArray(message) ? message : [message];
            return messages.map((msg, index) => (
              <li key={`${field}-${index}`}>
                <strong>{field}:</strong> {msg}
              </li>
            ));
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Loading State with Error Fallback
 *
 * Usage:
 * <LoadingState loading={isLoading} error={error} onRetry={refetch}>
 *   <YourContent />
 * </LoadingState>
 */
interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingMessage?: string;
}

export function LoadingState({
  loading,
  error,
  onRetry,
  children,
  loadingMessage,
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{loadingMessage || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  return <>{children}</>;
}
