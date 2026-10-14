import { DomainError } from './domain-error';

export { DomainError } from './domain-error';

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends DomainError {
  constructor(
    message: string = 'Resource not found',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'NOT_FOUND', 404, true, metadata);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends DomainError {
  public readonly fields?: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    fields?: Record<string, string[]>,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, metadata);
    this.fields = fields;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

/**
 * Error thrown when an operation is not allowed
 */
export class ForbiddenError extends DomainError {
  constructor(
    message: string = 'Access forbidden',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'FORBIDDEN', 403, true, metadata);
  }
}

/**
 * Error thrown when authentication is required or fails
 */
export class UnauthorizedError extends DomainError {
  constructor(
    message: string = 'Unauthorized',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'UNAUTHORIZED', 401, true, metadata);
  }
}

/**
 * Error thrown when a conflict occurs (e.g., duplicate resource)
 */
export class ConflictError extends DomainError {
  constructor(
    message: string = 'Resource conflict',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'CONFLICT', 409, true, metadata);
  }
}

/**
 * Error thrown when too many requests are made
 */
export class TooManyRequestsError extends DomainError {
  constructor(
    message: string = 'Too many requests',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'TOO_MANY_REQUESTS', 429, true, metadata);
  }
}

/**
 * Error thrown for internal server errors that should not be exposed
 */
export class InternalServerError extends DomainError {
  constructor(
    message: string = 'Internal server error',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'INTERNAL_ERROR', 500, false, metadata);
  }
}

/**
 * Error thrown when a service is unavailable
 */
export class ServiceUnavailableError extends DomainError {
  constructor(
    message: string = 'Service unavailable',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'SERVICE_UNAVAILABLE', 503, false, metadata);
  }
}

/**
 * Error thrown when a request times out
 */
export class TimeoutError extends DomainError {
  constructor(
    message: string = 'Request timeout',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT', 408, true, metadata);
  }
}

/**
 * Error thrown when a PDF generation fails
 */
export class PdfGenerationError extends DomainError {
  constructor(
    message: string = 'Failed to generate PDF',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'PDF_GENERATION_ERROR', 500, false, metadata);
  }
}

/**
 * Error thrown when template is invalid
 */
export class InvalidTemplateError extends DomainError {
  constructor(
    message: string = 'Invalid template',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'INVALID_TEMPLATE', 400, true, metadata);
  }
}

/**
 * A stack focus was requested from a document that has no relation graph.
 *
 * Narrowing a résumé works by tagging roles and bullets with technologies and
 * walking that graph, and a fixed document has none. So the answer cannot be the
 * generic résumé: it would carry a filename promising "React + Node" while the
 * content is the generic one, which is the one place a reader has no way to
 * notice.
 */
export class InvalidStackForFixedSourceError extends DomainError {
  constructor(
    stack: string,
    message: string = `The fixed resume has no stack variants, so "${stack}" cannot be applied to it`,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'INVALID_STACK_FOR_FIXED_SOURCE', 400, true, { stack, ...metadata });
  }
}

/**
 * Error thrown when locale is invalid
 */
export class InvalidLocaleError extends DomainError {
  constructor(
    message: string = 'Invalid locale',
    metadata?: Record<string, unknown>
  ) {
    super(message, 'INVALID_LOCALE', 400, true, metadata);
  }
}
