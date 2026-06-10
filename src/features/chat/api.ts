import { api } from '../../lib/axios'
import { safeDecrypt, deriveKey, AFFINE_PREFIX } from '../../lib/afin'
import type { ChatDTO, GroupMemberDTO, MessageDTO, PollDTO, SendMessageRequest } from '../../types/chat'

function decryptMessage(msg: MessageDTO): MessageDTO {
  const { a, b } = deriveKey(msg.senderId)
  const decrypted = msg.content
    ? { ...msg, content: safeDecrypt(msg.content, a, b) }
    : msg
  return {
    ...decrypted,
    viewOnce: decrypted.viewOnce ?? false,
    viewedByMe: decrypted.viewedByMe ?? false,
    isPinned: decrypted.isPinned ?? false,
    isStarred: decrypted.isStarred ?? false,
    reactions: decrypted.reactions ?? [],
    readBy: decrypted.readBy ?? [],
    deliveredTo: decrypted.deliveredTo ?? [],
    attachments: decrypted.attachments ?? [],
    linkPreviews: decrypted.linkPreviews ?? [],
    expiresAt: decrypted.expiresAt ?? null,
  }
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
    api.get<ChatDTO[]>('/api/chats').then((r) =>
      r.data.map((chat) => {
        if (!chat.lastMessage) return chat

        if (chat.lastMessageSenderId != null) {
          const { a, b } = deriveKey(chat.lastMessageSenderId)
          return { ...chat, lastMessage: safeDecrypt(chat.lastMessage, a, b) }
        }

        // No senderId available — hide raw ciphertext rather than show garbage
        if (chat.lastMessage.startsWith(AFFINE_PREFIX)) {
          return { ...chat, lastMessage: null }
        }

        return chat
      })
    ),

  createPrivateChat: (userId: number) =>
    api.post<ChatDTO>('/api/chats', { userId }).then((r) => r.data),

  archiveChat: (chatId: number) =>
    api.patch(`/api/chats/${chatId}/archive`),

  unarchiveChat: (chatId: number) =>
    api.delete(`/api/chats/${chatId}/archive`),

  pinChat: (chatId: number) =>
    api.patch(`/api/chats/${chatId}/pin`),

  unpinChat: (chatId: number) =>
    api.delete(`/api/chats/${chatId}/pin`),

  muteChat: (chatId: number, minutes: number) =>
    api.patch(`/api/chats/${chatId}/mute`, null, { params: { minutes } }),

  unmuteChat: (chatId: number) =>
    api.delete(`/api/chats/${chatId}/mute`),

  deleteChat: (chatId: number) =>
    api.delete(`/api/chats/${chatId}`),

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

  markViewedOnce: (id: number) =>
    api.post(`/api/messages/${id}/view-once`).catch(() => {}),

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

  toggleRestricted: (chatId: number) =>
    api.patch<import('../../../types/chat').ChatDTO>(`/api/chats/${chatId}/restrict`).then((r) => r.data),

  exportChat: (chatId: number) =>
    api.get(`/api/chats/${chatId}/export`, { responseType: 'blob' }).then((r) => r.data as Blob),

  getUserById: (id: number) =>
    api.get<{ id: number; isOnline: boolean; lastSeen: string | null }>(`/api/users/${id}`).then((r) => r.data),
}

export const pollsApi = {
  create: (chatId: number, question: string, options: string[], allowsMultiple: boolean) =>
    api.post<MessageDTO>('/api/polls', { chatId, question, options, allowsMultiple }).then((r) => r.data),

  vote: (pollId: number, optionId: number) =>
    api.post<PollDTO>(`/api/polls/${pollId}/vote`, { optionId }).then((r) => r.data),

  removeVote: (pollId: number, optionId: number) =>
    api.delete<PollDTO>(`/api/polls/${pollId}/vote/${optionId}`).then((r) => r.data),
}
