import { api } from '../../lib/axios'
import { useEncryptionStore } from '../../store/encryptionStore'
import { safeDecrypt } from '../../lib/afin'
import type { ChatDTO, GroupMemberDTO, MessageDTO, SendMessageRequest } from '../../types/chat'

function decryptMessage(msg: MessageDTO): MessageDTO {
  const { a, b } = useEncryptionStore.getState()
  if (a === null || b === null || !msg.content) return msg
  return { ...msg, content: safeDecrypt(msg.content, a, b) }
}

export interface ForwardRequest {
  chatIds: number[]
}

export interface CreateGroupRequest {
  name: string
  description?: string
  memberIds?: number[]
}

export const chatApi = {
  getChats: () =>
    api.get<ChatDTO[]>('/api/chats').then((r) => r.data),

  createPrivateChat: (userId: number) =>
    api.post<ChatDTO>('/api/chats', { userId }).then((r) => r.data),

  getMessages: (chatId: number, cursor?: string, limit = 50) =>
    api
      .get<MessageDTO[]>(`/api/chats/${chatId}/messages`, { params: { cursor, limit } })
      .then((r) => r.data.map(decryptMessage)),

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

  setMessageTtl: (id: number, ttlSeconds: number) =>
    api.patch(`/api/messages/${id}/ttl`, null, { params: { ttlSeconds } }),

  getPinnedMessages: (chatId: number) =>
    api.get<MessageDTO[]>(`/api/chats/${chatId}/pinned`).then((r) => r.data),

  getStarredMessages: () =>
    api.get<MessageDTO[]>('/api/messages/starred').then((r) => r.data),

  searchMessages: (chatId: number, q: string) =>
    api.get<MessageDTO[]>(`/api/chats/${chatId}/messages/search`, { params: { q } }).then((r) => r.data),

  // Groups
  createGroup: (data: CreateGroupRequest) =>
    api.post<ChatDTO>('/api/chats/groups', data).then((r) => r.data),

  getGroupMembers: (chatId: number) =>
    api.get<GroupMemberDTO[]>(`/api/chats/${chatId}/members`).then((r) => r.data),

  addGroupMembers: (chatId: number, userIds: number[]) =>
    api.post(`/api/chats/${chatId}/members`, { userIds }),

  removeGroupMember: (chatId: number, userId: number) =>
    api.delete(`/api/chats/${chatId}/members/${userId}`),

  changeGroupMemberRole: (chatId: number, userId: number, role: 'ADMIN' | 'MEMBER') =>
    api.patch(`/api/chats/${chatId}/members/${userId}/role`, { role }),

  generateInviteLink: (chatId: number) =>
    api.post<{ code: string; link: string }>(`/api/chats/${chatId}/invite-link`).then((r) => r.data),

  joinByCode: (code: string) =>
    api.post<ChatDTO>(`/api/chats/join/${code}`).then((r) => r.data),

  leaveGroup: (chatId: number) =>
    api.delete(`/api/chats/${chatId}`),

  muteChat: (chatId: number, minutes: number) =>
    api.patch(`/api/chats/${chatId}/mute`, null, { params: { minutes } }),

  unmuteChat: (chatId: number) =>
    api.delete(`/api/chats/${chatId}/mute`),

  exportChat: (chatId: number) =>
    api.get(`/api/chats/${chatId}/export`, { responseType: 'blob' }).then((r) => r.data as Blob),
}
