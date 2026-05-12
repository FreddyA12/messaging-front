import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useCallStore } from '../store/callStore'
import { callApi } from '../features/calls/api'
import { useSocket, useAllChatsNotifications } from '../hooks/useSocket'
import { ChatList } from '../features/chat/components/ChatList'
import { ChatWindow } from '../features/chat/components/ChatWindow'
import { CallManager } from '../features/calls/components/CallManager'
import { CallHistoryList } from '../features/calls/components/CallHistoryList'
import { ArchivedChatList } from '../features/chat/components/ArchivedChatList'
import { NavRail } from '../features/settings/components/NavRail'
import { StoriesList } from '../features/stories/components/StoriesList'
import { StoriesPanel } from '../features/stories/components/StoriesPanel'
import { useTheme } from '../hooks/useTheme'
import { useNotifications } from '../hooks/useNotifications'
import { UserAvatar } from '../components/UserAvatar'
import type { StoryUserGroupDTO } from '../types/story'

type Section = 'chats' | 'stories' | 'calls' | 'archived'

const SECTION_TITLES: Record<Section, string> = {
  chats: 'Chats',
  stories: 'Estados',
  calls: 'Llamadas',
  archived: 'Archivados',
}

export function MainLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
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

  const { setMissedCallsCount, clearMissedCalls, missedCallsCount } = useCallStore()
  const currentUserId = user?.id

  // Count only missed calls newer than the last time the user opened the calls section
  useEffect(() => {
    const lastViewedStr = localStorage.getItem('calls_last_viewed_at')
    const lastViewed = lastViewedStr ? new Date(lastViewedStr) : null

    callApi.history()
      .then((calls) => {
        const missed = calls.filter((c) => {
          if (c.calleeId !== currentUserId) return false
          if (c.status !== 'MISSED' && c.status !== 'REJECTED') return false
          if (!lastViewed) return true
          const callTime = c.endedAt ?? c.startedAt
          return callTime ? new Date(callTime) > lastViewed : true
        }).length
        setMissedCallsCount(missed)
      })
      .catch(() => {})
  }, [currentUserId, setMissedCallsCount])

  const handleSelectGroup = (groups: StoryUserGroupDTO[], groupIdx: number) => {
    setActiveStory({ groups, groupIdx })
  }

  const handleSectionChange = (s: Section) => {
    setSection(s)
    if (s !== 'stories') setActiveStory(null)
    if (s !== 'chats') setActiveChat(null)
    if (s === 'calls') {
      localStorage.setItem('calls_last_viewed_at', new Date().toISOString())
      clearMissedCalls()
    }
  }

  /* On mobile: sidebar hides when a chat is open, or when in stories with a story selected */
  const chatPanelActive = !!activeChatId || (section === 'stories' && !!activeStory)

  const navActiveTab = section === 'stories' ? 'stories'
    : section === 'calls' ? 'calls'
    : section === 'archived' ? 'archived'
    : 'chat'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        :root { --sidebar-w: 320px; --nav-h: 56px; }
        .main-layout-root * { font-family: 'Poppins', system-ui, sans-serif; }

        @media (max-width: 767px) {
          .main-layout-root { padding-bottom: var(--nav-h); }
          .layout-navrail { display: none !important; }
          .layout-sidebar { width: 100% !important; border-right: none !important; }
          .layout-bottom-nav { display: flex !important; }
        }
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

        {/* ══════════ NAV RAIL (desktop) ══════════ */}
        <div className="layout-navrail" style={{ display: 'flex' }}>
          <NavRail
            activeTab={navActiveTab}
            onSectionChange={handleSectionChange}
          />
        </div>

        {/* ══════════ SIDEBAR ══════════ */}
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
            background: 'var(--bg-sidebar-header)',
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
              {SECTION_TITLES[section]}
            </h2>
          </div>

          {/* ── Content ── */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {section === 'chats' && <ChatList />}
            {section === 'stories' && <StoriesList onSelectGroup={handleSelectGroup} />}
            {section === 'calls' && <CallHistoryList />}
            {section === 'archived' && <ArchivedChatList onSwitchToChats={() => handleSectionChange('chats')} />}
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

        {/* ══════════ BOTTOM NAV (mobile only) ══════════ */}
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
            onClick={() => handleSectionChange('chats')}
          />
          <BottomNavBtn
            active={section === 'stories'}
            label="Estados"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M2 21a10 10 0 0 1 20 0" />
              </svg>
            }
            onClick={() => handleSectionChange('stories')}
          />
          <BottomNavBtn
            active={section === 'calls'}
            label="Llamadas"
            badge={missedCallsCount}
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
            onClick={() => handleSectionChange('calls')}
          />
          <BottomNavBtn
            active={section === 'archived'}
            label="Archivados"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4h4" />
              </svg>
            }
            onClick={() => handleSectionChange('archived')}
          />
          <button
            onClick={() => navigate('/settings')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
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
  active, label, icon, onClick, badge = 0,
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  onClick: () => void
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
        color: active ? '#7a9048' : '#9aaa82',
        fontFamily: "'Poppins',system-ui,sans-serif",
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative' }}>
        {icon}
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -6,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#c0392b', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
    </button>
  )
}
