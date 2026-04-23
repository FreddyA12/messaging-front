import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import { useAppearanceStore, PALETTES, CHAT_BACKGROUNDS, type ThemeMode, type ChatBg, type Palette } from '../../store/appearanceStore'

type Section = 'profile' | 'chats' | 'notifications' | 'account'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'profile',       label: 'Perfil',          icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'chats',         label: 'Chats',            icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { id: 'notifications', label: 'Notificaciones',   icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
  { id: 'account',       label: 'Cuenta',           icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
]

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: on ? 'var(--color-primary, #7a9048)' : '#d4dcc0',
      position: 'relative', transition: 'background .25s', flexShrink: 0,
      boxShadow: on ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
    }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
      }} />
    </button>
  )
}

function Row({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 14, background: 'rgba(122,144,72,.06)', gap: 12 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#242d16', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#8a9a7a' }}>{desc}</p>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

/* ── Profile Section ───────────────────────────────── */
function ProfileSection() {
  const user = useAuthStore(s => s.user)
  const status = useAppearanceStore(s => s.localStatus)
  const setStatus = useAppearanceStore(s => s.setLocalStatus)
  const [editingStatus, setEditingStatus] = useState(false)
  const [draft, setDraft] = useState(status || user?.statusText || '')
  const displayStatus = status || user?.statusText || 'Hola, estoy usando Whispr'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Avatar + thought bubble */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, position: 'relative', paddingBottom: 16 }}>
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7a9048,#91a662)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 36,
          boxShadow: '0 6px 24px rgba(122,144,72,.28)',
        }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>

        {/* Thought bubble */}
        <div style={{ position: 'relative', marginTop: 8 }}>
          {/* bubble dots connector */}
          <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(122,144,72,.4)' }} />
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(122,144,72,.3)' }} />
          </span>
          <div style={{
            background: '#fff', borderRadius: 20, border: '1.5px solid rgba(122,144,72,.2)',
            padding: '10px 18px', maxWidth: 260, boxShadow: '0 4px 18px rgba(0,0,0,.08)',
          }}>
            {editingStatus ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  maxLength={140}
                  style={{ fontSize: 13, border: 'none', outline: 'none', flex: 1, fontFamily: "'Poppins',system-ui,sans-serif", color: '#242d16' }}
                  onKeyDown={e => { if (e.key === 'Enter') { setStatus(draft); setEditingStatus(false) } if (e.key === 'Escape') setEditingStatus(false) }}
                />
                <button onClick={() => { setStatus(draft); setEditingStatus(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7a9048', fontSize: 12, fontWeight: 600 }}>✓</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 13, color: '#5a6a4a', flex: 1 }}>{displayStatus}</p>
                <button onClick={() => { setDraft(displayStatus); setEditingStatus(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aaa82', flexShrink: 0 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        <p style={{ marginTop: 12, fontSize: 18, fontWeight: 700, color: '#242d16' }}>{user?.name}</p>
        <p style={{ fontSize: 12, color: '#8a9a7a' }}>{user?.email}</p>
        <button style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: '#7a9048', background: 'rgba(122,144,72,.1)', border: '1.5px solid rgba(122,144,72,.2)', borderRadius: 20, padding: '6px 18px', cursor: 'pointer' }}>
          Cambiar foto
        </button>
      </div>
    </div>
  )
}

/* ── Chats Section ─────────────────────────────────── */
function ChatsSection() {
  const { theme, chatBackground, palette, setTheme, setChatBackground, setPalette } = useAppearanceStore()
  const [enterSend, setEnterSend] = useState(true)
  const [readReceipts, setReadReceipts] = useState(true)
  const [mediaSave, setMediaSave] = useState(false)

  const THEMES: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light',  label: 'Claro',   icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> },
    { value: 'dark',   label: 'Oscuro',  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
    { value: 'system', label: 'Sistema', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
  ]

  const card: React.CSSProperties = { padding: '8px 10px', borderRadius: 14, border: '2px solid transparent', cursor: 'pointer', transition: 'all .2s', textAlign: 'center', fontSize: 12, fontWeight: 500 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* APARIENCIA */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7a9048', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 14 }}>Apariencia</p>

        <div style={{ display: 'flex', gap: 32, alignItems: 'stretch' }}>
          {/* Configuración a la izquierda */}
          <div style={{ flex: 1 }}>
            {/* Theme */}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242d16', marginBottom: 10 }}>Tema</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {THEMES.map(t => (
                <button key={t.value} onClick={() => setTheme(t.value)} style={{
                  ...card, flex: 1,
                  background: theme === t.value ? 'rgba(122,144,72,.12)' : '#f5f6f0',
                  borderColor: theme === t.value ? '#7a9048' : 'transparent',
                  color: theme === t.value ? '#637839' : '#6a7a5a',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <div>{t.icon}</div>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Chat background */}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242d16', marginBottom: 10 }}>Fondo del chat</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
              {(Object.entries(CHAT_BACKGROUNDS) as [ChatBg, typeof CHAT_BACKGROUNDS[ChatBg]][]).map(([key, val]) => (
                <button key={key} onClick={() => setChatBackground(key)} title={val.label} style={{
                  height: 56, borderRadius: 12, border: `2.5px solid ${chatBackground === key ? '#7a9048' : 'transparent'}`,
                  background: val.preview, cursor: 'pointer', transition: 'all .2s',
                  boxShadow: chatBackground === key ? '0 0 0 3px rgba(122,144,72,.2)' : 'none',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {chatBackground === key && (
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              {(Object.entries(CHAT_BACKGROUNDS) as [ChatBg, typeof CHAT_BACKGROUNDS[ChatBg]][]).map(([key, val]) => (
                <span key={key} style={{ fontSize: 11, color: '#8a9a7a' }}>{val.label}</span>
              ))}
            </div>

            {/* Accent palette */}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242d16', margin: '20px 0 10px' }}>Color de acento</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {(Object.entries(PALETTES) as [Palette, typeof PALETTES[Palette]][]).map(([key, val]) => (
                <button key={key} onClick={() => setPalette(key)} title={val.label} style={{
                  width: 36, height: 36, borderRadius: '50%', border: `3px solid ${palette === key ? val.primary : 'transparent'}`,
                  background: val.swatch, cursor: 'pointer', transition: 'all .2s',
                  boxShadow: palette === key ? `0 0 0 3px ${val.primary}40` : 'none',
                }} />
              ))}
            </div>
          </div>

          {/* Vista previa a la derecha */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242d16', marginBottom: 10 }}>Vista previa en vivo</p>
            <div style={{
              flex: 1, minHeight: 180, borderRadius: 16, padding: '20px 16px',
              background: CHAT_BACKGROUNDS[chatBackground]?.style || CHAT_BACKGROUNDS.default.style,
              border: '1px solid rgba(122,144,72,.15)',
              display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden'
            }}>
              {/* Incoming message */}
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.9)', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 13, color: '#242d16', boxShadow: '0 2px 4px rgba(0,0,0,.04)', maxWidth: '85%' }}>
                ¡Hola! ¿Qué te parece esta nueva interfaz? ✨
              </div>
              {/* Outgoing message */}
              <div style={{ alignSelf: 'flex-end', background: PALETTES[palette]?.primary || PALETTES.olive.primary, padding: '10px 14px', borderRadius: '16px 16px 4px 16px', fontSize: 13, color: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.08)', maxWidth: '85%' }}>
                ¡Me encanta! Queda muy profesional y moderno.
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><path d="M18 6L7 17l-5-5"/><path d="M22 10l-5.5 5.5"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPORTAMIENTO */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7a9048', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 14 }}>Comportamiento</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row label="Enter para enviar" desc="Presiona Enter para enviar mensajes" on={enterSend} onChange={() => setEnterSend(v => !v)} />
          <Row label="Confirmaciones de lectura" desc="Permite que otros vean cuando lees" on={readReceipts} onChange={() => setReadReceipts(v => !v)} />
          <Row label="Guardar medios automáticamente" desc="Las imágenes se guardan al recibirlas" on={mediaSave} onChange={() => setMediaSave(v => !v)} />
        </div>
      </div>
    </div>
  )
}

/* ── Notifications ─────────────────────────────────── */
function NotificationsSection() {
  const [msgs, setMsgs] = useState(true)
  const [sound, setSound] = useState(true)
  const [groups, setGroups] = useState(true)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row label="Notificaciones de mensajes" desc="Recibe alertas de nuevos mensajes" on={msgs}   onChange={() => setMsgs(v => !v)} />
      <Row label="Sonido"                     desc="Reproducir sonido al recibir"      on={sound}  onChange={() => setSound(v => !v)} />
      <Row label="Grupos"                     desc="Alertas de actividad en grupos"    on={groups} onChange={() => setGroups(v => !v)} />
    </div>
  )
}

/* ── Account ───────────────────────────────────────── */
function AccountSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { label: 'Privacidad', desc: 'Quién puede ver tu foto y estado' },
        { label: 'Dispositivos conectados', desc: 'Gestiona tus sesiones activas (próximamente)' },
        { label: 'Eliminar cuenta', desc: 'Esta acción es irreversible', danger: true },
      ].map(item => (
        <button key={item.label} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
          background: item.danger ? 'rgba(212,86,86,.06)' : 'rgba(122,144,72,.06)',
          fontFamily: "'Poppins',system-ui,sans-serif",
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: item.danger ? '#c0392b' : '#242d16', marginBottom: 2 }}>{item.label}</p>
            <p style={{ fontSize: 12, color: '#8a9a7a' }}>{item.desc}</p>
          </div>
          <svg width="16" height="16" fill="none" stroke={item.danger ? '#c0392b' : '#9aaa82'} strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
        </button>
      ))}
    </div>
  )
}

/* ── Main ──────────────────────────────────────────── */
const SECTIONS: Record<Section, { title: string; component: React.ReactNode }> = {
  profile:       { title: 'Mi Perfil',       component: <ProfileSection /> },
  chats:         { title: 'Chats',           component: <ChatsSection /> },
  notifications: { title: 'Notificaciones',  component: <NotificationsSection /> },
  account:       { title: 'Cuenta',          component: <AccountSection /> },
}

export function SettingsPage() {
  const [active, setActive] = useState<Section>('profile')
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthStore(s => s.user)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');`}</style>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Poppins',system-ui,sans-serif", background: 'linear-gradient(155deg,#f0f3e6,#f5f6f0)' }}>

        {/* Sidebar */}
        <aside style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,.74)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(122,144,72,.14)' }}>
          <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid rgba(122,144,72,.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aaa82', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#242d16' }}>Ajustes</span>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(122,144,72,.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#7a9048,#91a662)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17, boxShadow: '0 3px 12px rgba(122,144,72,.25)', flexShrink: 0 }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#242d16', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: '#8a9a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => setActive(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: "'Poppins',system-ui,sans-serif", transition: 'all .15s',
                background: active === item.id ? 'rgba(122,144,72,.14)' : 'transparent',
                color: active === item.id ? '#637839' : '#5a6a4a', fontWeight: active === item.id ? 600 : 400,
              }}>
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ opacity: active === item.id ? 1 : .6, flexShrink: 0 }}><path d={item.icon}/></svg>
                <span style={{ fontSize: 13 }}>{item.label}</span>
              </button>
            ))}
          </nav>
          <div style={{ padding: 12, borderTop: '1px solid rgba(122,144,72,.1)' }}>
            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%', background: 'transparent', color: '#c0392b', fontFamily: "'Poppins',system-ui,sans-serif", fontSize: 13, fontWeight: 500 }}>
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Content — centrado */}
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 760 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary,#7a9048)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Configuración</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#242d16', letterSpacing: '-.02em', marginBottom: 28, borderBottom: '1px solid rgba(122,144,72,.14)', paddingBottom: 20 }}>{SECTIONS[active].title}</h1>
            {SECTIONS[active].component}
          </div>
        </main>
      </div>
    </>
  )
}
