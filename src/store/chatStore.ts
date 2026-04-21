import { create } from 'zustand'

export interface ChatListItem {
  id: number
  type: 'PRIVATE' | 'GROUP'
  name: string
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export interface Message {
  id: number
  chatId: number
  senderId: number
  senderName: string
  content: string | null
  type: string
  createdAt: string
  editedAt: string | null
  deletedForEveryone: boolean
  replyTo: Message | null
  isForwarded: boolean
  reactions: { emoji: string; count: number; userIds: number[] }[]
  readBy: number[]
}

interface ChatState {
  chats: ChatListItem[]
  activeChatId: number | null
  messages: Record<number, Message[]>

  setChats: (chats: ChatListItem[]) => void
  setActiveChat: (chatId: number | null) => void
  setMessages: (chatId: number, messages: Message[]) => void
  addMessage: (message: Message) => void
  prependMessages: (chatId: number, messages: Message[]) => void
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messages: {},

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
}))
