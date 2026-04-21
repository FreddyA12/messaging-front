import { create } from 'zustand'
import type { MessageType, ReactionGroup } from '../types/chat'

export interface ChatListItem {
  id: number
  type: 'PRIVATE' | 'GROUP'
  name: string
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  otherUserId?: number
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

  setChats: (chats: ChatListItem[]) => void
  setActiveChat: (chatId: number | null) => void
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

  setChats: (chats) => set({ chats }),
  setActiveChat: (chatId) => set({ activeChatId: chatId }),
  setMessages: (chatId, messages) =>
    set((s) => ({ messages: { ...s.messages, [chatId]: messages } })),
  addMessage: (message) =>
    set((s) => {
      const existing = s.messages[message.chatId] ?? []
      return { messages: { ...s.messages, [message.chatId]: [...existing, message] } }
    }),
  prependMessages: (chatId, messages) =>
    set((s) => {
      const existing = s.messages[chatId] ?? []
      return { messages: { ...s.messages, [chatId]: [...messages, ...existing] } }
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
}))
