import { useMemo, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useAuth } from '../hooks/useAuth'
import { useSocket, useAllChatsNotifications } from '../hooks/useSocket'
import { ChatList } from '../features/chat/components/ChatList'
import { ChatWindow } from '../features/chat/components/ChatWindow'
import { CallManager } from '../features/calls/components/CallManager'
import { NavRail } from '../features/settings/components/NavRail'
import { StoriesList } from '../features/stories/components/StoriesList'
import { StoriesPanel } from '../features/stories/components/StoriesPanel'
import { useTheme } from '../hooks/useTheme'
import { useNotifications } from '../hooks/useNotifications'
import type { StoryUserGroupDTO } from '../types/story'

type Section = 'chats' | 'stories'

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export function MainLayout() {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const chats = useChatStore((s) => s.chats)
  const chatIds = useMemo(() => chats.map((c) => c.id), [chats])
  useSocket()
  useAllChatsNotifications(chatIds)
  useTheme()
  useNotifications()

  const [section, setSection] = useState<Section>('chats')
  const [activeStory, setActiveStory] = useState<{ groups: StoryUserGroupDTO[]; groupIdx: number } | null>(null)

  const handleSelectGroup = (groups: StoryUserGroupDTO[], groupIdx: number) => {
    setActiveStory({ groups, groupIdx })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        :root { --sidebar-w: 320px; }
        .logout-btn { transition: all 0.2s ease; }
        .logout-btn:hover { color: #c0392b !important; background: rgba(192,57,43,0.08) !important; }
        .main-layout-root * { font-family: 'Poppins', system-ui, sans-serif; }
      `}</style>

      <div className="main-layout-root" style={{
        display: 'flex', height: '100vh',
        background: 'linear-gradient(155deg, #f0f3e6 0%, #e8ecda 40%, #f5f6f0 100%)',
        overflow: 'hidden',
      }}>

        {/* ══════════ NAV RAIL ══════════ */}
        <NavRail activeTab="chat" />

        {/* ══════════ SIDEBAR ══════════ */}
        <aside style={{
          width: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', flexShrink: 0,
          background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(122,144,72,0.16)',
          boxShadow: '2px 0 20px rgba(0,0,0,0.04)', zIndex: 10,
        }}>

          {/* ── Header ── */}
          <div style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid rgba(122,144,72,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11,
                background: 'linear-gradient(135deg, #7a9048, #91a662)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, boxShadow: '0 4px 12px rgba(122,144,72,0.25)',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#242d16', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                  {user?.name}
                </p>
                {user?.statusText && (
                  <p style={{ fontSize: 11, color: '#8a9a7a', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                    {user.statusText}
                  </p>
                )}
              </div>
            </div>
            <button onClick={logout} title="Cerrar sesión" className="logout-btn" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 9, border: 'none',
              background: 'transparent', color: '#9aaa82', cursor: 'pointer', flexShrink: 0,
            }}>
              <LogoutIcon />
            </button>
          </div>

          {/* ── Section tabs ── */}
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(122,144,72,0.12)',
          }}>
            {(['chats', 'stories'] as Section[]).map((s) => (
              <button
                key={s}
                onClick={() => { setSection(s); if (s === 'chats') setActiveStory(null) }}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                  background: 'none', fontSize: 13, fontWeight: section === s ? 600 : 400,
                  color: section === s ? '#7a9048' : '#9aaa82',
                  borderBottom: section === s ? '2px solid #7a9048' : '2px solid transparent',
                  transition: 'all .15s', fontFamily: "'Poppins',system-ui,sans-serif",
                  marginBottom: -1,
                }}
              >
                {s === 'chats' ? 'Chats' : 'Historias'}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {section === 'chats'
              ? <ChatList />
              : <StoriesList onSelectGroup={handleSelectGroup} />
            }
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '10px 20px', borderTop: '1px solid rgba(122,144,72,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 10, color: '#91a662', fontWeight: 600, letterSpacing: '.1em' }}>WHISPR</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#ccd9a0' }} />
            <span style={{ fontSize: 10, color: '#b8c890' }}>cifrado de extremo a extremo</span>
          </div>
        </aside>

        {/* ══════════ MAIN PANEL ══════════ */}
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {section === 'stories' && activeStory ? (
            <StoriesPanel
              groups={activeStory.groups}
              initialGroupIndex={activeStory.groupIdx}
              onClose={() => setActiveStory(null)}
            />
          ) : section === 'stories' ? (
            /* Stories placeholder */
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              color: '#9aaa82',
            }}>
              <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M2 21a10 10 0 0 1 20 0" />
              </svg>
              <p style={{ fontSize: 14, color: '#9aaa82', margin: 0 }}>Selecciona una historia para verla</p>
            </div>
          ) : (
            <ChatWindow />
          )}
        </main>

        <CallManager />
      </div>
    </>
  )
}
