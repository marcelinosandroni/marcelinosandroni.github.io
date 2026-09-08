/**
 * Base error class for domain-specific errors
 * All custom errors should extend this class
 */
export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.metadata = metadata;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a safe error message for client consumption
   */
  public getClientMessage(): string {
    if (!this.isOperational) {
      return "An unexpected error occurred";
    }
    return this.message;
  }

  /**
   * Converts error to JSON representation for logging
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}
