import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '../../../store/chatStore'
import { chatApi } from '../api'
import { NewChatModal } from './NewChatModal'
import { CreateGroupDialog } from './CreateGroupDialog'
import { UserAvatar } from '../../../components/UserAvatar'
import type { ChatListItem } from '../../../store/chatStore'

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000)

  if (date >= startOfToday) return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  if (date >= startOfYesterday) return 'Ayer'
  const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7) return date.toLocaleDateString('es', { weekday: 'short' })
  return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function ChatItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
      </div>
    </div>
  )
}

/* ─── Mute duration options ──────────────────────────────────────────────────── */
const MUTE_OPTIONS = [
  { label: '1 hora', minutes: 60 },
  { label: '8 horas', minutes: 480 },
  { label: '1 semana', minutes: 10_080 },
  { label: 'Siempre', minutes: 525_600 },
]

interface ContextMenuState {
  chatId: number
  chatType: 'PRIVATE' | 'GROUP'
  isArchived: boolean
  isPinned: boolean
  x: number
  y: number
  muteOpen: boolean
}

interface ConfirmDialog {
  title: string
  body: string
  onConfirm: () => void
}

export function ChatList() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [ctx, setCtx] = useState<ContextMenuState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { chats, activeChatId, setChats, setActiveChat, setChatArchived, setChatPinned, removeChat, markChatUnread } = useChatStore()

  const { data, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatApi.getChats(),
  })

  useEffect(() => {
    if (data) setChats(data)
  }, [data, setChats])

  // Close context menu on outside click
  useEffect(() => {
    if (!ctx) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCtx(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ctx])

  const openCtx = (e: React.MouseEvent, chat: ChatListItem) => {
    e.preventDefault()
    e.stopPropagation()
    setCtx({
      chatId: chat.id,
      chatType: chat.type,
      isArchived: !!chat.isArchived,
      isPinned: !!chat.isPinned,
      x: e.clientX,
      y: e.clientY,
      muteOpen: false,
    })
  }

  /* ── Context menu actions ── */
  const doArchive = async () => {
    if (!ctx) return
    const { chatId, isArchived } = ctx
    setCtx(null)
    try {
      if (isArchived) await chatApi.unarchiveChat(chatId)
      else { await chatApi.archiveChat(chatId); if (activeChatId === chatId) setActiveChat(null) }
      setChatArchived(chatId, !isArchived)
      queryClient.setQueryData(['chats'], (old: ChatListItem[] | undefined) =>
        old?.map((c) => c.id === chatId ? { ...c, isArchived: !isArchived } : c) ?? []
      )
    } catch { /* silent */ }
  }

  const doPin = async () => {
    if (!ctx) return
    const { chatId, isPinned } = ctx
    setCtx(null)
    try {
      if (isPinned) await chatApi.unpinChat(chatId)
      else await chatApi.pinChat(chatId)
      setChatPinned(chatId, !isPinned)
    } catch { /* silent */ }
  }

  const doMute = async (minutes: number) => {
    if (!ctx) return
    const { chatId } = ctx
    setCtx(null)
    try { await chatApi.muteChat(chatId, minutes) } catch { /* silent */ }
  }

  const doUnmute = async () => {
    if (!ctx) return
    const { chatId } = ctx
    setCtx(null)
    try { await chatApi.unmuteChat(chatId) } catch { /* silent */ }
  }

  const doMarkUnread = () => {
    if (!ctx) return
    const { chatId } = ctx
    setCtx(null)
    markChatUnread(chatId)
  }

  const doDelete = () => {
    if (!ctx) return
    const { chatId, chatType } = ctx
    setCtx(null)
    setConfirm({
      title: 'Eliminar chat',
      body: chatType === 'GROUP'
        ? '¿Salir y eliminar este grupo?'
        : '¿Eliminar esta conversación? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        setConfirm(null)
        try {
          await chatApi.deleteChat(chatId)
          removeChat(chatId)
          queryClient.setQueryData(['chats'], (old: ChatListItem[] | undefined) =>
            old?.filter((c) => c.id !== chatId) ?? []
          )
        } catch { /* silent */ }
      },
    })
  }

  /* ── Sort: pinned first, then by lastMessageAt ── */
  const visibleChats = chats
    .filter((c) => !c.isArchived && (c.name ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1
      return (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')
    })

  const renderChatItem = (chat: ChatListItem) => (
    <button
      key={chat.id}
      onClick={() => setActiveChat(chat.id)}
      onContextMenu={(e) => openCtx(e, chat)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors relative
        ${activeChatId === chat.id
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
        }`}
    >
      {/* Pin indicator */}
      {chat.isPinned && (
        <span style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: 10, color: '#9aaa82',
        }}>
          📌
        </span>
      )}
      <UserAvatar
        userId={chat.type === 'PRIVATE' ? chat.otherUserId : undefined}
        name={chat.name ?? '?'}
        size={48}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
            {chat.name}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {formatTime(chat.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {chat.lastMessage ?? <span className="italic text-gray-400">Sin mensajes</span>}
          </p>
          {chat.unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-primary-500 text-white text-xs font-semibold flex items-center justify-center px-1">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )

  /* ── Context menu positioning: flip up if near bottom ── */
  const ctxStyle = (): React.CSSProperties => {
    if (!ctx) return {}
    const MENU_H = 340
    const top = ctx.y + MENU_H > window.innerHeight ? ctx.y - MENU_H : ctx.y
    return { position: 'fixed', top, left: ctx.x, zIndex: 1000 }
  }

  const menuItem = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    danger = false,
  ) => (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', border: 'none', background: 'none',
        cursor: 'pointer', textAlign: 'left', fontSize: 13,
        color: danger ? '#c0392b' : '#242d16',
        fontFamily: "'Poppins',system-ui,sans-serif",
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? 'rgba(192,57,43,0.06)' : 'rgba(122,144,72,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Search bar + buttons */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar chats..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full
                         text-gray-900 dark:text-gray-100 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
          <button
            onClick={() => setShowGroupDialog(true)}
            title="Nuevo grupo"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowModal(true)}
            title="Nuevo chat"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => <ChatItemSkeleton key={i} />)
            : visibleChats.length === 0
              ? (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-10 px-4">
                  {search ? 'Sin resultados' : 'Aún no tienes chats'}
                </p>
              )
              : visibleChats.map(renderChatItem)
          }
        </div>
      </div>

      {/* ── Context menu ── */}
      {ctx && (
        <div
          ref={menuRef}
          style={{
            ...ctxStyle(),
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            border: '1px solid rgba(0,0,0,0.06)',
            minWidth: 210,
            overflow: 'hidden',
            fontFamily: "'Poppins',system-ui,sans-serif",
          }}
        >
          {/* Archive */}
          {menuItem(
            ctx.isArchived ? 'Desarchivar chat' : 'Archivar chat',
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4h4" />
            </svg>,
            doArchive,
          )}

          {/* Mute */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setCtx((c) => c ? { ...c, muteOpen: !c.muteOpen } : c)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', border: 'none', background: 'none',
                cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#242d16',
                fontFamily: "'Poppins',system-ui,sans-serif",
                transition: 'background 0.12s',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122,144,72,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Silenciar notificaciones
              </span>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {ctx.muteOpen && (
              <div style={{
                position: 'absolute', left: '100%', top: 0,
                background: '#fff', borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid rgba(0,0,0,0.06)',
                minWidth: 160, overflow: 'hidden',
              }}>
                {MUTE_OPTIONS.map((opt) => menuItem(opt.label, <></>, () => doMute(opt.minutes)))}
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
                {menuItem('Activar sonido', <></>, doUnmute)}
              </div>
            )}
          </div>

          {/* Pin */}
          {menuItem(
            ctx.isPinned ? 'Desfijar chat' : 'Fijar chat',
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>,
            doPin,
          )}

          {/* Mark unread */}
          {menuItem(
            'Marcar como no leído',
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>,
            doMarkUnread,
          )}

          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />

          {/* Delete */}
          {menuItem(
            ctx.chatType === 'GROUP' ? 'Salir del grupo' : 'Eliminar chat',
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>,
            doDelete,
            true,
          )}
        </div>
      )}

      {/* ── Confirm dialog ── */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, padding: '28px 28px 20px',
            width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            fontFamily: "'Poppins',system-ui,sans-serif",
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#242d16', margin: '0 0 8px' }}>
              {confirm.title}
            </p>
            <p style={{ fontSize: 13, color: '#8a9a7a', margin: '0 0 20px', lineHeight: 1.5 }}>
              {confirm.body}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirm(null)}
                style={{
                  padding: '8px 18px', borderRadius: 10,
                  border: '1.5px solid rgba(122,144,72,0.25)',
                  background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6a7a5a',
                  fontFamily: "'Poppins',system-ui,sans-serif",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirm.onConfirm}
                style={{
                  padding: '8px 18px', borderRadius: 10,
                  border: 'none', background: '#c0392b', color: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: "'Poppins',system-ui,sans-serif",
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && <NewChatModal onClose={() => setShowModal(false)} />}
      {showGroupDialog && <CreateGroupDialog onClose={() => setShowGroupDialog(false)} />}
    </>
  )
}
