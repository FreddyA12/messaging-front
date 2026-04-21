import { api } from '../../lib/axios'
import type { ChatDTO, MessageDTO, SendMessageRequest } from '../../types/chat'

export interface ForwardRequest {
  chatIds: number[]
}

export const chatApi = {
  getChats: () =>
    api.get<ChatDTO[]>('/api/chats').then((r) => r.data),

  createPrivateChat: (userId: number) =>
    api.post<ChatDTO>('/api/chats', { userId }).then((r) => r.data),

  getMessages: (chatId: number, cursor?: string, limit = 50) =>
    api
      .get<MessageDTO[]>(`/api/chats/${chatId}/messages`, { params: { cursor, limit } })
      .then((r) => r.data),

  sendMessage: (data: SendMessageRequest) =>
    api.post<MessageDTO>('/api/messages', data).then((r) => r.data),

  editMessage: (id: number, content: string) =>
    api.patch<MessageDTO>(`/api/messages/${id}`, { content }).then((r) => r.data),

  deleteMessage: (id: number, forEveryone: boolean) =>
    api.delete(`/api/messages/${id}`, { params: { forEveryone } }),

  markRead: (messageId: number) =>
    api.post(`/api/messages/${messageId}/read`),

  addReaction: (id: number, emoji: string) =>
    api.post(`/api/messages/${id}/reactions`, { emoji }),

  removeReaction: (id: number, emoji: string) =>
    api.delete(`/api/messages/${id}/reactions/${encodeURIComponent(emoji)}`),

  starMessage: (id: number) =>
    api.post(`/api/messages/${id}/star`),

  unstarMessage: (id: number) =>
    api.delete(`/api/messages/${id}/star`),

  pinMessage: (id: number) =>
    api.post(`/api/messages/${id}/pin`),

  unpinMessage: (id: number) =>
    api.delete(`/api/messages/${id}/pin`),

  forwardMessage: (id: number, chatIds: number[]) =>
    api.post(`/api/messages/${id}/forward`, { chatIds }),

  getPinnedMessages: (chatId: number) =>
    api.get<MessageDTO[]>(`/api/chats/${chatId}/pinned`).then((r) => r.data),

  getStarredMessages: () =>
    api.get<MessageDTO[]>('/api/messages/starred').then((r) => r.data),

  searchMessages: (chatId: number, q: string) =>
    api.get<MessageDTO[]>(`/api/chats/${chatId}/messages/search`, { params: { q } }).then((r) => r.data),
}
