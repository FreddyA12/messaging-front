import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  id: number
  email: string
  name: string
  statusText: string | null
  avatarUrl: string | null
  isOnline: boolean
  lastSeen: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  updateAccessToken: (accessToken: string) => void
  updateTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      updateAccessToken: (accessToken) =>
        set({ accessToken }),

      updateTokens: (accessToken: string, refreshToken: string) =>
        set({ accessToken, refreshToken }),

      clearAuth: () => {
        import('./encryptionStore').then(({ useEncryptionStore }) => {
          useEncryptionStore.getState().clearKey()
        })
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          import('./encryptionStore').then(({ useEncryptionStore }) => {
            import('../lib/afin').then(({ deriveKey }) => {
              const { a, b } = deriveKey(state.user!.id)
              useEncryptionStore.getState().setKey(a, b)
            })
          })
        }
      },
    },
  ),
)
