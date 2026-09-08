# Global Error Handler System

This document describes the global error handling system implemented in this Next.js API.

## Overview

The error handling system provides a cohesive, abstracted approach to managing errors across the API, following senior-level best practices:

- **Detailed logging for developers**: All errors are logged with full details (stack trace, metadata, etc.) for debugging and monitoring
- **Generic messages for users**: Internal errors return safe, non-revealing messages to clients
- **Operational vs Programming errors**: Distinguishes between expected errors (validation, not found) and unexpected internal errors

## Architecture

### 1. Domain Errors (`src/domain/errors/`)

Base error classes that extend the built-in `Error` class with additional metadata:

- **`DomainError`**: Abstract base class with statusCode, code, and operational flag
- **`NotFoundError`** (404): Resource not found
- **`ValidationError`** (400): Validation failures with field details
- **`ForbiddenError`** (403): Access denied
- **`UnauthorizedError`** (401): Authentication required
- **`ConflictError`** (409): Resource conflicts
- **`TooManyRequestsError`** (429): Rate limiting
- **`InternalServerError`** (500): Non-operational internal errors
- **`ServiceUnavailableError`** (503): Service downtime
- **`TimeoutError`** (408): Request timeouts
- **`PdfGenerationError`** (500): PDF-specific errors
- **`InvalidTemplateError`** (400): Invalid template ID
- **`InvalidLocaleError`** (400): Invalid locale parameter

### 2. Error Handler (`src/infrastructure/http/error-handler.ts`)

Centralized error handling utilities:

- **`createErrorResponse(error)`**: Main function that:
  - Logs detailed error information (with stack traces for debugging)
  - Returns appropriate HTTP status codes
  - Provides safe client messages for internal errors
  - Exposes specific messages only for operational errors

- **`isDomainError(error)`**: Type guard to check if error is a DomainError

- **`withErrorHandler(handler)`**: Higher-order function for wrapping handlers (optional)

## Usage

### In API Routes

```typescript
import { createErrorResponse } from '@/infrastructure/http/error-handler';
import { NotFoundError, ValidationError } from '@/domain/errors';

export async function GET(request: NextRequest) {
  try {
    // Your business logic
    const resource = await getResource(id);
    
    if (!resource) {
      throw new NotFoundError('Resource not found', { resourceId: id });
    }
    
    if (!isValid(resource)) {
      throw new ValidationError('Invalid resource format', {
        fields: { name: ['Name is required'] }
      });
    }
    
    return NextResponse.json(resource);
  } catch (error) {
    // Centralized error handling
    return createErrorResponse(error);
  }
}
```

### Creating Custom Domain Errors

```typescript
import { DomainError } from '@/domain/errors/domain-error';

export class CustomBusinessError extends DomainError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 'CUSTOM_ERROR', 400, true, metadata);
  }
}
```

## Error Response Format

### Operational Errors (Client receives specific message)

```json
{
  "error": "Invalid locale: xyz",
  "code": "INVALID_LOCALE",
  "details": {
    "providedLocale": "xyz"
  }
}
```

### Internal Errors (Client receives generic message)

```json
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_ERROR"
}
```

## Logging

All errors are logged with structured data including:

- Timestamp
- Error level (warn for operational, error for internal)
- Error name and message
- Status code and error code
- Stack trace (for debugging)
- Metadata (contextual information)

Example log output:
```json
{
  "timestamp": "2026-09-08T20:00:00.000Z",
  "level": "error",
  "name": "PdfGenerationError",
  "message": "Failed to generate PDF",
  "code": "PDF_GENERATION_ERROR",
  "statusCode": 500,
  "isOperational": false,
  "stack": "Error: Failed to generate PDF\n    at..."
}
```

## Best Practices Implemented

1. **Separation of Concerns**: Error handling is abstracted from business logic
2. **Type Safety**: Full TypeScript support with type guards
3. **Consistent Responses**: All errors follow the same response format
4. **Security**: Internal errors don't leak implementation details
5. **Debuggability**: Full error details are logged server-side
6. **Extensibility**: Easy to add new error types
7. **Operational Awareness**: Distinguishes between expected and unexpected errors
8. **Metadata Support**: Errors can carry contextual information for better debugging

## Future Enhancements

Consider integrating with:
- **Sentry** or similar error tracking services
- **Datadog** or **New Relic** for monitoring
- **Winston** or **Pino** for structured logging
- **Alert systems** for critical errors
