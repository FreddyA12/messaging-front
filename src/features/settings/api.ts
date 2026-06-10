import { api } from '../../lib/axios'

export interface PreferencesDTO {
  theme: string | null
  fontSize: string | null
  bubbleColor: string | null
  language: string | null
}

export interface UpdatePreferencesRequest {
  theme?: string
  fontSize?: string
  bubbleColor?: string
  language?: string
}

export interface UpdatePrivacyRequest {
  privacyLastSeen?: string
  privacyProfilePic?: string
  privacyReadReceipts?: boolean
}

export interface UpdateProfileRequest {
  name?: string
  statusText?: string
}

export const settingsApi = {
  getPreferences: () =>
    api.get<PreferencesDTO>('/api/settings/preferences').then((r) => r.data),

  updatePreferences: (data: UpdatePreferencesRequest) =>
    api.patch('/api/settings/preferences', data),

  updatePrivacy: (data: UpdatePrivacyRequest) =>
    api.patch('/api/settings/privacy', data),
}

export const userApi = {
  updateProfile: (data: UpdateProfileRequest) =>
    api.patch('/api/users/me', data).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export interface BlockedUserDTO {
  id: number
  name: string
  avatarUrl: string | null
  blockedAt: string
}

export const blockApi = {
  getBlocked: () =>
    api.get<BlockedUserDTO[]>('/api/users/blocked').then((r) => r.data),

  block: (userId: number) =>
    api.post(`/api/users/${userId}/block`),

  unblock: (userId: number) =>
    api.delete(`/api/users/${userId}/block`),

  report: (userId: number, reason: string, description?: string) =>
    api.post(`/api/users/${userId}/report`, { reason, description }),
}
