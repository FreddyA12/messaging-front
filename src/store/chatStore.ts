import { create } from 'zustand'
import type { MessageType, ReactionGroup, AttachmentDTO, LinkPreviewDTO, PollDTO } from '../types/chat'

export interface ChatListItem {
  id: number
  type: 'PRIVATE' | 'GROUP'
  name: string
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  otherUserId?: number
  isArchived?: boolean
  isPinned?: boolean
  isRestricted?: boolean
}

export interface Message {
  id: number
  chatId: number
  senderId: number
  senderName: string
  content: string | null
  type: MessageType
  createdAt: string
  editedAt: string | null
  deletedForEveryone: boolean
  replyTo: Message | null
  isForwarded: boolean
  reactions: ReactionGroup[]
  readBy: number[]
  deliveredTo: number[]
  isPinned: boolean
  isStarred: boolean
  attachments: AttachmentDTO[]
  linkPreviews: LinkPreviewDTO[]
  expiresAt: string | null
  viewOnce: boolean
  viewedByMe: boolean
  poll?: PollDTO
}

interface PresenceEntry {
  isOnline: boolean
  lastSeen: string | null
}

interface TypingEntry {
  userId: number
  userName: string
}

interface ChatState {
  chats: ChatListItem[]
  activeChatId: number | null
  messages: Record<number, Message[]>
  presence: Record<number, PresenceEntry>
  typing: Record<number, TypingEntry[]>
  replyTo: Message | null
  editingMessage: Message | null
  pinnedMessages: Record<number, Message[]>
  starredMessages: Message[]

  setChats: (chats: ChatListItem[]) => void
  setActiveChat: (chatId: number | null) => void
  incrementUnread: (chatId: number) => void
  clearUnread: (chatId: number) => void
  setMessages: (chatId: number, messages: Message[]) => void
  addMessage: (message: Message) => void
  prependMessages: (chatId: number, messages: Message[]) => void
  updateLastMessage: (chatId: number, content: string | null, at: string) => void
  editMessage: (messageId: number, newContent: string, editedAt: string) => void
  deleteMessage: (messageId: number, forEveryone: boolean) => void
  addReaction: (messageId: number, userId: number, emoji: string) => void
  removeReaction: (messageId: number, userId: number, emoji: string) => void
  markDelivered: (messageId: number, userId: number) => void
  markRead: (messageId: number, userId: number) => void
  setPresence: (userId: number, isOnline: boolean, lastSeen?: string) => void
  setTyping: (chatId: number, userId: number, userName: string, isTyping: boolean) => void
  setReplyTo: (message: Message | null) => void
  setEditingMessage: (message: Message | null) => void
  setPinnedMessages: (chatId: number, messages: Message[]) => void
  setPinned: (messageId: number, chatId: number, isPinned: boolean) => void
  setStarredMessages: (messages: Message[]) => void
  toggleStarred: (messageId: number, isStarred: boolean) => void
  removeMessage: (messageId: number) => void
  markViewedOnce: (messageId: number) => void
  updateMessagePoll: (messageId: number, poll: PollDTO) => void
  setChatArchived: (chatId: number, isArchived: boolean) => void
  setChatPinned: (chatId: number, isPinned: boolean) => void
  removeChat: (chatId: number) => void
  markChatUnread: (chatId: number) => void
}

