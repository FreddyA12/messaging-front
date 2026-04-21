import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket, subscribe, publish } from '../lib/socket'
import { useChatStore } from '../store/chatStore'
import type { StompSubscription } from '@stomp/stompjs'
import type {
  ChatSocketEvent,
  UserOnlineEvent,
  UserOfflineEvent,
  MessageDeliveredEvent,
  TypingStartEvent,
  TypingStopEvent,
  MessageReadEvent,
  MessagePinnedEvent,
} from '../types/chat'

export function useSocket() {
  const connected = useRef(false)
  const setPresence = useChatStore((s) => s.setPresence)
  const markDelivered = useChatStore((s) => s.markDelivered)

  useEffect(() => {
    let presenceSub: StompSubscription | null = null
    let deliverySub: StompSubscription | null = null

    connectSocket()
      .then(() => {
        connected.current = true

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
      })
      .catch((err) => console.error('Socket connection failed:', err))

    return () => {
      presenceSub?.unsubscribe()
      deliverySub?.unsubscribe()
      disconnectSocket()
      connected.current = false
    }
  }, [setPresence, markDelivered])
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

  useEffect(() => {
    if (!chatId) return
    let mainSub: StompSubscription | null = null
    let typingSub: StompSubscription | null = null
    let readSub: StompSubscription | null = null

    connectSocket()
      .then(() => {
        mainSub = subscribe(`/topic/chat.${chatId}`, (body) => {
          const event = body as ChatSocketEvent
          switch (event.type) {
            case 'MESSAGE_NEW':
              addMessage(event.payload)
              updateLastMessage(event.payload.chatId, event.payload.content, event.payload.createdAt)
              break
            case 'MESSAGE_EDITED':
              editMessage(event.payload.messageId, event.payload.newContent, event.payload.editedAt)
              break
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
  }, [chatId, addMessage, updateLastMessage, editMessage, deleteMessage, addReaction, removeReaction, markRead, setTyping, setPinned])
}

export function publishTypingStart(chatId: number, userId: number, userName: string): void {
  publish('/app/chat.typing.start', { chatId, userId, userName })
}

export function publishTypingStop(chatId: number, userId: number): void {
  publish('/app/chat.typing.stop', { chatId, userId })
}
