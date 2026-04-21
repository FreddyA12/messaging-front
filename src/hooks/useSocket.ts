import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket, subscribe } from '../lib/socket'
import { useChatStore } from '../store/chatStore'
import type { Message } from '../store/chatStore'
import type { StompSubscription } from '@stomp/stompjs'

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

  useEffect(() => {
    if (!chatId) return
    let sub: StompSubscription | null = null

    connectSocket()
      .then(() => {
        sub = subscribe(`/topic/chat.${chatId}`, (body) => {
          const msg = body as Message
          addMessage(msg)
        })
      })
      .catch(console.error)

    return () => {
      sub?.unsubscribe()
    }
  }, [chatId, addMessage])
}
