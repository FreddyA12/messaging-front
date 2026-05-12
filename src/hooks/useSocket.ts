import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket, subscribe, onSocketConnect, publish } from '../lib/socket'
import { useChatStore, type Message } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { safeDecrypt, deriveKey } from '../lib/afin'
import { chatApi } from '../features/chat/api'
import { useQueryClient } from '@tanstack/react-query'
import type {
  ChatSocketEvent,
  UserOnlineEvent,
  UserOfflineEvent,
  MessageDeliveredEvent,
  TypingStartEvent,
  TypingStopEvent,
  MessageReadEvent,
  MessagePinnedEvent,
  MessageDTO,
} from '../types/chat'

function decryptContent(content: string | null | undefined, senderId: number): string | null {
  if (!content) return content ?? null
  const { a, b } = deriveKey(senderId)
  return safeDecrypt(content, a, b)
}

// Convert MessageDTO to Message with proper defaults
function toMessage(dto: MessageDTO): Message {
  return {
    ...dto,
    content: decryptContent(dto.content, dto.senderId),
    isPinned: dto.isPinned ?? false,
    isStarred: dto.isStarred ?? false,
    reactions: dto.reactions ?? [],
    readBy: dto.readBy ?? [],
    deliveredTo: dto.deliveredTo ?? [],
    attachments: dto.attachments ?? [],
    linkPreviews: dto.linkPreviews ?? [],
    replyTo: dto.replyTo ? toMessage(dto.replyTo) : null,
    expiresAt: dto.expiresAt ?? null,
    viewOnce: dto.viewOnce ?? false,
    viewedByMe: dto.viewedByMe ?? false,
  }
}

export function useSocket() {
  const setPresence = useChatStore((s) => s.setPresence)
  const markDelivered = useChatStore((s) => s.markDelivered)
  const queryClient = useQueryClient()

  useEffect(() => {
    let presenceSub: ReturnType<typeof subscribe> | null = null
    let deliverySub: ReturnType<typeof subscribe> | null = null
    let chatEventsSub: ReturnType<typeof subscribe> | null = null

    connectSocket()
      .then(() => {
        presenceSub = subscribe('/topic/presence', (body) => {
          const event = body as UserOnlineEvent | UserOfflineEvent
          if (event.type === 'USER_ONLINE') {
            setPresence(event.payload.userId, true)
          } else if (event.type === 'USER_OFFLINE') {
            setPresence(event.payload.userId, false, event.payload.lastSeen)
          }
        })

        deliverySub = subscribe('/user/queue/messages', (body) => {
          const event = body as MessageDeliveredEvent
          if (event.type === 'MESSAGE_DELIVERED') {
            markDelivered(event.payload.messageId, event.payload.userId)
          }
        })

        // Personal feed: fires for every new message in any chat the user belongs to.
        // Used to detect chats not currently in the store (new or previously deleted).
        // For chats already in the store, /topic/chat.{id} subscriptions handle updates.
        chatEventsSub = subscribe('/user/queue/chat-events', (body) => {
          const event = body as ChatSocketEvent
          if (event.type !== 'MESSAGE_NEW') return

          const { chats } = useChatStore.getState()
          const chatInStore = chats.some((c) => c.id === event.payload.chatId)

          if (!chatInStore) {
            // New or previously-deleted chat — refetch the list so it reappears.
            // Also drop any stale message cache so the ChatWindow fetches fresh.
            queryClient.invalidateQueries({ queryKey: ['chats'] })
            queryClient.removeQueries({ queryKey: ['messages', event.payload.chatId] })
          }
        })
      })
      .catch((err) => console.error('Socket connection failed:', err))

    // On every (re)connect: refetch the chat list so new chats appear
    // and subscriptions in useAllChatsNotifications get re-registered
    const unregister = onSocketConnect(() => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    })

    return () => {
      presenceSub?.unsubscribe()
      deliverySub?.unsubscribe()
      chatEventsSub?.unsubscribe()
      unregister()
      disconnectSocket()
    }
  }, [setPresence, markDelivered, queryClient])
}

