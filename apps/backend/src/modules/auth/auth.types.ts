export type UserRole = 'traveler' | 'partner';

export interface PublicUser {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface RegisterInput {
  fullName: string;
  phone: string;
  password: string;
  partnerInviteCode?: string;
}

export interface LoginInput {
  phone: string;
  password: string;
}

export type LoginResult =
  | { user: PublicUser; token: string; mfaRequired?: undefined }
  | { mfaRequired: true; challengeToken: string };
