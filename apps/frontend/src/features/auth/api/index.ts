import { api } from '@/services/api';

export const authApi = {
  me: api.me,
  login: api.login,
  register: api.register,
  logout: api.logout,
};
