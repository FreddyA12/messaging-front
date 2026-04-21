export interface ChatDTO {
  id: number
  type: 'PRIVATE' | 'GROUP'
  name: string
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

export interface MessageDTO {
  id: number
  chatId: number
  senderId: number
  senderName: string
  content: string | null
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'SYSTEM'
  createdAt: string
  editedAt: string | null
  deletedForEveryone: boolean
  replyTo: MessageDTO | null
  isForwarded: boolean
  reactions: ReactionGroup[]
  readBy: number[]
}

export interface ReactionGroup {
  emoji: string
  count: number
  userIds: number[]
}

export interface SendMessageRequest {
  chatId: number
  content: string
  type?: string
  replyToId?: number
  attachmentIds?: number[]
}

export type ChatSocketEventType =
  | 'MESSAGE_NEW'
  | 'MESSAGE_EDIT'
  | 'MESSAGE_DELETE'
  | 'REACTION_UPDATE'

export interface ChatSocketEvent {
  type: ChatSocketEventType
  payload: MessageDTO
}
