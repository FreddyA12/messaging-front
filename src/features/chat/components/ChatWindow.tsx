import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChatStore } from '../../../store/chatStore'
import type { Message } from '../../../store/chatStore'
import { useAuthStore } from '../../../store/authStore'
import { useChatSubscription, publishTypingStart, publishTypingStop } from '../../../hooks/useSocket'
import { publish } from '../../../lib/socket'
import { chatApi } from '../api'
import { mediaApi } from '../../media/api'
import { compressImage } from '../../../utils/imageCompression'
import { MessageBubble } from './MessageBubble'
import { ReplyPreview } from './ReplyPreview'
import { PinnedMessageBanner } from './PinnedMessageBanner'
import { StarredMessagesView } from './StarredMessagesView'
import { ForwardDialog } from './ForwardDialog'
import { AttachMenu, type AttachType } from './AttachMenu'
import { AttachPreview } from './AttachPreview'
import { MediaGallery } from '../../media/components/MediaGallery'

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

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-amber-200 dark:bg-amber-700 rounded-sm px-0.5">{part}</mark>
      : part,
  )
}

export function ChatWindow() {
  const activeChatId = useChatStore((s) => s.activeChatId)
  const chats = useChatStore((s) => s.chats)
  const messages = useChatStore((s) => s.messages)
  const presence = useChatStore((s) => s.presence)
  const typing = useChatStore((s) => s.typing)
  const replyTo = useChatStore((s) => s.replyTo)
  const editingMessage = useChatStore((s) => s.editingMessage)
  const pinnedMessages = useChatStore((s) => s.pinnedMessages)
  const starredMessages = useChatStore((s) => s.starredMessages)
  const setMessages = useChatStore((s) => s.setMessages)
  const prependMessages = useChatStore((s) => s.prependMessages)
  const setReplyTo = useChatStore((s) => s.setReplyTo)
  const setEditingMessage = useChatStore((s) => s.setEditingMessage)
  const setPinnedMessages = useChatStore((s) => s.setPinnedMessages)
  const setPinned = useChatStore((s) => s.setPinned)
  const setStarredMessages = useChatStore((s) => s.setStarredMessages)
  const toggleStarred = useChatStore((s) => s.toggleStarred)
  const currentUser = useAuthStore((s) => s.user)

  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [showStarred, setShowStarred] = useState(false)
  const [loadingStarred, setLoadingStarred] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [pendingAttach, setPendingAttach] = useState<{
    file: File
    type: AttachType
    previewUrl: string | null
  } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const attachBtnRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const messageRefs = useRef(new Map<number, HTMLDivElement>())

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null
  const chatMessages = activeChatId ? (messages[activeChatId] ?? []) : []
  const typingUsers = activeChatId ? (typing[activeChatId] ?? []) : []
  const otherPresence = activeChat?.otherUserId != null ? presence[activeChat.otherUserId] : null
  const activePinned = activeChatId ? (pinnedMessages[activeChatId] ?? []) : []

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
    if (!activeChatId) return
    chatApi.getPinnedMessages(activeChatId)
      .then((data) => setPinnedMessages(activeChatId, data as unknown as Message[]))
      .catch(() => {})
  }, [activeChatId, setPinnedMessages])

  useEffect(() => {
    if (activeChatId) {
      setInput('')
      setCursor(undefined)
      setHasMore(true)
      setReplyTo(null)
      setEditingMessage(null)
      setShowSearch(false)
      setSearchQuery('')
      setSearchResults([])
      setShowGallery(false)
      cancelAttach()
      inputRef.current?.focus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 0)
    }
  }, [showSearch])

  useEffect(() => {
    if (!showAttachMenu) return
    const handle = (e: MouseEvent) => {
      if (attachBtnRef.current && !attachBtnRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showAttachMenu])

  const setMessageRef = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) messageRefs.current.set(id, el)
    else messageRefs.current.delete(id)
  }, [])

  const scrollToMessage = useCallback((messageId: number) => {
    const el = messageRefs.current.get(messageId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedMessageId(messageId)
      setTimeout(() => setHighlightedMessageId(null), 2000)
    }
  }, [])

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

  const handleFileSelected = async (file: File, type: AttachType) => {
    let processedFile = file
    let previewUrl: string | null = null

    if (type === 'IMAGE') {
      try { processedFile = await compressImage(file) } catch { /* keep original */ }
      previewUrl = URL.createObjectURL(processedFile)
    } else if (type === 'VIDEO') {
      previewUrl = URL.createObjectURL(file)
    }

    setPendingAttach({ file: processedFile, type, previewUrl })
  }

  const cancelAttach = () => {
    if (pendingAttach?.previewUrl) URL.revokeObjectURL(pendingAttach.previewUrl)
    setPendingAttach(null)
    setUploadProgress(null)
  }

  const sendMessage = async () => {
    const content = input.trim()
    if (!content && !pendingAttach) return
    if (!activeChatId) return

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    stopTyping()

    if (editingMessage) {
      await chatApi.editMessage(editingMessage.id, content)
      setEditingMessage(null)
    } else {
      let attachmentIds: number[] | undefined

      if (pendingAttach) {
        setUploadProgress(0)
        try {
          const res = await mediaApi.uploadFile(pendingAttach.file, (pct) => setUploadProgress(pct))
          attachmentIds = [res.attachmentId]
        } catch {
          setUploadProgress(null)
          return
        }
        if (pendingAttach.previewUrl) URL.revokeObjectURL(pendingAttach.previewUrl)
        setPendingAttach(null)
        setUploadProgress(null)
      }

      publish('/app/chat.send', {
        chatId: activeChatId,
        content: content || null,
        type: pendingAttach?.type ?? 'TEXT',
        replyToId: replyTo?.id,
        attachmentIds,
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

  const handlePin = async (message: Message) => {
    if (!activeChatId) return
    if (message.isPinned) {
      await chatApi.unpinMessage(message.id)
      setPinned(message.id, activeChatId, false)
    } else {
      await chatApi.pinMessage(message.id)
      setPinned(message.id, activeChatId, true)
    }
  }

  const handleStar = async (message: Message) => {
    if (message.isStarred) {
      await chatApi.unstarMessage(message.id)
      toggleStarred(message.id, false)
    } else {
      await chatApi.starMessage(message.id)
      toggleStarred(message.id, true)
    }
  }

  const handleUnstarFromPanel = async (messageId: number) => {
    await chatApi.unstarMessage(messageId)
    toggleStarred(messageId, false)
  }

  const handleUnpinFromBanner = async (messageId: number) => {
    if (!activeChatId) return
    await chatApi.unpinMessage(messageId)
    setPinned(messageId, activeChatId, false)
  }

  const handleForwardConfirm = async (chatIds: number[]) => {
    if (!forwardingMessage) return
    await chatApi.forwardMessage(forwardingMessage.id, chatIds)
    setForwardingMessage(null)
  }

  const openStarredPanel = async () => {
    setShowStarred(true)
    setLoadingStarred(true)
    try {
      const data = await chatApi.getStarredMessages()
      setStarredMessages(data as unknown as Message[])
    } finally {
      setLoadingStarred(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setSearchQuery(q)

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!q.trim() || !activeChatId) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const data = await chatApi.searchMessages(activeChatId, q)
        setSearchResults(data as unknown as Message[])
      } finally {
        setSearchLoading(false)
      }
    }, 350)
  }

  const handleSearchResultClick = (messageId: number) => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    scrollToMessage(messageId)
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
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
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        {showSearch ? (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 shrink-0">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar en el chat..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl
                           bg-gray-100 dark:bg-gray-800
                           text-gray-900 dark:text-gray-100 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              onClick={closeSearch}
              className="shrink-0 text-sm text-primary-500 hover:text-primary-700 font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
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
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowSearch(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                           hover:text-gray-600 dark:hover:text-gray-200
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Buscar en el chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={showStarred ? () => setShowStarred(false) : openStarredPanel}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                  ${showStarred
                    ? 'text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                title="Mensajes destacados"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
              <button
                onClick={() => { setShowGallery((v) => !v); setShowStarred(false) }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                  ${showGallery
                    ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                title="Galería"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Pinned message banner */}
        {activePinned.length > 0 && !showSearch && (
          <PinnedMessageBanner
            messages={activePinned}
            onScrollTo={scrollToMessage}
            onUnpin={handleUnpinFromBanner}
          />
        )}

        {/* Search results overlay */}
        {showSearch && (
          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
            {searchLoading ? (
              <div className="flex items-center justify-center h-24">
                <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">Sin resultados para "{searchQuery}"</p>
            ) : searchResults.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {searchResults.map((msg) => (
                  <li
                    key={msg.id}
                    onClick={() => handleSearchResultClick(msg.id)}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-0.5">
                      {msg.senderName}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                      {highlightText(msg.content ?? '', searchQuery)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(msg.createdAt).toLocaleString('es', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-xs text-gray-400 py-8">Escribe para buscar mensajes</p>
            )}
          </div>
        )}

        {/* Messages */}
        {!showSearch && (
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
                      onPin={handlePin}
                      onStar={handleStar}
                      onForward={setForwardingMessage}
                      onScrollToReply={scrollToMessage}
                      setRef={setMessageRef}
                      isHighlighted={highlightedMessageId === msg.id}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}

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

        {/* Attach preview */}
        {pendingAttach && (
          <AttachPreview
            file={pendingAttach.file}
            type={pendingAttach.type}
            previewUrl={pendingAttach.previewUrl}
            progress={uploadProgress}
            onCancel={cancelAttach}
          />
        )}

        {/* Input */}
        {!showSearch && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-end gap-2 shrink-0">
            <div ref={attachBtnRef} className="relative shrink-0">
              <button
                onClick={() => setShowAttachMenu((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400
                           hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800
                           transition-colors"
                title="Adjuntar archivo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              {showAttachMenu && (
                <AttachMenu
                  onSelect={(file, type) => { handleFileSelected(file, type); setShowAttachMenu(false) }}
                  onClose={() => setShowAttachMenu(false)}
                />
              )}
            </div>
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
              disabled={!input.trim() && !pendingAttach}
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
        )}

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

        {/* Forward dialog */}
        {forwardingMessage && (
          <ForwardDialog
            message={forwardingMessage}
            chats={chats}
            onConfirm={handleForwardConfirm}
            onClose={() => setForwardingMessage(null)}
          />
        )}
      </div>

      {/* Starred messages panel */}
      {showStarred && (
        <StarredMessagesView
          messages={starredMessages}
          isLoading={loadingStarred}
          onClose={() => setShowStarred(false)}
          onScrollTo={(id) => { setShowStarred(false); scrollToMessage(id) }}
          onUnstar={handleUnstarFromPanel}
        />
      )}

      {/* Media gallery panel */}
      {showGallery && activeChatId && (
        <MediaGallery
          chatId={activeChatId}
          onClose={() => setShowGallery(false)}
          onScrollTo={(id) => { setShowGallery(false); scrollToMessage(id) }}
        />
      )}
    </div>
  )
}
