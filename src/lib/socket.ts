import { Client, IFrame, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuthStore } from '../store/authStore'

// ─── Subscription registry ────────────────────────────────────────────────────
// Each entry keeps both the user callback and the live STOMP handle.
// On every (re)connect we re-create the STOMP handle so subscriptions survive
// server restarts and network drops.

type MsgCallback = (body: unknown) => void

interface SubEntry {
  destination: string
  callback: MsgCallback
  stomp: StompSubscription | null
}

const registry: SubEntry[] = []

function attachEntry(entry: SubEntry, client: Client) {
  entry.stomp = client.subscribe(entry.destination, (msg) => {
    try { entry.callback(JSON.parse(msg.body)) } catch { entry.callback(msg.body) }
  })
}

// ─── Reconnect callbacks ──────────────────────────────────────────────────────
type ConnectCallback = () => void
const onConnectCallbacks: ConnectCallback[] = []

export function onSocketConnect(cb: ConnectCallback): () => void {
  onConnectCallbacks.push(cb)
  return () => {
    const i = onConnectCallbacks.indexOf(cb)
    if (i >= 0) onConnectCallbacks.splice(i, 1)
  }
}

// ─── Client singleton ─────────────────────────────────────────────────────────

let stompClient: Client | null = null
let connectingPromise: Promise<void> | null = null

export function getStompClient(): Client {
  if (!stompClient) {
    stompClient = new Client({
      webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
      connectHeaders: {},
      beforeConnect: async () => {
        const token = useAuthStore.getState().accessToken ?? ''
        stompClient!.connectHeaders = { Authorization: `Bearer ${token}` }
      },
      reconnectDelay: 3000,
      heartbeatOutgoing: 20000,
      heartbeatIncoming: 20000,
      onStompError: (frame: IFrame) => {
        console.error('STOMP error', frame)
      },
      onConnect: () => {
        connectingPromise = null
        // Re-attach all registered subscriptions after every (re)connect
        for (const entry of registry) {
          entry.stomp?.unsubscribe()
          attachEntry(entry, stompClient!)
        }
        // Notify listeners (e.g. to refetch chats)
        onConnectCallbacks.forEach((cb) => cb())
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
    const prev = client.onConnect
    client.onConnect = (frame) => {
      prev?.call(client, frame)
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
  registry.length = 0
}

// Returns an object with unsubscribe() — always non-null.
export function subscribe(destination: string, callback: MsgCallback): { unsubscribe: () => void } {
  const entry: SubEntry = { destination, callback, stomp: null }

  const client = getStompClient()
  if (client.connected) {
    attachEntry(entry, client)
  }
  registry.push(entry)

  return {
    unsubscribe: () => {
      entry.stomp?.unsubscribe()
      const i = registry.indexOf(entry)
      if (i >= 0) registry.splice(i, 1)
    },
  }
}

export async function publish(destination: string, body: unknown): Promise<void> {
  await connectSocket()
  const client = getStompClient()
  client.publish({ destination, body: JSON.stringify(body) })
}
