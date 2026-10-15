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
 * A résumé variant that exists in the catalog but has no rendered document.
 *
 * Distinct from `UnknownResumeVariantError` because the two mean different things
 * to a reader, and both are wrong answers in different ways. An unknown slug is a
 * mistake in the URL. A known slug with nothing behind it is a document that has
 * not been produced yet.
 *
 * Neither may be answered with the general résumé. That document is complete and
 * correct, which is exactly the problem: it looks like an answer, and it silently
 * drops the specialisation the reader asked for. So this is a 404 rather than a
 * fallback, and the message carries what there is to choose from.
 */
export class ResumeVariantNotRenderedError extends DomainError {
  constructor(
    slug: string,
    locale: string,
    available: ReadonlyArray<string>,
    message: string = `The "${slug}" resume has not been rendered for ${locale}. Available here: ${available.length > 0 ? available.join(", ") : "none"}.`,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'RESUME_VARIANT_NOT_RENDERED', 404, true, { slug, locale, available, ...metadata });
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
 * A stack slug that names no fixed document.
 *
 * Refused rather than answered with the general résumé, because the reader asked
 * for a specialised one and would otherwise receive a document that never
 * mentions the stack they asked about - which looks correct and says nothing.
 * The known variants travel in the metadata so the response can list them.
 */
export class UnknownResumeVariantError extends DomainError {
  constructor(
    slug: string,
    available: ReadonlyArray<string>,
    message: string = `Unknown resume variant "${slug}". Available: ${available.join(", ")}.`,
    metadata?: Record<string, unknown>
  ) {
    super(message, 'UNKNOWN_RESUME_VARIANT', 400, true, { slug, available, ...metadata });
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
