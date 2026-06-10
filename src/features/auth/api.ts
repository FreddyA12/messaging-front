import { api } from '../../lib/axios'
import type { AuthResponse, LoginRequest, RegisterRequest } from '../../types/auth'
import { encryptTransit } from '../../lib/transitEncryption'

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/api/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/api/auth/register', data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/api/auth/refresh', { refreshToken: encryptTransit(refreshToken) }).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post('/api/auth/logout', { refreshToken: encryptTransit(refreshToken) }),
}
