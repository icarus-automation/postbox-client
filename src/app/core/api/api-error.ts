import { HttpErrorResponse } from '@angular/common/http';

/**
 * The API reports failures in two shapes. Most routes use the Nest envelope
 * (`{ statusCode, message, error, path, timestamp }`, where `message` is a string
 * or an array of validation strings). Better Auth routes answer with their own
 * (`{ message, code }`). Flatten both into one line worth showing a person.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  // Status 0 means the request never reached the API: it is down, the base URL is
  // wrong, or this origin is missing from CORS_ALLOWED_ORIGINS.
  if (error.status === 0) {
    return 'Cannot reach the API. Check that it is running and that this origin is allowed.';
  }

  const body = error.error as { message?: unknown } | null;
  const message = body?.message;

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (Array.isArray(message)) {
    const lines = message.filter((line): line is string => typeof line === 'string');
    if (lines.length > 0) {
      return lines.join('. ');
    }
  }

  return fallback;
}

/** A thrown Error carries its own sentence. HTTP failures still use the API body. */
export function shownError(error: unknown, fallback: string): string {
  if (error instanceof Error && !(error instanceof HttpErrorResponse) && error.message.length > 0) {
    return error.message;
  }
  return apiErrorMessage(error, fallback);
}

/** True when the API turned the request down for want of a valid session. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 401;
}

/** True when the record does not exist inside the active organization. */
export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
