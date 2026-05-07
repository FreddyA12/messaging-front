import { useState, useRef, useEffect } from 'react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import { useChatStore, type Message } from '../../../store/chatStore'
import { chatApi } from '../api'
import { ImageBubble } from './ImageBubble'
import { VideoBubble } from './VideoBubble'
import { AudioBubble } from './AudioBubble'
import { DocumentBubble } from './DocumentBubble'
import { LinkPreviewCard } from './LinkPreviewCard'
import { CallMessageBubble } from './CallMessageBubble'
import { PollBubble } from './PollBubble'

interface MessageBubbleProps {
  message: Message
  currentUserId: number
  chatType: 'PRIVATE' | 'GROUP'
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  onDelete: (message: Message) => void
  onReact: (messageId: number, emoji: string) => void
  onPin: (message: Message) => void
  onStar: (message: Message) => void
  onForward: (message: Message) => void
  onSetTtl?: (message: Message) => void
  onScrollToReply?: (messageId: number) => void
  setRef?: (id: number, el: HTMLDivElement | null) => void
  isHighlighted?: boolean
}

function useCountdown(expiresAt: string | null | undefined, onExpired: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null)
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired

  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return }
    const target = new Date(expiresAt).getTime()
    const tick = () => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      setRemaining(diff)
      if (diff === 0) onExpiredRef.current()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return remaining
}

function formatCountdown(secs: number): string {
  if (secs >= 86400) return `${Math.floor(secs / 86400)}d`
  if (secs >= 3600) return `${Math.floor(secs / 3600)}h`
  if (secs >= 60) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }
  return `${secs}s`
}

type TickStatus = 'sent' | 'delivered' | 'read'

function getTickStatus(message: Message, currentUserId: number): TickStatus {
  if (message.readBy.some((id) => id !== currentUserId)) return 'read'
  if (message.deliveredTo.some((id) => id !== currentUserId)) return 'delivered'
  return 'sent'
}

