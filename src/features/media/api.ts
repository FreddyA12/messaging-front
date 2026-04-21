import { api } from '../../lib/axios'
import type { GalleryItemDTO, LinkItemDTO } from '../../types/chat'

export interface UploadResponse {
  attachmentId: number
  type: string
  filename: string
  mimeType: string
  sizeBytes: number
  thumbnailId?: number
}

export const mediaApi = {
  uploadFile: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<UploadResponse>('/api/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }).then((r) => r.data)
  },

  getGallery: (chatId: number, type: 'IMAGE' | 'VIDEO') =>
    api.get<GalleryItemDTO[]>(`/api/media/chats/${chatId}/gallery`, { params: { type } })
      .then((r) => r.data),

  getDocuments: (chatId: number) =>
    api.get<GalleryItemDTO[]>(`/api/media/chats/${chatId}/documents`).then((r) => r.data),

  getLinks: (chatId: number) =>
    api.get<LinkItemDTO[]>(`/api/media/chats/${chatId}/links`).then((r) => r.data),

  getAudios: (chatId: number) =>
    api.get<GalleryItemDTO[]>(`/api/media/chats/${chatId}/audios`).then((r) => r.data),

  downloadUrl: (attachmentId: number) =>
    `/api/media/attachments/${attachmentId}`,
}
