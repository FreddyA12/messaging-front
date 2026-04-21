import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChatStore } from '../../../store/chatStore'
import type { Message } from '../../../store/chatStore'
import { useAuthStore } from '../../../store/authStore'
import { useChatSubscription, publishTypingStart, publishTypingStop } from '../../../hooks/useSocket'
import { publish } from '../../../lib/socket'
import { chatApi } from '../api'
import { MessageBubble } from './MessageBubble'
import { ReplyPreview } from './ReplyPreview'

const TYPING_STOP_DELAY = 3000

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-amber-500',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

function formatLastSeen(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `hace ${diffH}h`
  return `el ${date.toLocaleDateString('es', { day: '2-digit', month: 'short' })}`
}

export function ChatWindow() {
  const activeChatId = useChatStore((s) => s.activeChatId)
  const chats = useChatStore((s) => s.chats)
  const messages = useChatStore((s) => s.messages)
  const presence = useChatStore((s) => s.presence)
  const typing = useChatStore((s) => s.typing)
  const replyTo = useChatStore((s) => s.replyTo)
  const editingMessage = useChatStore((s) => s.editingMessage)
  const setMessages = useChatStore((s) => s.setMessages)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setReplyTo = useChatStore((s) => s.setReplyTo)
  const setEditingMessage = useChatStore((s) => s.setEditingMessage)
  const currentUser = useAuthStore((s) => s.user)

  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null
  const chatMessages = activeChatId ? (messages[activeChatId] ?? []) : []
  const typingUsers = activeChatId ? (typing[activeChatId] ?? []) : []
  const otherPresence = activeChat?.otherUserId != null ? presence[activeChat.otherUserId] : null

  useChatSubscription(activeChatId)

  const { isLoading } = useQuery({
    queryKey: ['messages', activeChatId],
    queryFn: async () => {
      if (!activeChatId) return []
      const data = await chatApi.getMessages(activeChatId, undefined, 50)
      setMessages(activeChatId, data as unknown as Message[])
      setHasMore(data.length === 50)
      setCursor(data[0]?.createdAt)
      return data
    },
    enabled: !!activeChatId,
  })

  useEffect(() => {
    if (activeChatId) {
      setInput('')
      setCursor(undefined)
      setHasMore(true)
      setReplyTo(null)
      setEditingMessage(null)
      inputRef.current?.focus()
    }
  }, [activeChatId, setReplyTo, setEditingMessage])

  useEffect(() => {
    if (editingMessage) {
      setInput(editingMessage.content ?? '')
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto'
          inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`
        }
        inputRef.current?.focus()
      }, 0)
    }
  }, [editingMessage])

  const loadMore = useCallback(async () => {
    if (!activeChatId || isLoadingMore || !hasMore || !cursor) return
    setIsLoadingMore(true)
    try {
      const older = await chatApi.getMessages(activeChatId, cursor, 50)
      if (older.length === 0) {
        setHasMore(false)
      } else {
        prependMessages(activeChatId, older as unknown as Message[])
        setCursor(older[0]?.createdAt)
        if (older.length < 50) setHasMore(false)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [activeChatId, cursor, hasMore, isLoadingMore, prependMessages])

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

  const stopTyping = useCallback(() => {
    if (isTypingRef.current && activeChatId && currentUser) {
      publishTypingStop(activeChatId, currentUser.id)
      isTypingRef.current = false
    }
  }, [activeChatId, currentUser])

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || !activeChatId) return

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    stopTyping()

    if (editingMessage) {
      await chatApi.editMessage(editingMessage.id, content)
      setEditingMessage(null)
    } else {
      publish('/app/chat.send', {
        chatId: activeChatId,
        content,
        type: 'TEXT',
        replyToId: replyTo?.id,
      })
      setReplyTo(null)
    }

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    if (!activeChatId || !currentUser) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      publishTypingStart(activeChatId, currentUser.id, currentUser.name)
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      stopTyping()
    }, TYPING_STOP_DELAY)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'Escape') {
      setReplyTo(null)
      setEditingMessage(null)
      setInput('')
    }
  }

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget
    t.style.height = 'auto'
    t.style.height = `${Math.min(t.scrollHeight, 128)}px`
  }

  const handleReact = async (messageId: number, emoji: string) => {
    const allMsgs = Object.values(messages).flat()
    const msg = allMsgs.find((m) => m.id === messageId)
    if (!msg || !currentUser) return
    const alreadyReacted = msg.reactions.some(
      (r) => r.emoji === emoji && r.userIds.includes(currentUser.id),
    )
    if (alreadyReacted) {
      await chatApi.removeReaction(messageId, emoji)
    } else {
      await chatApi.addReaction(messageId, emoji)
    }
  }

  const handleDeleteConfirm = async (forEveryone: boolean) => {
    if (!deleteTarget) return
    await chatApi.deleteMessage(deleteTarget.id, forEveryone)
    setDeleteTarget(null)
  }

  const cancelEditOrReply = () => {
    setReplyTo(null)
    setEditingMessage(null)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
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
            {activeChat.type === 'GROUP'
              ? 'Grupo'
              : otherPresence?.isOnline
                ? 'en línea'
                : otherPresence?.lastSeen
                  ? `visto ${formatLastSeen(otherPresence.lastSeen)}`
                  : 'en línea'}
          </p>
        </div>
      </div>

      {/* Messages */}
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
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-1 py-1">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].userName} está escribiendo...`
                    : 'Varios están escribiendo...'}
                </span>
              </div>
            )}

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
              [...chatMessages].reverse().map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUser?.id ?? -1}
                  chatType={activeChat.type}
                  onReply={setReplyTo}
                  onEdit={setEditingMessage}
                  onDelete={setDeleteTarget}
                  onReact={handleReact}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Edit banner */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Editando mensaje</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 truncate">
              {editingMessage.content}
            </p>
          </div>
          <button
            onClick={cancelEditOrReply}
            className="shrink-0 p-1 text-amber-400 hover:text-amber-600 transition-colors rounded-full hover:bg-amber-100 dark:hover:bg-amber-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Reply preview */}
      {replyTo && !editingMessage && (
        <ReplyPreview message={replyTo} onCancel={() => setReplyTo(null)} />
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
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
          title={editingMessage ? 'Guardar cambios' : 'Enviar'}
        >
          {editingMessage ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          )}
        </button>
      </div>

      {/* Delete dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Eliminar mensaje</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              ¿Para quién quieres eliminar este mensaje?
            </p>
            <div className="flex flex-col gap-2">
              {deleteTarget.senderId === currentUser?.id && (
                <button
                  onClick={() => handleDeleteConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                >
                  Eliminar para todos
                </button>
              )}
              <button
                onClick={() => handleDeleteConfirm(false)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
              >
                Eliminar para mí
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full py-2.5 rounded-xl text-gray-500 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
