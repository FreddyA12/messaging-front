import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '../../../store/chatStore'
import { chatApi } from '../api'
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

const MUTE_OPTIONS = [
  { label: '1 hora', minutes: 60 },
  { label: '8 horas', minutes: 480 },
  { label: '1 semana', minutes: 10_080 },
  { label: 'Siempre', minutes: 525_600 },
]

interface ContextMenuState {
  chatId: number
  chatType: 'PRIVATE' | 'GROUP'
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

interface ArchivedChatListProps {
  onSwitchToChats: () => void
}

export function ArchivedChatList({ onSwitchToChats }: ArchivedChatListProps) {
  const queryClient = useQueryClient()
  const { chats, activeChatId, setActiveChat, setChatArchived, setChatPinned, removeChat, markChatUnread } = useChatStore()
  const archivedChats = chats.filter((c) => c.isArchived)

  const [ctx, setCtx] = useState<ContextMenuState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
      isPinned: !!chat.isPinned,
      x: e.clientX,
      y: e.clientY,
      muteOpen: false,
    })
  }

  /* ── Context menu actions ── */
  const doUnarchive = async () => {
    if (!ctx) return
    const { chatId } = ctx
    setCtx(null)
    try {
      await chatApi.unarchiveChat(chatId)
      setChatArchived(chatId, false)
      queryClient.setQueryData(['chats'], (old: ChatListItem[] | undefined) =>
        old?.map((c) => c.id === chatId ? { ...c, isArchived: false } : c) ?? []
      )
      onSwitchToChats()
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

  /* ── Context menu positioning ── */
  const ctxStyle = (): React.CSSProperties => {
    if (!ctx) return {}
    const MENU_H = 300
    const top = ctx.y + MENU_H > window.innerHeight ? ctx.y - MENU_H : ctx.y
    return { position: 'fixed', top, left: ctx.x, zIndex: 1000 }
  }

  const menuItem = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
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

  if (archivedChats.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: '48px 24px', color: '#9aaa82',
        fontFamily: "'Poppins',system-ui,sans-serif",
      }}>
        <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
        </svg>
        <p style={{ fontSize: 14, margin: 0 }}>No hay chats archivados</p>
      </div>
    )
  }

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {archivedChats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            onContextMenu={(e) => openCtx(e, chat)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px', border: 'none', textAlign: 'left',
              background: activeChatId === chat.id ? 'rgba(122,144,72,0.1)' : 'none',
              cursor: 'pointer', fontFamily: "'Poppins',system-ui,sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (activeChatId !== chat.id) e.currentTarget.style.background = 'rgba(122,144,72,0.06)' }}
            onMouseLeave={(e) => { if (activeChatId !== chat.id) e.currentTarget.style.background = 'none' }}
          >
            <UserAvatar
              userId={chat.type === 'PRIVATE' ? chat.otherUserId : undefined}
              name={chat.name ?? '?'}
              size={48}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {chat.name ?? '?'}
                </span>
                <span style={{ fontSize: 11, color: '#9aaa82', flexShrink: 0 }}>
                  {formatTime(chat.lastMessageAt)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <p style={{
                  fontSize: 12, color: '#9aaa82', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {chat.lastMessage ?? <span style={{ fontStyle: 'italic' }}>Sin mensajes</span>}
                </p>
                {chat.unreadCount > 0 && (
                  <span style={{
                    flexShrink: 0, minWidth: 20, height: 20, borderRadius: 10,
                    background: '#7a9048', color: '#fff',
                    fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                  }}>
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
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
          {/* Unarchive */}
          {menuItem(
            'Desarchivar chat',
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4h4" />
            </svg>,
            doUnarchive,
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
    </>
  )
}
