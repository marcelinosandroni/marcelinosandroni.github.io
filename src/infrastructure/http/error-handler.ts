import { NextResponse } from 'next/server';
import type { DomainError } from '@/domain/errors/domain-error';

/**
 * Interface for error response sent to clients
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Determines if an error is a known DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
  return error instanceof Error && 'statusCode' in error && 'code' in error;
}

/**
 * Creates a standardized error response for API endpoints
 * 
 * - For operational errors (validation, not found, etc.): returns the specific message
 * - For internal/programming errors: returns a generic message to avoid leaking sensitive info
 * - Always logs the full error details server-side for debugging
 */
export function createErrorResponse(error: unknown): NextResponse<ErrorResponse> {
  // Handle known domain errors
  if (isDomainError(error)) {
    const domainError = error as DomainError;
    
    // Log detailed error information for monitoring/debugging
    logError(domainError);
    
    // Return client-safe response
    return NextResponse.json(
      {
        error: domainError.getClientMessage(),
        code: domainError.code,
        ...(domainError.metadata && { details: domainError.metadata }),
      },
      { status: domainError.statusCode }
    );
  }

  // Handle native Error objects
  if (error instanceof Error) {
    // Log the full error with stack trace
    logError({
      name: error.name,
      message: error.message,
      stack: error.stack,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      isOperational: false,
    });

    // Return generic error to avoid exposing internal details
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  // Handle unknown error types
  const unknownError = String(error);
  console.error('Unknown error type:', unknownError);

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Logs error details for monitoring and debugging
 * In production, this should integrate with your logging service (e.g., Sentry, Datadog)
 */
function logError(errorData: DomainError | Record<string, unknown>): void {
  const isErrorOperational = 'isOperational' in errorData ? errorData.isOperational : true;
  
  // Create structured log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: isErrorOperational ? 'warn' : 'error',
    name: 'name' in errorData ? errorData.name : 'UnknownError',
    message: 'message' in errorData ? errorData.message : 'No message',
    code: 'code' in errorData ? errorData.code : 'UNKNOWN',
    statusCode: 'statusCode' in errorData ? errorData.statusCode : 500,
    isOperational: isErrorOperational,
    stack: 'stack' in errorData ? errorData.stack : undefined,
    metadata: 'metadata' in errorData ? errorData.metadata : undefined,
  };

  // Use appropriate log level based on error type
  if (isErrorOperational) {
    console.warn('[Operational Error]', JSON.stringify(logEntry, null, 2));
  } else {
    console.error('[Internal Error]', JSON.stringify(logEntry, null, 2));
  }
}

/**
 * Wraps an async handler function with global error handling
 * This is a higher-order function that catches errors and returns standardized responses
 */
export function withErrorHandler<T extends (...args: Parameters<T>) => Promise<ReturnType<T>>>(
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Re-throw to be caught by Next.js error boundaries or middleware
      // The error will be handled by the API route's try-catch
      throw error;
    }
  }) as T;
}
