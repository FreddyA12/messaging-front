import { Client, IFrame, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/authStore'

let stompClient: Client | null = null
let connectingPromise: Promise<void> | null = null

export function getStompClient(): Client {
  if (!stompClient) {
    stompClient = new Client({
      webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken ?? ''}`,
      },
      reconnectDelay: 3000,
      onStompError: (frame: IFrame) => {
        console.error('STOMP error', frame)
      },
    })
  }
  return stompClient
}

export function connectSocket(): Promise<void> {
  const client = getStompClient()
  if (client.connected) return Promise.resolve()
  if (connectingPromise) return connectingPromise

  connectingPromise = new Promise((resolve, reject) => {
    client.onConnect = () => {
      connectingPromise = null
      resolve()
    }
    client.onStompError = (frame) => {
      connectingPromise = null
      reject(new Error(frame.headers.message))
    }
    client.activate()
  })
  return connectingPromise
}

export function disconnectSocket(): void {
  stompClient?.deactivate()
  stompClient = null
  connectingPromise = null
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

export async function publish(destination: string, body: unknown): Promise<void> {
  await connectSocket()
  const client = getStompClient()
  client.publish({ destination, body: JSON.stringify(body) })
}
