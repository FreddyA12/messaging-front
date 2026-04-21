export interface ChatDTO {
  id: number
  type: 'PRIVATE' | 'GROUP'
  name: string
  avatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  otherUserId?: number
}

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'SYSTEM'

export interface ReactionGroup {
  emoji: string
  count: number
  userIds: number[]
}

export interface MessageDTO {
  id: number
  chatId: number
  senderId: number
  senderName: string
  content: string | null
  type: MessageType
  createdAt: string
  editedAt: string | null
  deletedForEveryone: boolean
  replyTo: MessageDTO | null
  isForwarded: boolean
  reactions: ReactionGroup[]
  readBy: number[]
  deliveredTo: number[]
}

export interface SendMessageRequest {
  chatId: number
  content: string
  type?: string
  replyToId?: number
  attachmentIds?: number[]
}

export interface MessageNewEvent {
  type: 'MESSAGE_NEW'
  payload: MessageDTO
}

export interface MessageEditedEvent {
  type: 'MESSAGE_EDITED'
  payload: { messageId: number; newContent: string; editedAt: string }
}

export interface MessageDeletedEvent {
  type: 'MESSAGE_DELETED'
  payload: { messageId: number; forEveryone: boolean }
}

export interface ReactionAddedEvent {
  type: 'REACTION_ADDED'
  payload: { messageId: number; userId: number; emoji: string }
}

export interface ReactionRemovedEvent {
  type: 'REACTION_REMOVED'
  payload: { messageId: number; userId: number; emoji: string }
}

export interface TypingStartEvent {
  type: 'TYPING_START'
  payload: { chatId: number; userId: number; userName: string }
}

export interface TypingStopEvent {
  type: 'TYPING_STOP'
  payload: { chatId: number; userId: number }
}

export interface UserOnlineEvent {
  type: 'USER_ONLINE'
  payload: { userId: number }
}

export interface UserOfflineEvent {
  type: 'USER_OFFLINE'
  payload: { userId: number; lastSeen: string }
}

export interface MessageDeliveredEvent {
  type: 'MESSAGE_DELIVERED'
  payload: { messageId: number; userId: number; at: string }
}

export interface MessageReadEvent {
  type: 'MESSAGE_READ'
  payload: { messageId: number; userId: number; at: string }
}

export type ChatSocketEvent =
  | MessageNewEvent
  | MessageEditedEvent
  | MessageDeletedEvent
  | ReactionAddedEvent
  | ReactionRemovedEvent
  | TypingStartEvent
  | TypingStopEvent
  | UserOnlineEvent
  | UserOfflineEvent
  | MessageDeliveredEvent
  | MessageReadEvent
