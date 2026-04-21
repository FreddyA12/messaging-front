import { Client, IFrame, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/authStore'

let stompClient: Client | null = null

export function getStompClient(): Client {
  if (!stompClient) {
    stompClient = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/ws`),
      connectHeaders: () => ({
        Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}`,
      }),
      reconnectDelay: 3000,
      onStompError: (frame: IFrame) => {
        console.error('STOMP error', frame)
      },
    })
  }
  return stompClient
}

export function connectSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = getStompClient()
    if (client.connected) {
      resolve()
      return
    }
    client.onConnect = () => resolve()
    client.onStompError = (frame) => reject(new Error(frame.headers.message))
    client.activate()
  })
}

export function disconnectSocket(): void {
  stompClient?.deactivate()
  stompClient = null
}

export function subscribe(destination: string, callback: (body: unknown) => void): StompSubscription | null {
  const client = getStompClient()
  if (!client.connected) return null
  return client.subscribe(destination, (message) => {
    try {
      callback(JSON.parse(message.body))
    } catch {
      callback(message.body)
    }
  })
}

export function publish(destination: string, body: unknown): void {
  const client = getStompClient()
  if (!client.connected) {
    console.warn('STOMP not connected, dropping message to', destination)
    return
  }
  client.publish({ destination, body: JSON.stringify(body) })
}
