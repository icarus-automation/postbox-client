import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, isNotFound, isUnauthorized } from './api-error';

describe('apiErrorMessage', () => {
  it('reads the message out of the Nest error envelope', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: { statusCode: 404, message: 'Lead not found', error: 'Not Found' },
    });

    expect(apiErrorMessage(error, 'fallback')).toBe('Lead not found');
  });

  it('joins the array the API sends for validation failures', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { message: ['property extra should not exist', 'sourceUrl must be a URL address'] },
    });

    expect(apiErrorMessage(error, 'fallback')).toBe(
      'property extra should not exist. sourceUrl must be a URL address',
    );
  });

  it('reads the Better Auth shape, which has no statusCode', () => {
    const error = new HttpErrorResponse({
      status: 401,
      error: { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
    });

    expect(apiErrorMessage(error, 'fallback')).toBe('Invalid email or password');
  });

  it('explains a request that never reached the API', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 0 }), 'fallback')).toContain(
      'Cannot reach the API',
    );
  });

  it('falls back when the body is not a shape it knows', () => {
    const error = new HttpErrorResponse({ status: 500, error: '<html>502</html>' });

    expect(apiErrorMessage(error, 'fallback')).toBe('fallback');
  });

  it('falls back for anything that is not an HTTP failure', () => {
    expect(apiErrorMessage(new TypeError('boom'), 'fallback')).toBe('fallback');
  });
});

describe('status helpers', () => {
  it('recognises 401 and 404 and nothing else', () => {
    expect(isUnauthorized(new HttpErrorResponse({ status: 401 }))).toBe(true);
    expect(isUnauthorized(new HttpErrorResponse({ status: 403 }))).toBe(false);
    expect(isNotFound(new HttpErrorResponse({ status: 404 }))).toBe(true);
    expect(isNotFound(new HttpErrorResponse({ status: 500 }))).toBe(false);
    expect(isNotFound('not an error')).toBe(false);
  });
});
