import type { AuthenticatedUser } from './middleware/authenticate.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      authUser?: AuthenticatedUser;
      /** Which of the two simultaneous sessions this request acts as. */
      account?: 'traveler' | 'partner';
      sessionToken?: string;
      sessionTokenHash?: string;
      validatedQuery?: unknown;
    }
  }
}

export {};
