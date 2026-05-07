import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'

/* ── Icons ─────────────────────────────────────────── */
const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const ProfileIcon = ({ name }: { name: string }) => (
  <div style={{
    width: '34px', height: '34px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #7a9048, #91a662)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '13px',
    letterSpacing: '-0.02em',
    boxShadow: '0 2px 10px rgba(122,144,72,0.3)',
    flexShrink: 0,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  }}>
    {name[0]?.toUpperCase()}
  </div>
)

interface NavRailProps {
  activeTab?: 'chat' | 'settings'
}

export function NavRail({ activeTab = 'chat' }: NavRailProps) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

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

  return (
    <nav style={{
      width: '64px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '14px 0',
      background: 'rgba(255,255,255,0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRight: '1px solid rgba(122,144,72,0.12)',
      boxShadow: '1px 0 12px rgba(0,0,0,0.03)',
      gap: '6px',
      zIndex: 20,
    }}>

      {/* ── Logo ── */}
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

      {/* ── Chats ── */}
      <button
        id="nav-chats"
        onClick={() => navigate('/')}
        title="Mensajes"
        style={{
          ...btnBase,
          ...(activeTab === 'chat' ? activeStyle : inactiveStyle),
        }}
        onMouseEnter={(e) => {
          if (activeTab !== 'chat') {
            e.currentTarget.style.background = 'rgba(122,144,72,0.08)'
            e.currentTarget.style.color = '#7a9048'
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== 'chat') {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#9aaa82'
          }
        }}
      >
        <ChatIcon />
        {/* active indicator */}
        {activeTab === 'chat' && (
          <span style={{
            position: 'absolute', left: '4px', top: '50%',
            transform: 'translateY(-50%)',
            width: '3px', height: '20px', borderRadius: '2px',
            background: '#7a9048',
          }} />
        )}
      </button>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Profile avatar ── */}
      <button
        id="nav-profile"
        onClick={() => navigate('/settings')}
        title="Perfil y ajustes"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          borderRadius: '50%', outline: 'none',
          boxShadow: activeTab === 'settings' ? '0 0 0 2.5px #7a9048' : 'none',
          transition: 'box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (activeTab !== 'settings') {
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(122,144,72,0.4)'
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== 'settings') {
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        <ProfileIcon name={user?.name ?? 'U'} />
      </button>
    </nav>
  )
}
