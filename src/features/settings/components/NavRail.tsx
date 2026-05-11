import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { useCallStore } from '../../../store/callStore'
import { UserAvatar } from '../../../components/UserAvatar'

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const StoriesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M2 21a10 10 0 0 1 20 0" />
  </svg>
)

const CallsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
)

const ArchiveIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8m-9 4h4" />
  </svg>
)

type ActiveTab = 'chat' | 'stories' | 'calls' | 'archived' | 'settings'
type SectionKey = 'chats' | 'stories' | 'calls' | 'archived'

interface NavRailProps {
  activeTab?: ActiveTab
  onSectionChange?: (section: SectionKey) => void
}

export function NavRail({ activeTab = 'chat', onSectionChange }: NavRailProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const missedCallsCount = useCallStore((s) => s.missedCallsCount)

  const btnBase: React.CSSProperties = {
    width: '44px', height: '44px',
    borderRadius: '14px', border: 'none', background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.2s ease',
    position: 'relative',
  }

  const activeStyle: React.CSSProperties = {
    background: 'rgba(122,144,72,0.14)',
    color: '#637839',
  }

  const inactiveStyle: React.CSSProperties = {
    color: '#9aaa82',
  }

  const activeIndicator = (
    <span style={{
      position: 'absolute', left: '4px', top: '50%',
      transform: 'translateY(-50%)',
      width: '3px', height: '20px', borderRadius: '2px',
      background: '#7a9048',
    }} />
  )

  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
    if (!isActive) {
      e.currentTarget.style.background = 'rgba(122,144,72,0.08)'
      e.currentTarget.style.color = '#7a9048'
    }
  }

  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>, isActive: boolean) => {
    if (!isActive) {
      e.currentTarget.style.background = 'transparent'
      e.currentTarget.style.color = '#9aaa82'
    }
  }

  const navBtn = (tab: ActiveTab, section: SectionKey, icon: React.ReactNode, title: string, badge?: number) => {
    const isActive = activeTab === tab
    return (
      <button
        onClick={() => onSectionChange?.(section)}
        title={title}
        style={{ ...btnBase, ...(isActive ? activeStyle : inactiveStyle) }}
        onMouseEnter={(e) => hoverOn(e, isActive)}
        onMouseLeave={(e) => hoverOff(e, isActive)}
      >
        {icon}
        {isActive && activeIndicator}
        {!!badge && badge > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#c0392b', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            boxShadow: '0 1px 4px rgba(192,57,43,0.4)',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <nav style={{
      width: '64px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '14px 0',
      background: 'var(--bg-sidebar)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRight: '1px solid rgba(122,144,72,0.12)',
      boxShadow: '1px 0 12px rgba(0,0,0,0.03)',
      gap: '6px',
      zIndex: 20,
    }}>

      {/* Logo */}
      <div style={{
        width: '36px', height: '36px', borderRadius: '11px',
        background: 'linear-gradient(135deg, #7a9048, #91a662)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '16px', flexShrink: 0,
        boxShadow: '0 3px 10px rgba(122,144,72,0.28)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {navBtn('chat', 'chats', <ChatIcon />, 'Mensajes')}
      {navBtn('stories', 'stories', <StoriesIcon />, 'Estados')}
      {navBtn('calls', 'calls', <CallsIcon />, 'Llamadas', missedCallsCount)}
      {navBtn('archived', 'archived', <ArchiveIcon />, 'Archivados')}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Profile avatar */}
      <button
        onClick={() => navigate('/settings')}
        title="Perfil y ajustes"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          borderRadius: '50%', outline: 'none',
          boxShadow: activeTab === 'settings' ? '0 0 0 2.5px #7a9048' : 'none',
          transition: 'box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (activeTab !== 'settings') e.currentTarget.style.boxShadow = '0 0 0 2px rgba(122,144,72,0.4)'
        }}
        onMouseLeave={(e) => {
          if (activeTab !== 'settings') e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <UserAvatar userId={user?.id} name={user?.name ?? 'U'} size={34}
          style={{ boxShadow: '0 2px 10px rgba(122,144,72,0.3)' }} />
      </button>
    </nav>
  )
}