function mapAllMessages(
  messages: Record<number, Message[]>,
  updater: (m: Message) => Message,
): Record<number, Message[]> {
  const result: Record<number, Message[]> = {}
  for (const [cId, msgs] of Object.entries(messages)) {
    result[Number(cId)] = msgs.map(updater)
  }
  return result
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messages: {},
  presence: {},
  typing: {},
  replyTo: null,
  editingMessage: null,
  pinnedMessages: {},
  starredMessages: [],

  setChats: (chats) => set({ chats }),
  setActiveChat: (chatId) =>
    set((s) => ({
      activeChatId: chatId,
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
    })),
  incrementUnread: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: c.unreadCount + 1 } : c,
      ),
    })),
  clearUnread: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)),
    })),
  setMessages: (chatId, incoming) =>
    set((s) => {
      const existing = s.messages[chatId]
      if (!existing || existing.length === 0) {
        return { messages: { ...s.messages, [chatId]: incoming } }
      }
      const incomingIds = new Set(incoming.map((m) => m.id))
      const prevById = new Map(existing.map((m) => [m.id, m]))
      const merged = incoming.map((m) => {
        const prev = prevById.get(m.id)
        if (!prev) return m
        // Keep any readBy/deliveredTo entries from the local store that the server
        // hasn't persisted yet (sent via WS before DB commit).
        const readBy = prev.readBy.length > m.readBy.length
          ? [...new Set([...prev.readBy, ...m.readBy])]
          : m.readBy
        const deliveredTo = prev.deliveredTo.length > m.deliveredTo.length
          ? [...new Set([...prev.deliveredTo, ...m.deliveredTo])]
          : m.deliveredTo
        return readBy === m.readBy && deliveredTo === m.deliveredTo
          ? m
          : { ...m, readBy, deliveredTo }
      })
      // Preserve messages in the store that the API didn't return:
      // WS-added messages that raced with an in-flight API request, or
      // scroll-loaded older messages outside the current page window.
      const extraMsgs = existing.filter((m) => !incomingIds.has(m.id))
      if (extraMsgs.length === 0) {
        return { messages: { ...s.messages, [chatId]: merged } }
      }
      const combined = [...merged, ...extraMsgs]
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return { messages: { ...s.messages, [chatId]: combined } }
    }),
  addMessage: (message) =>
    set((s) => {
      const existing = s.messages[message.chatId] ?? []
      return { messages: { ...s.messages, [message.chatId]: [message, ...existing] } }
    }),
  prependMessages: (chatId, messages) =>
    set((s) => {
      const existing = s.messages[chatId] ?? []
      return { messages: { ...s.messages, [chatId]: [...existing, ...messages] } }
    }),
  updateLastMessage: (chatId, content, at) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, lastMessage: content, lastMessageAt: at } : c,
      ),
    })),
  editMessage: (messageId, newContent, editedAt) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) =>
        m.id === messageId ? { ...m, content: newContent, editedAt } : m,
      ),
    })),
  deleteMessage: (messageId, forEveryone) =>
    set((s) => {
      const result: Record<number, Message[]> = {}
      for (const [cId, msgs] of Object.entries(s.messages)) {
        result[Number(cId)] = forEveryone
          ? msgs.map((m) => m.id === messageId ? { ...m, deletedForEveryone: true, content: null } : m)
          : msgs.filter((m) => m.id !== messageId)
      }
      return { messages: result }
    }),
  addReaction: (messageId, userId, emoji) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) => {
        if (m.id !== messageId) return m
        const existing = m.reactions.find((r) => r.emoji === emoji)
        if (existing) {
          return {
            ...m,
            reactions: m.reactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count + 1, userIds: [...r.userIds, userId] }
                : r,
            ),
          }
        }
        return { ...m, reactions: [...m.reactions, { emoji, count: 1, userIds: [userId] }] }
      }),
    })),
  removeReaction: (messageId, userId, emoji) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) => {
        if (m.id !== messageId) return m
        return {
          ...m,
          reactions: m.reactions
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== userId) }
                : r,
            )
            .filter((r) => r.count > 0),
        }
      }),
    })),
  markDelivered: (messageId, userId) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) =>
        m.id === messageId && !m.deliveredTo.includes(userId)
          ? { ...m, deliveredTo: [...m.deliveredTo, userId] }
          : m,
      ),
    })),
  markRead: (messageId, userId) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) =>
        m.id === messageId && !m.readBy.includes(userId)
          ? { ...m, readBy: [...m.readBy, userId] }
          : m,
      ),
    })),
  setPresence: (userId, isOnline, lastSeen) =>
    set((s) => ({
      presence: { ...s.presence, [userId]: { isOnline, lastSeen: lastSeen ?? null } },
    })),
  setTyping: (chatId, userId, userName, isTyping) =>
    set((s) => {
      const current = s.typing[chatId] ?? []
      const filtered = current.filter((t) => t.userId !== userId)
      const updated = isTyping ? [...filtered, { userId, userName }] : filtered
      return { typing: { ...s.typing, [chatId]: updated } }
    }),
  setReplyTo: (message) => set({ replyTo: message }),
  setEditingMessage: (message) => set({ editingMessage: message }),
  setPinnedMessages: (chatId, messages) =>
    set((s) => ({ pinnedMessages: { ...s.pinnedMessages, [chatId]: messages } })),
  setPinned: (messageId, chatId, isPinned) =>
    set((s) => {
      const current = s.pinnedMessages[chatId] ?? []
      const updated = isPinned
        ? [...current.filter((m) => m.id !== messageId), ...(
            Object.values(s.messages).flat().filter((m) => m.id === messageId)
          )]
        : current.filter((m) => m.id !== messageId)
      return {
        pinnedMessages: { ...s.pinnedMessages, [chatId]: updated },
        messages: mapAllMessages(s.messages, (m) =>
          m.id === messageId ? { ...m, isPinned } : m,
        ),
      }
    }),
  setStarredMessages: (messages) => set({ starredMessages: messages }),
  toggleStarred: (messageId, isStarred) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) =>
        m.id === messageId ? { ...m, isStarred } : m,
      ),
      starredMessages: isStarred
        ? s.starredMessages
        : s.starredMessages.filter((m) => m.id !== messageId),
    })),
  removeMessage: (messageId) =>
    set((s) => {
      const result: Record<number, Message[]> = {}
      for (const [cId, msgs] of Object.entries(s.messages)) {
        result[Number(cId)] = msgs.filter((m) => m.id !== messageId)
      }
      return { messages: result }
    }),
  markViewedOnce: (messageId) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) =>
        m.id === messageId ? { ...m, viewedByMe: true } : m,
      ),
    })),
  updateMessagePoll: (messageId, poll) =>
    set((s) => ({
      messages: mapAllMessages(s.messages, (m) =>
        m.id === messageId ? { ...m, poll } : m,
      ),
    })),
  setChatArchived: (chatId, isArchived) =>
    set((s) => ({
      chats: s.chats.map((c) => c.id === chatId ? { ...c, isArchived } : c),
    })),
  setChatPinned: (chatId, isPinned) =>
    set((s) => ({
      chats: s.chats.map((c) => c.id === chatId ? { ...c, isPinned } : c),
    })),
  removeChat: (chatId) =>
    set((s) => {
      const { [chatId]: _dropped, ...remainingMessages } = s.messages
      return {
        chats: s.chats.filter((c) => c.id !== chatId),
        activeChatId: s.activeChatId === chatId ? null : s.activeChatId,
        messages: remainingMessages,
      }
    }),
  markChatUnread: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: Math.max(c.unreadCount, 1) } : c,
      ),
    })),
}))
