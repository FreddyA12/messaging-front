import { useEffect, useRef } from 'react'
import { connectSocket, disconnectSocket, subscribe } from '../lib/socket'
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

  return { subscribe }
}