export function useChatSubscription(chatId: number | null) {
  const addMessage = useChatStore((s) => s.addMessage)
  const updateLastMessage = useChatStore((s) => s.updateLastMessage)
  const editMessage = useChatStore((s) => s.editMessage)
  const deleteMessage = useChatStore((s) => s.deleteMessage)
  const addReaction = useChatStore((s) => s.addReaction)
  const removeReaction = useChatStore((s) => s.removeReaction)
  const markRead = useChatStore((s) => s.markRead)
  const setTyping = useChatStore((s) => s.setTyping)
  const setPinned = useChatStore((s) => s.setPinned)
  const updateMessagePoll = useChatStore((s) => s.updateMessagePoll)

  useEffect(() => {
    if (!chatId) return
    let mainSub: ReturnType<typeof subscribe> | null = null
    let typingSub: ReturnType<typeof subscribe> | null = null
    let readSub: ReturnType<typeof subscribe> | null = null

    connectSocket()
      .then(() => {
        mainSub = subscribe(`/topic/chat.${chatId}`, (body) => {
          const event = body as ChatSocketEvent
          switch (event.type) {
            case 'MESSAGE_NEW': {
              const newMsg = toMessage(event.payload)
              addMessage(newMsg)
              updateLastMessage(event.payload.chatId, newMsg.content, event.payload.createdAt)
              // Auto-mark as read if the chat is active (message from someone else)
              if (event.payload.senderId !== useAuthStore.getState().user?.id) {
                chatApi.markRead(event.payload.id).catch(() => {})
              }
              break
            }
            case 'MESSAGE_EDITED': {
              const allMsgs = Object.values(useChatStore.getState().messages).flat()
              const sender = allMsgs.find((m) => m.id === event.payload.messageId)
              const decryptedEdit = sender
                ? decryptContent(event.payload.newContent, sender.senderId) ?? ''
                : event.payload.newContent
              editMessage(event.payload.messageId, decryptedEdit, event.payload.editedAt)
              break
            }
            case 'MESSAGE_DELETED':
              deleteMessage(event.payload.messageId, event.payload.forEveryone)
              break
            case 'REACTION_ADDED':
              addReaction(event.payload.messageId, event.payload.userId, event.payload.emoji)
              break
            case 'REACTION_REMOVED':
              removeReaction(event.payload.messageId, event.payload.userId, event.payload.emoji)
              break
            case 'MESSAGE_PINNED': {
              const pinEvent = event as MessagePinnedEvent
              if (chatId) setPinned(pinEvent.payload.messageId, chatId, pinEvent.payload.isPinned)
              break
            }
            case 'POLL_UPDATED':
              updateMessagePoll(event.payload.messageId, event.payload.poll)
              break
          }
        })

        typingSub = subscribe(`/topic/chat.${chatId}.typing`, (body) => {
          const event = body as TypingStartEvent | TypingStopEvent
          if (event.type === 'TYPING_START') {
            setTyping(event.payload.chatId, event.payload.userId, event.payload.userName, true)
          } else if (event.type === 'TYPING_STOP') {
            setTyping(event.payload.chatId, event.payload.userId, '', false)
          }
        })

        readSub = subscribe(`/topic/chat.${chatId}.read`, (body) => {
          const event = body as MessageReadEvent
          if (event.type === 'MESSAGE_READ') {
            markRead(event.payload.messageId, event.payload.userId)
          }
        })
      })
      .catch(console.error)

    return () => {
      mainSub?.unsubscribe()
      typingSub?.unsubscribe()
      readSub?.unsubscribe()
    }
  }, [chatId, addMessage, updateLastMessage, editMessage, deleteMessage, addReaction, removeReaction, markRead, setTyping, setPinned, updateMessagePoll])
}

/**
 * Subscribes to all given chat topics to keep lastMessage and unreadCount
 * updated in real-time for chats that are not currently active.
 */
export function useAllChatsNotifications(chatIds: number[]) {
  const updateLastMessage = useChatStore((s) => s.updateLastMessage)
  const incrementUnread = useChatStore((s) => s.incrementUnread)
  const addMessage = useChatStore((s) => s.addMessage)

  const idsKey = chatIds.slice().sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (chatIds.length === 0) return

    const subs: ReturnType<typeof subscribe>[] = []

    connectSocket()
      .then(() => {
        for (const cid of chatIds) {
          const sub = subscribe(`/topic/chat.${cid}`, (body) => {
            const event = body as ChatSocketEvent
            if (event.type !== 'MESSAGE_NEW') return

            const currentUserId = useAuthStore.getState().user?.id
            const activeChatId = useChatStore.getState().activeChatId

            const decrypted = decryptContent(event.payload.content, event.payload.senderId)
            updateLastMessage(event.payload.chatId, decrypted, event.payload.createdAt)

            // If the chat is not currently open, add the message directly to the store
            // so it appears instantly when the user clicks into it (no reload needed).
            // The active chat is handled by useChatSubscription — skip to avoid duplicates.
            if (event.payload.chatId !== activeChatId) {
              addMessage(toMessage(event.payload))
            }

            if (
              event.payload.senderId !== currentUserId &&
              event.payload.chatId !== activeChatId
            ) {
              incrementUnread(event.payload.chatId)
            }
          })
          subs.push(sub)
        }
      })
      .catch(console.error)

    return () => subs.forEach((s) => s.unsubscribe())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, updateLastMessage, incrementUnread, addMessage])
}

export function publishTypingStart(chatId: number, userId: number, userName: string): void {
  publish('/app/chat.typing.start', { chatId, userId, userName }).catch(() => {})
}

export function publishTypingStop(chatId: number, userId: number): void {
  publish('/app/chat.typing.stop', { chatId, userId }).catch(() => {})
}
