import { api } from '@/services/api';

export const authApi = {
  me: api.me,
  login: api.login,
  loginMfa: api.loginMfa,
  mfaSetup: api.mfaSetup,
  mfaEnable: api.mfaEnable,
  mfaDisable: api.mfaDisable,
  register: api.register,
  logout: api.logout,
};
