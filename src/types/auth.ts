export interface AuthUser {
  id: number
  email: string
  name: string
  statusText: string | null
  avatarUrl: string | null
  isOnline: boolean
  lastSeen: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}
