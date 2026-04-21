import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChatStore } from '../../../store/chatStore'
import { useAuthStore } from '../../../store/authStore'
import { useChatSubscription } from '../../../hooks/useSocket'
import { publish } from '../../../lib/socket'
import { chatApi } from '../api'
import { MessageBubble } from './MessageBubble'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-amber-500',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

export function ChatWindow() {
  const activeChatId = useChatStore((s) => s.activeChatId)
  const chats = useChatStore((s) => s.chats)
  const messages = useChatStore((s) => s.messages)
  const setMessages = useChatStore((s) => s.setMessages)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const currentUser = useAuthStore((s) => s.user)

  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null
  const chatMessages = activeChatId ? (messages[activeChatId] ?? []) : []

  // Subscribe to STOMP topic for this chat
  useChatSubscription(activeChatId)

  // Fetch initial messages when active chat changes
  const { isLoading } = useQuery({
    queryKey: ['messages', activeChatId],
    queryFn: async () => {
      if (!activeChatId) return []
      const data = await chatApi.getMessages(activeChatId, undefined, 50)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages(activeChatId, data as any)
      setHasMore(data.length === 50)
      setCursor(data[0]?.createdAt)
      return data
    },
    enabled: !!activeChatId,
  })

  // Reset state when switching chats
  useEffect(() => {
    if (activeChatId) {
      setInput('')
      setCursor(undefined)
      setHasMore(true)
      inputRef.current?.focus()
    }
  }, [activeChatId])

  // Load older messages (cursor-based pagination)
  const loadMore = useCallback(async () => {
    if (!activeChatId || isLoadingMore || !hasMore || !cursor) return
    setIsLoadingMore(true)
    try {
      const older = await chatApi.getMessages(activeChatId, cursor, 50)
      if (older.length === 0) {
        setHasMore(false)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prependMessages(activeChatId, older as any)
        setCursor(older[0]?.createdAt)
        if (older.length < 50) setHasMore(false)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [activeChatId, cursor, hasMore, isLoadingMore, prependMessages])

  // IntersectionObserver on top sentinel for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore() },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const sendMessage = () => {
    const content = input.trim()
    if (!content || !activeChatId) return
    publish('/app/chat.send', { chatId: activeChatId, content, type: 'TEXT' })
    setInput('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget
    t.style.height = 'auto'
    t.style.height = `${Math.min(t.scrollHeight, 128)}px`
  }

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
        <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm">Selecciona un chat para comenzar</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center
                         text-white font-semibold text-base shrink-0 ${avatarColor(activeChat.name)}`}>
          {activeChat.name[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
            {activeChat.name}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {activeChat.type === 'GROUP' ? 'Grupo' : 'en línea'}
          </p>
        </div>
      </div>

      {/* Messages — flex-col-reverse anchors content to the bottom */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse px-4 py-3 gap-1 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <svg className="w-6 h-6 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* Sentinel: last in DOM = visually at the TOP (flex-col-reverse) */}
            <div ref={sentinelRef} className="h-6 shrink-0 flex items-center justify-center">
              {isLoadingMore && (
                <svg className="w-4 h-4 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
            </div>

            {chatMessages.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
                Aún no hay mensajes. ¡Di hola!
              </p>
            ) : (
              // Reverse so newest is first DOM child → appears at bottom with flex-col-reverse
              [...chatMessages].reverse().map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUser?.id ?? -1}
                  chatType={activeChat.type}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Escribe un mensaje..."
          rows={1}
          className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm
                     bg-gray-100 dark:bg-gray-800
                     text-gray-900 dark:text-gray-100 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500
                     max-h-32 overflow-y-auto scrollbar-thin transition"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center text-white transition-colors shrink-0"
          title="Enviar"
        >
          <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
