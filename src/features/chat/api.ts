import { api } from '../../lib/axios'
import type { ChatDTO, MessageDTO, SendMessageRequest } from '../../types/chat'

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

  markRead: (messageId: number) =>
    api.post(`/api/messages/${messageId}/read`),
}
