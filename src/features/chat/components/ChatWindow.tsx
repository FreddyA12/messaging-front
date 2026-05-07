import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChatStore } from '../../../store/chatStore'
import type { Message } from '../../../store/chatStore'
import { useAppearanceStore, CHAT_BACKGROUNDS } from '../../../store/appearanceStore'
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
import { GroupInfoPanel } from './GroupInfoPanel'
import { TtlPickerDialog } from './TtlPickerDialog'
import { useCallStore } from '../../../store/callStore'
import { useEncryptionStore } from '../../../store/encryptionStore'
import { encrypt } from '../../../lib/afin'
import type { CallType } from '../../../types/call'

const TYPING_STOP_DELAY = 3000

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
  const requestOutgoingCall = useCallStore((s) => s.requestOutgoingCall)
  const activeCall = useCallStore((s) => s.call)

  const [input, setInput] = useState('')
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [ttlMessage, setTtlMessage] = useState<Message | null>(null)
  const [showStarred, setShowStarred] = useState(false)
  const [loadingStarred, setLoadingStarred] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [mutedUntil, setMutedUntil] = useState<Date | null>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<{ userId: number; name: string }[]>([])
  const [newMessageTtl, setNewMessageTtl] = useState<number | null>(null)
  const [showTtlMenu, setShowTtlMenu] = useState(false)
  const [pendingAttach, setPendingAttach] = useState<{
    file: File
    type: AttachType
    previewUrl: string | null
  } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const chatBg = useAppearanceStore((s) => s.chatBackground)

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
  const typingUsers = activeChatId
    ? (typing[activeChatId] ?? []).filter((u) => u.userId !== currentUser?.id)
    : []
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
      setCursor(data[data.length - 1]?.createdAt)
      // Mark all unread messages as read when opening the chat
      const unread = (data as unknown as Message[]).filter(
        (m) => m.senderId !== currentUser?.id && !m.readBy?.includes(currentUser?.id ?? 0)
      )
      unread.forEach((m) => chatApi.markRead(m.id).catch(() => { }))
      return data
    },
    enabled: !!activeChatId,
  })

  useEffect(() => {
    if (!activeChatId) return
    chatApi.getPinnedMessages(activeChatId)
      .then((data) => setPinnedMessages(activeChatId, data as unknown as Message[]))
      .catch(() => { })
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
      setShowGroupInfo(false)
      setNewMessageTtl(null)
      setShowTtlMenu(false)
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

    const { a, b } = useEncryptionStore.getState()
    const encryptContent = (text: string) =>
      text && a !== null && b !== null ? encrypt(text, a, b) : text

    if (editingMessage) {
      await chatApi.editMessage(editingMessage.id, encryptContent(content))
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

      await publish('/app/chat.send', {
        chatId: activeChatId,
        content: content ? encryptContent(content) : null,
        type: pendingAttach?.type ?? 'TEXT',
        replyToId: replyTo?.id,
        attachmentIds,
        ttlSeconds: newMessageTtl ?? undefined,
      })
      setReplyTo(null)
    }

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)

    // @mention detection (GROUP chats only)
    if (activeChat?.type === 'GROUP') {
      const at = val.lastIndexOf('@')
      if (at !== -1 && (at === 0 || val[at - 1] === ' ' || val[at - 1] === '\n')) {
        const query = val.slice(at + 1)
        if (!query.includes(' ')) {
          setMentionQuery(query)
        } else {
          setMentionQuery(null)
        }
      } else {
        setMentionQuery(null)
      }
    }

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

  const handleSetTtl = async (messageId: number, ttlSeconds: number) => {
    await chatApi.setMessageTtl(messageId, ttlSeconds)
    setTtlMessage(null)
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

  const startCall = (type: CallType) => {
    if (!activeChat || activeChat.otherUserId == null || activeCall) return
    requestOutgoingCall({
      peerId: activeChat.otherUserId,
      peerName: activeChat.name,
      type,
      chatId: activeChat.id,
    })
  }

  const canCall = activeChat?.type === 'PRIVATE' && activeChat.otherUserId != null && !activeCall

  const handleMute = async (minutes: number) => {
    if (!activeChatId) return
    await chatApi.muteChat(activeChatId, minutes)
    setMutedUntil(new Date(Date.now() + minutes * 60_000))
    setShowChatMenu(false)
  }

  const handleUnmute = async () => {
    if (!activeChatId) return
    await chatApi.unmuteChat(activeChatId)
    setMutedUntil(null)
    setShowChatMenu(false)
  }

  const handleExport = async () => {
    if (!activeChatId) return
    setShowChatMenu(false)
    const blob = await chatApi.exportChat(activeChatId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${activeChatId}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Load group members for @mention autocomplete
  useEffect(() => {
    if (activeChat?.type === 'GROUP' && activeChatId) {
      chatApi.getGroupMembers(activeChatId)
        .then((members) => setGroupMembers(members.map((m) => ({ userId: m.userId, name: m.name }))))
        .catch(() => {})
    } else {
      setGroupMembers([])
    }
  }, [activeChatId, activeChat?.type])

  const handleMentionSelect = (name: string) => {
    const at = input.lastIndexOf('@')
    if (at === -1) return
    const newInput = input.slice(0, at) + '@' + name + ' '
    setInput(newInput)
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  if (!activeChat) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '14px', background: 'linear-gradient(155deg, #f0f3e6 0%, #f5f6f0 100%)',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '22px',
          background: 'rgba(122,144,72,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" fill="none" stroke="#7a9048" strokeWidth="1.2" viewBox="0 0 24 24" opacity="0.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p style={{ fontSize: '13px', color: '#8a9a7a', fontWeight: 500 }}>Selecciona un chat para comenzar</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        {showSearch ? (
          <div style={{
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(122,144,72,0.14)',
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9aaa82' }}
                width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                style={{
                  width: '100%', paddingLeft: '38px', paddingRight: '16px',
                  paddingTop: '8px', paddingBottom: '8px',
                  fontSize: '13px', borderRadius: '12px',
                  background: '#f0f3e6', border: '1.5px solid rgba(122,144,72,0.2)',
                  color: '#242d16', outline: 'none',
                  fontFamily: "'Poppins', system-ui, sans-serif",
                }}
              />
            </div>
            <button
              onClick={closeSearch}
              style={{
                flexShrink: 0, fontSize: '12px', fontWeight: 600,
                color: '#7a9048', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: "'Poppins', system-ui, sans-serif",
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div style={{
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
            background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(122,144,72,0.14)',
          }}>
            {/* Avatar */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7a9048, #91a662)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 600, fontSize: '15px', flexShrink: 0,
              boxShadow: '0 2px 10px rgba(122,144,72,0.22)',
            }}>
              {activeChat.name[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: '14px', color: '#242d16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeChat.name}
              </p>
              <p style={{ fontSize: '11px', color: '#8a9a7a' }}>
                {activeChat.type === 'GROUP'
                  ? 'Grupo'
                  : otherPresence?.isOnline
                    ? 'en línea'
                    : otherPresence?.lastSeen
                      ? `visto ${formatLastSeen(otherPresence.lastSeen)}`
                      : 'en línea'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              {canCall && (
                <>
                  <button
                    onClick={() => startCall('VOICE')}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                               hover:text-primary-500 hover:bg-primary-50 transition-colors"
                    title="Llamada de voz"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => startCall('VIDEO')}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                               hover:text-primary-500 hover:bg-primary-50 transition-colors"
                    title="Videollamada"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </>
              )}
              <button
                onClick={() => setShowSearch(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                           hover:text-primary-600 hover:bg-primary-50 transition-colors"
                title="Buscar en el chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={showStarred ? () => setShowStarred(false) : () => { openStarredPanel(); setShowGallery(false); setShowGroupInfo(false) }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                  ${showStarred
                    ? 'text-primary-500 bg-primary-50'
                    : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                title="Mensajes destacados"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
              <button
                onClick={() => { setShowGallery((v) => !v); setShowStarred(false); setShowGroupInfo(false) }}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                  ${showGallery
                    ? 'text-primary-500 bg-primary-50'
                    : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                  }`}
                title="Galería"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              {activeChat.type === 'GROUP' && (
                <button
                  onClick={() => { setShowGroupInfo((v) => !v); setShowStarred(false); setShowGallery(false) }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors
                    ${showGroupInfo
                      ? 'text-primary-500 bg-primary-50'
                      : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'
                    }`}
                  title="Info del grupo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              {/* ⋮ More menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowChatMenu((v) => !v)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400
                             hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Más opciones"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showChatMenu && (
                  <div
                    className="absolute right-0 top-9 z-40 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 min-w-[200px]"
                    onMouseLeave={() => setShowChatMenu(false)}
                  >
                    {mutedUntil && mutedUntil > new Date() ? (
                      <button
                        onClick={handleUnmute}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Activar notificaciones
                      </button>
                    ) : (
                      <>
                        <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Silenciar</p>
                        {[
                          { label: '8 horas', minutes: 480 },
                          { label: '1 semana', minutes: 10080 },
                          { label: 'Siempre', minutes: 525_600 },
                        ].map((opt) => (
                          <button
                            key={opt.minutes}
                            onClick={() => handleMute(opt.minutes)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                    <button
                      onClick={handleExport}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Exportar historial
                    </button>
                  </div>
                )}
              </div>
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
          <div className="flex-1 overflow-y-auto flex flex-col-reverse px-4 py-3 gap-1 scrollbar-thin"
            style={{ background: CHAT_BACKGROUNDS[chatBg]?.style ?? CHAT_BACKGROUNDS.default.style }}>
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
                  chatMessages.map((msg) => (
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
                      onSetTtl={setTtlMessage}
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

        {/* @mention autocomplete */}
        {mentionQuery !== null && activeChat?.type === 'GROUP' && (
          (() => {
            const filtered = groupMembers.filter(
              (m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase()) && m.userId !== currentUser?.id
            )
            if (filtered.length === 0) return null
            return (
              <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 max-h-40 overflow-y-auto">
                {filtered.map((m) => (
                  <button
                    key={m.userId}
                    onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(m.name) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {m.name[0].toUpperCase()}
                    </span>
                    {m.name}
                  </button>
                ))}
              </div>
            )
          })()
        )}

        {/* Input */}
        {!showSearch && (
          <div style={{
            padding: '10px 16px 12px', borderTop: '1px solid rgba(122,144,72,0.14)',
            display: 'flex', alignItems: 'flex-end', gap: '8px', flexShrink: 0,
            background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)',
          }}>
            <div ref={attachBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowAttachMenu((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400
                           hover:text-primary-500 hover:bg-primary-50 transition-colors"
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
            {/* TTL selector */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowTtlMenu((v) => !v)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors
                  ${newMessageTtl
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-400 hover:text-primary-500 hover:bg-primary-50'
                  }`}
                title={newMessageTtl ? 'Autodestrucción activa' : 'Autodestrucción del mensaje'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {newMessageTtl && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full" />
                )}
              </button>
              {showTtlMenu && (
                <div
                  className="absolute bottom-12 left-0 z-30 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 min-w-[180px]"
                  onMouseLeave={() => setShowTtlMenu(false)}
                >
                  <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Autodestrucción
                  </p>
                  {[
                    { label: 'Sin autodestrucción', seconds: null },
                    { label: '30 segundos', seconds: 30 },
                    { label: '5 minutos', seconds: 300 },
                    { label: '1 hora', seconds: 3600 },
                    { label: '24 horas', seconds: 86400 },
                    { label: '7 días', seconds: 604800 },
                  ].map((opt) => (
                    <button
                      key={String(opt.seconds)}
                      onClick={() => { setNewMessageTtl(opt.seconds); setShowTtlMenu(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors
                        ${newMessageTtl === opt.seconds
                          ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
              style={{
                flex: 1, resize: 'none', borderRadius: '18px',
                padding: '10px 16px', fontSize: '13px',
                background: '#f0f3e6', border: '1.5px solid rgba(122,144,72,0.2)',
                color: '#242d16', outline: 'none',
                maxHeight: '128px', overflowY: 'auto',
                fontFamily: "'Poppins', system-ui, sans-serif",
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(122,144,72,0.5)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(122,144,72,0.2)' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() && !pendingAttach}
              style={{
                width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #7a9048, #637839)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', transition: 'all 0.2s ease',
                boxShadow: '0 3px 12px rgba(122,144,72,0.3)',
                opacity: (!input.trim() && !pendingAttach) ? 0.4 : 1,
              }}
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

        {/* TTL picker dialog */}
        {ttlMessage && (
          <TtlPickerDialog
            message={ttlMessage}
            onConfirm={handleSetTtl}
            onClose={() => setTtlMessage(null)}
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

      {/* Group info panel */}
      {showGroupInfo && activeChat.type === 'GROUP' && (
        <GroupInfoPanel
          chatId={activeChat.id}
          chatName={activeChat.name}
          description={undefined}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </div>
  )
}
