import { useAuthStore } from '../store/authStore'
import { authApi } from '../features/auth/api'

export function useAuth() {
  const { user, isAuthenticated, clearAuth } = useAuthStore()

  const logout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {})
    }
    clearAuth()
  }

  return { user, isAuthenticated, logout }
}
