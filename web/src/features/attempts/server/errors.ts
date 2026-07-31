/**
 * Request-level errors for the attempts API.
 *
 * Auth and permission errors live in `auth.ts`; this file covers malformed
 * input that should surface as a 400 rather than a silent fallback.
 */
export class AttemptsBadRequestError extends Error {
  constructor(message = 'The request could not be understood.') {
    super(message);
    this.name = 'AttemptsBadRequestError';
  }
}
