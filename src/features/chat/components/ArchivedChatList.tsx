import { useChatStore } from '../../../store/chatStore'
import { chatApi } from '../api'
import { UserAvatar } from '../../../components/UserAvatar'

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

export function ArchivedChatList() {
  const { chats, activeChatId, setActiveChat, setChatArchived } = useChatStore()
  const archivedChats = chats.filter((c) => c.isArchived)

  const unarchive = async (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation()
    try {
      await chatApi.unarchiveChat(chatId)
      setChatArchived(chatId, false)
    } catch {
      /* silent */
    }
  }

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
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {archivedChats.map((chat) => (
        <div
          key={chat.id}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <button
            onClick={() => setActiveChat(chat.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 12,
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
              name={chat.name}
              size={48}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, color: '#242d16',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {chat.name}
                </span>
                <span style={{ fontSize: 11, color: '#9aaa82', flexShrink: 0 }}>
                  {formatTime(chat.lastMessageAt)}
                </span>
              </div>
              <p style={{
                fontSize: 12, color: '#9aaa82', margin: '2px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {chat.lastMessage ?? <span style={{ fontStyle: 'italic' }}>Sin mensajes</span>}
              </p>
            </div>
          </button>

          {/* Unarchive button */}
          <button
            onClick={(e) => unarchive(e, chat.id)}
            title="Desarchivar"
            style={{
              flexShrink: 0, marginRight: 10, width: 30, height: 30,
              borderRadius: 8, border: 'none', background: 'none',
              cursor: 'pointer', color: '#9aaa82',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#7a9048'
              e.currentTarget.style.background = 'rgba(122,144,72,0.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9aaa82'
              e.currentTarget.style.background = 'none'
            }}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4h4" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
