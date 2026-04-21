import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket, subscribe } from '../lib/socket'
import { useChatStore } from '../store/chatStore'
import type { StompSubscription } from '@stomp/stompjs'
import type { ChatSocketEvent } from '../types/chat'

export function useSocket() {
  const connected = useRef(false)

  useEffect(() => {
    connectSocket()
      .then(() => { connected.current = true })
      .catch((err) => console.error('Socket connection failed:', err))

    return () => {
      disconnectSocket()
      connected.current = false
    }
  }, [])
}

export function useChatSubscription(chatId: number | null) {
  const addMessage = useChatStore((s) => s.addMessage)
  const updateLastMessage = useChatStore((s) => s.updateLastMessage)

  useEffect(() => {
    if (!chatId) return
    let sub: StompSubscription | null = null

    connectSocket()
      .then(() => {
        sub = subscribe(`/topic/chat.${chatId}`, (body) => {
          const event = body as ChatSocketEvent
          if (event.type === 'MESSAGE_NEW') {
            const msg = event.payload
            addMessage(msg)
            updateLastMessage(msg.chatId, msg.content, msg.createdAt)
          }
        })
      })
      .catch(console.error)

    return () => {
      sub?.unsubscribe()
    }
  }, [chatId, addMessage, updateLastMessage])
}
