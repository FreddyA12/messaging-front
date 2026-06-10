import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'

/**
 * Requests Notification permission on mount and shows browser notifications
 * when new messages arrive while the tab is not focused.
 *
 * Groups by chat — one notification per chat at most, replaced on each new message.
 * Clicking the notification focuses the window and navigates to that chat.
 */
export function useNotifications() {
  const currentUser = useAuthStore((s) => s.user)
  const messages = useChatStore((s) => s.messages)
  const chats = useChatStore((s) => s.chats)
  const activeChatId = useChatStore((s) => s.activeChatId)
  // Track the most recent message id we've notified about per chat to avoid repeats
  const lastNotifiedId = useRef<Record<number, number>>({})

  // Request permission once on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!currentUser || !('Notification' in window) || Notification.permission !== 'granted') return
    if (document.hasFocus()) return

    for (const [chatIdStr, msgs] of Object.entries(messages)) {
      const chatId = Number(chatIdStr)
      if (chatId === activeChatId) continue
      if (!msgs || msgs.length === 0) continue

      // msgs[0] is the newest (prepend pattern in chatStore)
      const newest = msgs[0]
      if (!newest) continue
      if (newest.senderId === currentUser.id) continue
      if (newest.type === 'SYSTEM') continue
      // Skip if we already notified for this exact message
      if (lastNotifiedId.current[chatId] === newest.id) continue

      lastNotifiedId.current[chatId] = newest.id

      const chat = chats.find((c) => c.id === chatId)
      const chatName = chat?.name ?? newest.senderName

      const isGroup = chat?.type === 'GROUP'
      const body = newest.content
        ? (isGroup ? `${newest.senderName}: ${newest.content}` : newest.content)
        : (isGroup ? `${newest.senderName}: 📎 Archivo adjunto` : '📎 Archivo adjunto')

      const unread = chat?.unreadCount ?? 1
      const title = unread > 1
        ? `${chatName} (${unread} mensajes nuevos)`
        : chatName

      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        // Same tag per chat → replaces the previous notification for that chat
        tag: `chat-${chatId}`,
        silent: false,
      })

      notif.onclick = () => {
        window.focus()
        useChatStore.getState().setActiveChat(chatId)
        notif.close()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])
}
