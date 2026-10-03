import type { AuthenticatedUser } from './middleware/authenticate.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      authUser?: AuthenticatedUser;
      sessionToken?: string;
      sessionTokenHash?: string;
      validatedQuery?: unknown;
    }
  }
}

export {};
