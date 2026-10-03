import { api } from '@/services/api';

export const profileApi = {
  get: api.profile,
  update: api.updateProfile,
};
