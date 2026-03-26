import api from './client';
import type { ApiResponse, User } from '../types';

export const authApi = {
  getMe: () => api.get<ApiResponse<User>>('/auth/me').then((r) => r.data.data),

  refresh: (refreshToken: string) =>
    api
      .post<ApiResponse<{ accessToken: string }>>('/auth/refresh', { refreshToken })
      .then((r) => r.data.data),
};
