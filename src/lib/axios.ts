import axios, { isAxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh token on 401
let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const { refreshToken, updateAccessToken, clearAuth } = useAuthStore.getState()

    if (!refreshToken) {
      clearAuth()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`
          resolve(api(original))
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        '/api/auth/refresh',
        { refreshToken },
      )

      updateAccessToken(data.accessToken)
      pendingRequests.forEach((cb) => cb(data.accessToken))
      pendingRequests = []

      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch (refreshError) {
      // Only force logout when the server explicitly rejects the refresh token (401).
      // Network errors or 5xx (server restarting) should not log the user out.
      if (isAxiosError(refreshError) && refreshError.response?.status === 401) {
        clearAuth()
      }
      pendingRequests = []
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)
