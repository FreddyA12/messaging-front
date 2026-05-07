import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { UserAvatar } from '../components/UserAvatar'
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
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()
  const chats = useChatStore((s) => s.chats)
  const activeChatId = useChatStore((s) => s.activeChatId)
  const setActiveChat = useChatStore((s) => s.setActiveChat)
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

  /* True when the main panel should be visible on mobile */
  const chatPanelActive = !!activeChatId || section === 'stories'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        :root { --sidebar-w: 320px; --nav-h: 56px; }
        .logout-btn { transition: all 0.2s ease; }
        .logout-btn:hover { color: #c0392b !important; background: rgba(192,57,43,0.08) !important; }
        .main-layout-root * { font-family: 'Poppins', system-ui, sans-serif; }

        /* Bottom padding so content doesn't go under the mobile nav bar */
        @media (max-width: 767px) {
          .main-layout-root { padding-bottom: var(--nav-h); }
          /* NavRail hidden on mobile */
          .layout-navrail { display: none !important; }
          /* Sidebar is full-width on mobile */
          .layout-sidebar { width: 100% !important; border-right: none !important; }
          /* Bottom nav visible on mobile */
          .layout-bottom-nav { display: flex !important; }
        }
        /* Tablet: no NavRail, narrower sidebar */
        @media (min-width: 768px) and (max-width: 1023px) {
          .layout-navrail { display: none !important; }
          .layout-sidebar { width: 260px !important; }
        }
      `}</style>

      <div className="main-layout-root" style={{
        display: 'flex', height: '100vh',
        background: 'var(--bg-page)',
        overflow: 'hidden',
      }}>

        {/* ══════════ NAV RAIL (desktop/tablet hidden via CSS) ══════════ */}
        <div className="layout-navrail" style={{ display: 'flex' }}>
          <NavRail activeTab="chat" />
        </div>

        {/* ══════════ SIDEBAR ══════════ */}
        {/* On mobile: hidden when chat panel is active via Tailwind hidden/md:flex */}
        <aside
          className={`layout-sidebar flex-col shrink-0 ${chatPanelActive ? 'hidden md:flex' : 'flex'}`}
          style={{
            width: 'var(--sidebar-w)',
            background: 'var(--bg-sidebar)', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--border-subtle)',
            boxShadow: '2px 0 20px rgba(0,0,0,0.06)', zIndex: 10,
          }}
        >
          {/* ── Header ── */}
          <div style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            background: 'var(--bg-sidebar-header)',
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
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                  {user?.name}
                </p>
                {user?.statusText && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                    {user.statusText}
                  </p>
                )}
              </div>
            </div>
            <button onClick={logout} title="Cerrar sesión" className="logout-btn" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: 9, border: 'none',
              background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', flexShrink: 0,
            }}>
              <LogoutIcon />
            </button>
          </div>

          {/* ── Section tabs ── */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
            {(['chats', 'stories'] as Section[]).map((s) => (
              <button
                key={s}
                onClick={() => { setSection(s); if (s === 'chats') setActiveStory(null) }}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                  background: 'none', fontSize: 13, fontWeight: section === s ? 600 : 400,
                  color: section === s ? '#7a9048' : 'var(--color-text-muted)',
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
            padding: '10px 20px', borderTop: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 10, color: '#91a662', fontWeight: 600, letterSpacing: '.1em' }}>WHISPR</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--color-text-muted)' }} />
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>cifrado de extremo a extremo</span>
          </div>
        </aside>

        {/* ══════════ MAIN PANEL ══════════ */}
        {/* On mobile: hidden when no chat is active */}
        <main
          className={`flex overflow-hidden ${!chatPanelActive ? 'hidden md:flex' : 'flex'}`}
          style={{ flex: 1 }}
        >
          {section === 'stories' && activeStory ? (
            <StoriesPanel
              groups={activeStory.groups}
              initialGroupIndex={activeStory.groupIdx}
              onClose={() => setActiveStory(null)}
            />
          ) : section === 'stories' ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              color: 'var(--color-text-muted)',
            }}>
              <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M2 21a10 10 0 0 1 20 0" />
              </svg>
              <p style={{ fontSize: 14, color: '#9aaa82', margin: 0 }}>Selecciona una historia para verla</p>
            </div>
          ) : (
            <ChatWindow onBack={() => setActiveChat(null)} />
          )}
        </main>

        {/* ══════════ BOTTOM NAV (mobile only, shown via CSS) ══════════ */}
        <nav className="layout-bottom-nav" style={{
          display: 'none',
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 'var(--nav-h)',
          background: 'var(--bg-sidebar)', backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border-subtle)',
          alignItems: 'center', justifyContent: 'space-around',
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <BottomNavBtn
            active={section === 'chats'}
            label="Chats"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
            onClick={() => { setSection('chats'); setActiveStory(null); setActiveChat(null) }}
          />
          <BottomNavBtn
            active={section === 'stories'}
            label="Historias"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M2 21a10 10 0 0 1 20 0" />
              </svg>
            }
            onClick={() => { setSection('stories'); setActiveStory(null); setActiveChat(null) }}
          />
          <button
            onClick={() => navigate('/settings')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 16px',
              color: '#9aaa82',
            }}
          >
            <UserAvatar userId={user?.id} name={user?.name ?? 'U'} size={22} />
            <span style={{ fontSize: 10, fontFamily: "'Poppins',system-ui,sans-serif" }}>Perfil</span>
          </button>
        </nav>

        <CallManager />
      </div>
    </>
  )
}

function BottomNavBtn({
  active, label, icon, onClick,
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer', padding: '6px 16px',
        color: active ? '#7a9048' : '#9aaa82',
        fontFamily: "'Poppins',system-ui,sans-serif",
      }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
    </button>
  )
}
