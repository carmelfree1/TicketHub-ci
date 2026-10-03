import type { AuthenticatedUser } from '../../middleware/authenticate.js';

export type PublicProfile = AuthenticatedUser;
export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
}
