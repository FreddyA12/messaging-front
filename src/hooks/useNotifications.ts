import { useEffect } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'

/**
 * Requests Notification permission on mount and shows browser notifications
 * when a new message arrives while the tab is not focused.
 */
export function useNotifications() {
  const currentUser = useAuthStore((s) => s.user)
  const messages = useChatStore((s) => s.messages)
  const chats = useChatStore((s) => s.chats)
  const activeChatId = useChatStore((s) => s.activeChatId)

  // Request permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Watch for new messages and notify if tab is not focused
  useEffect(() => {
    if (!currentUser || !('Notification' in window) || Notification.permission !== 'granted') return
    if (document.hasFocus()) return

    // Get the most recent message across all chats
    let latestMsg: { id: number; senderName: string; content: string | null; chatId: number } | null = null
    let latestTime = 0

    for (const [chatIdStr, msgs] of Object.entries(messages)) {
      const chatId = Number(chatIdStr)
      const last = msgs[msgs.length - 1]
      if (!last) continue
      if (last.senderId === currentUser.id) continue
      // Only notify for chats other than the currently active one
      if (chatId === activeChatId) continue
      const t = new Date(last.createdAt).getTime()
      if (t > latestTime) {
        latestTime = t
        latestMsg = { id: last.id, senderName: last.senderName, content: last.content, chatId }
      }
    }

    if (!latestMsg) return
    const chat = chats.find((c) => c.id === latestMsg!.chatId)
    const title = chat ? chat.name : latestMsg.senderName
    const body = latestMsg.content ?? '📎 Archivo adjunto'

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `msg-${latestMsg.id}`,
      silent: false,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])
}