function Ticks({ status }: { status: TickStatus }) {
  if (status === 'sent') {
    return (
      <svg
        className="w-3.5 h-3 text-gray-400 shrink-0"
        viewBox="0 0 10 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 4l2.5 2.5L9 1" />
      </svg>
    )
  }
  const color = status === 'read' ? 'text-blue-500' : 'text-gray-400'
  return (
    <svg
      className={`w-5 h-3 ${color} shrink-0`}
      viewBox="0 0 14 8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 4l2.5 2.5L8 1" />
      <path d="M5 4l2.5 2.5L13 1" />
    </svg>
  )
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({
  message,
  currentUserId,
  chatType,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onStar,
  onForward,
  onSetTtl,
  onScrollToReply,
  setRef,
  isHighlighted,
}: MessageBubbleProps) {
  const isOwn = message.senderId === currentUserId
  const removeMessage = useChatStore((s) => s.removeMessage)
  const countdown = useCountdown(message.expiresAt, () => removeMessage(message.id))
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right?: number; left?: number } | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPos, setEmojiPos] = useState<{ bottom: number; right?: number; left?: number } | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const moreBtnRef = useRef<HTMLButtonElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (setRef) {
      setRef(message.id, wrapperRef.current)
      return () => setRef(message.id, null)
    }
  }, [message.id, setRef])

  useEffect(() => {
    if (!showMenu && !showEmojiPicker) return
    function handleClickOutside(e: MouseEvent) {
      if (
        showMenu &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        moreBtnRef.current &&
        !moreBtnRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false)
      }
      if (
        showEmojiPicker &&
        emojiRef.current &&
        !emojiRef.current.contains(e.target as Node) &&
        emojiBtnRef.current &&
        !emojiBtnRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu, showEmojiPicker])

  const openMenu = () => {
    const rect = moreBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    setMenuPos(
      isOwn
        ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, left: rect.left },
    )
    setShowMenu(true)
  }

  const openEmojiPicker = () => {
    const rect = emojiBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const bottom = window.innerHeight - rect.top + 4
    setEmojiPos(
      isOwn
        ? { bottom, right: window.innerWidth - rect.right }
        : { bottom, left: rect.left },
    )
    setShowEmojiPicker(true)
  }

  const handleEmojiClick = (data: EmojiClickData) => {
    onReact(message.id, data.emoji)
    setShowEmojiPicker(false)
  }

  const tickStatus = isOwn ? getTickStatus(message, currentUserId) : null

  if (message.deletedForEveryone) {
    return (
      <div ref={wrapperRef} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[70%] px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs italic">
          Mensaje eliminado
        </div>
      </div>
    )
  }

  // Render call messages with special UI
  if (message.type === 'SYSTEM' && message.content &&
      (message.content.includes('Llamada de voz') || message.content.includes('Videollamada'))) {
    return (
      <div ref={wrapperRef}>
        <CallMessageBubble message={message} currentUserId={currentUserId} />
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className={`group flex items-end gap-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}
        ${isHighlighted ? 'rounded-xl ring-2 ring-amber-300 dark:ring-amber-600' : ''}`}
    >
      {/* Action buttons — visible on hover */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mb-1">
        <button
          ref={emojiBtnRef}
          onClick={openEmojiPicker}
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400
                     hover:text-gray-600 dark:hover:text-gray-200
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Reaccionar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          ref={moreBtnRef}
          onClick={openMenu}
          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400
                     hover:text-gray-600 dark:hover:text-gray-200
                     hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Más opciones"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Bubble + reactions */}
      <div className={`max-w-[70%] flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3 py-1.5 rounded-2xl shadow-sm
            ${isOwn
              ? 'bg-bubble-outgoing text-gray-900 rounded-br-sm'
              : 'bg-bubble-incoming dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-transparent'
            }`}
        >
          {/* Sender name in groups */}
          {!isOwn && chatType === 'GROUP' && (
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-0.5 truncate">
              {message.senderName}
            </p>
          )}

          {/* Reply quote — clickable to scroll */}
          {message.replyTo && (
            <div
              onClick={() => onScrollToReply?.(message.replyTo!.id)}
              className="border-l-2 border-primary-400 dark:border-primary-500 pl-2 mb-1.5
                         bg-black/5 dark:bg-white/5 rounded-r py-0.5
                         cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 truncate">
                {message.replyTo.senderName}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {message.replyTo.content ?? 'Archivo adjunto'}
              </p>
            </div>
          )}

          {/* Forwarded label */}
          {message.isForwarded && (
            <p className="text-[10px] text-gray-400 italic mb-0.5">Reenviado</p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-1">
              {message.attachments.map((att) => {
                if (att.type === 'IMAGE') return (
                  <ImageBubble
                    key={att.id}
                    attachment={att}
                    viewOnce={message.viewOnce}
                    viewedByMe={message.viewedByMe}
                    isOwn={isOwn}
                    onView={() => {
                      useChatStore.getState().markViewedOnce(message.id)
                      chatApi.markViewedOnce(message.id)
                    }}
                  />
                )
                if (att.type === 'VIDEO') return (
                  <VideoBubble
                    key={att.id}
                    attachment={att}
                    viewOnce={message.viewOnce}
                    viewedByMe={message.viewedByMe}
                    isOwn={isOwn}
                    onView={() => {
                      useChatStore.getState().markViewedOnce(message.id)
                      chatApi.markViewedOnce(message.id)
                    }}
                  />
                )
                if (att.type === 'AUDIO') return <AudioBubble key={att.id} attachment={att} isOwn={isOwn} />
                return <DocumentBubble key={att.id} attachment={att} isOwn={isOwn} />
              })}
            </div>
          )}

          {/* Poll */}
          {message.type === 'POLL' && message.poll && (
            <PollBubble messageId={message.id} poll={message.poll} isOwn={isOwn} />
          )}

          {/* Content */}
          {message.content && message.type !== 'POLL' && (
            <p className="text-sm whitespace-pre-wrap break-words leading-snug">
              {message.content}
            </p>
          )}

          {/* Link previews */}
          {message.linkPreviews && message.linkPreviews.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {message.linkPreviews.map((lp, i) => (
                <LinkPreviewCard key={i} preview={lp} />
              ))}
            </div>
          )}

          {/* Timestamp + edited + ticks */}
          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.editedAt && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">editado ·</span>
            )}
            {message.isPinned && (
              <svg className="w-2.5 h-2.5 text-primary-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2h2a1 1 0 010 2h-1v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8H3a1 1 0 110-2h2V4zm2 2h6V4H7v2zm-1 2v8h8V8H6z" />
              </svg>
            )}
            {countdown !== null && (
              <span className="text-[10px] text-orange-400 font-medium flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M12 6v6l4 2" />
                </svg>
                {formatCountdown(countdown)}
              </span>
            )}
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {formatTime(message.createdAt)}
            </span>
            {isOwn && tickStatus && <Ticks status={tickStatus} />}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.reactions.map((r) => {
              const iReacted = r.userIds.includes(currentUserId)
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReact(message.id, r.emoji)}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors
                    ${iReacted
                      ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-700 dark:text-primary-300'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Context menu — fixed position */}
      {showMenu && menuPos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            ...(menuPos.right !== undefined ? { right: menuPos.right } : { left: menuPos.left }),
            zIndex: 50,
          }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
        >
          <button
            onClick={() => { onReply(message); setShowMenu(false) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Responder
          </button>
          <button
            onClick={() => { onForward(message); setShowMenu(false) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Reenviar
          </button>
          <button
            onClick={() => { onStar(message); setShowMenu(false) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {message.isStarred ? 'Quitar destacado' : 'Destacar'}
          </button>
          <button
            onClick={() => { onPin(message); setShowMenu(false) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {message.isPinned ? 'Desfijar' : 'Fijar'}
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => { onEdit(message); setShowMenu(false) }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Editar
              </button>
              {onSetTtl && (
                <button
                  onClick={() => { onSetTtl(message); setShowMenu(false) }}
                  className="w-full text-left px-4 py-2 text-sm text-orange-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {message.expiresAt ? '⏱ Cambiar autodestrucción' : '⏱ Autodestrucción'}
                </button>
              )}
            </>
          )}
          <button
            onClick={() => { onDelete(message); setShowMenu(false) }}
            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Eliminar
          </button>
        </div>
      )}

      {/* Emoji picker — fixed position */}
      {showEmojiPicker && emojiPos && (
        <div
          ref={emojiRef}
          style={{
            position: 'fixed',
            bottom: emojiPos.bottom,
            ...(emojiPos.right !== undefined ? { right: emojiPos.right } : { left: emojiPos.left }),
            zIndex: 50,
          }}
        >
          <EmojiPicker onEmojiClick={handleEmojiClick} height={350} />
        </div>
      )}
    </div>
  )
}
