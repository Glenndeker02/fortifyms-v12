/**
 * Error Logging Service
 *
 * Centralized error logging and monitoring
 * Supports both client-side and server-side errors
 */

import { db } from './db';

export enum ErrorLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  CLIENT = 'CLIENT',
}

export interface ErrorLogEntry {
  level: ErrorLevel;
  category: ErrorCategory;
  message: string;
  stack?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Log error to database
 */
export async function logError(entry: Omit<ErrorLogEntry, 'timestamp'>): Promise<void> {
  try {
    await db.errorLog.create({
      data: {
        ...entry,
        metadata: entry.metadata || {},
        timestamp: new Date(),
      },
    });
  } catch (error) {
    // Fallback to console if database logging fails
    console.error('[Error Logger] Failed to log error:', error);
    console.error('[Original Error]', entry);
  }
}

/**
 * Log API error
 */
export async function logApiError(
  error: Error | unknown,
  context: {
    userId?: string;
    endpoint?: string;
    method?: string;
    requestId?: string;
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  let category = ErrorCategory.SYSTEM;
  let level = ErrorLevel.ERROR;
  let statusCode = 500;

  // Categorize error
  if (errorMessage.includes('Authentication') || errorMessage.includes('Unauthorized')) {
    category = ErrorCategory.AUTHENTICATION;
    level = ErrorLevel.WARNING;
    statusCode = 401;
  } else if (errorMessage.includes('Access denied') || errorMessage.includes('Forbidden')) {
    category = ErrorCategory.AUTHORIZATION;
    level = ErrorLevel.WARNING;
    statusCode = 403;
  } else if (errorMessage.includes('Validation') || errorMessage.includes('Invalid')) {
    category = ErrorCategory.VALIDATION;
    level = ErrorLevel.INFO;
    statusCode = 400;
  } else if (errorMessage.includes('Prisma') || errorMessage.includes('Database')) {
    category = ErrorCategory.DATABASE;
    level = ErrorLevel.ERROR;
    statusCode = 500;
  }

  await logError({
    level,
    category,
    message: errorMessage,
    stack: errorStack,
    userId: context.userId,
    endpoint: context.endpoint,
    method: context.method,
    requestId: context.requestId,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    statusCode,
  });
}

/**
 * Log client-side error
 */
export async function logClientError(
  error: Error | unknown,
  context: {
    componentStack?: string;
    userAgent?: string;
    url?: string;
  }
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  await logError({
    level: ErrorLevel.ERROR,
    category: ErrorCategory.CLIENT,
    message: errorMessage,
    stack: errorStack,
    userAgent: context.userAgent || navigator.userAgent,
    metadata: {
      componentStack: context.componentStack,
      url: context.url || window.location.href,
    },
  });
}

/**
 * Get error statistics
 */
export async function getErrorStats(timeRangeHours: number = 24): Promise<{
  total: number;
  byLevel: Record<ErrorLevel, number>;
  byCategory: Record<ErrorCategory, number>;
  recentErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: Date;
  }>;
}> {
  const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

  const errors = await db.errorLog.findMany({
    where: {
      timestamp: { gte: since },
    },
    select: {
      level: true,
      category: true,
      message: true,
      timestamp: true,
    },
  });

  // Count by level
  const byLevel = errors.reduce(
    (acc, error) => {
      acc[error.level as ErrorLevel] = (acc[error.level as ErrorLevel] || 0) + 1;
      return acc;
    },
    {} as Record<ErrorLevel, number>
  );

  // Count by category
  const byCategory = errors.reduce(
    (acc, error) => {
      acc[error.category as ErrorCategory] = (acc[error.category as ErrorCategory] || 0) + 1;
      return acc;
    },
    {} as Record<ErrorCategory, number>
  );

  // Group by message
  const messageGroups = errors.reduce(
    (acc, error) => {
      if (!acc[error.message]) {
        acc[error.message] = {
          message: error.message,
          count: 0,
          lastOccurrence: error.timestamp,
        };
      }
      acc[error.message].count++;
      if (error.timestamp > acc[error.message].lastOccurrence) {
        acc[error.message].lastOccurrence = error.timestamp;
      }
      return acc;
    },
    {} as Record<string, { message: string; count: number; lastOccurrence: Date }>
  );

  const recentErrors = Object.values(messageGroups)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: errors.length,
    byLevel,
    byCategory,
    recentErrors,
  };
}

/**
 * Create user-friendly error message
 */
export function getUserFriendlyError(error: Error | unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Map technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'Authentication required': 'Please log in to continue',
    'Access denied': 'You do not have permission to perform this action',
    'Forbidden': 'You do not have permission to access this resource',
    'Not found': 'The requested resource was not found',
    'Validation failed': 'Please check your input and try again',
    'Unauthorized': 'Your session has expired. Please log in again',
    'Network error': 'Unable to connect to the server. Please check your internet connection',
    'Unique constraint': 'This record already exists',
    'Foreign key constraint': 'Cannot delete this record because it is referenced by other records',
  };

  // Check if error message contains any of the mapped phrases
  for (const [key, value] of Object.entries(errorMappings)) {
    if (message.includes(key)) {
      return value;
    }
  }

  // Default fallback
  if (process.env.NODE_ENV === 'development') {
    return message;
  }

  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Error notification helper
 * Integrates with toast notifications
 */
export function notifyError(
  error: Error | unknown,
  options?: {
    title?: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  }
): void {
  const message = getUserFriendlyError(error);

  // This would integrate with your toast notification system
  // For example, with shadcn/ui toast:
  // toast({
  //   variant: 'destructive',
  //   title: options?.title || 'Error',
  //   description: options?.description || message,
  //   action: options?.action ? (
  //     <ToastAction altText={options.action.label} onClick={options.action.onClick}>
  //       {options.action.label}
  //     </ToastAction>
  //   ) : undefined,
  // });

  // Fallback to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Notification]', message, error);
  }
}

/**
 * Retry helper for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Graceful degradation helper
 * Returns fallback value if operation fails
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  options?: {
    logError?: boolean;
    onError?: (error: Error) => void;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (options?.logError) {
      const err = error instanceof Error ? error : new Error(String(error));
      await logError({
        level: ErrorLevel.WARNING,
        category: ErrorCategory.SYSTEM,
        message: `Fallback used: ${err.message}`,
        stack: err.stack,
      });
    }

    if (options?.onError && error instanceof Error) {
      options.onError(error);
    }

    return fallback;
  }
}
