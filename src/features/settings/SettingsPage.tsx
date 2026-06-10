import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import { UserAvatar } from '../../components/UserAvatar'
import {
  useAppearanceStore, PALETTES, CHAT_BACKGROUNDS, PATTERN_BACKGROUNDS,
  type ThemeMode, type ChatBg, type Palette, type FontSize,
} from '../../store/appearanceStore'
import { settingsApi, userApi } from './api'
import { encryptUserField, decryptUserField } from '../../lib/userEncryption'

type Section = 'profile' | 'chats' | 'notifications' | 'account'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'profile',       label: 'Perfil',         icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { id: 'chats',         label: 'Chats',           icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { id: 'notifications', label: 'Notificaciones',  icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
  { id: 'account',       label: 'Cuenta',          icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
]

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  small:  'Pequeño',
  normal: 'Normal',
  large:  'Grande',
}

/* ── Theme detection ───────────────────────────────────── */
function useIsDark() {
  const theme = useAppearanceStore(s => s.theme)
  const [isDark, setIsDark] = useState(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (theme === 'dark') { setIsDark(true); return }
    if (theme === 'light') { setIsDark(false); return }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return isDark
}

function useThemeColors() {
  const isDark = useIsDark()
  return isDark ? {
    isDark:          true as const,
    pageBg:          '#151a11',
    sidebarBg:       'rgba(18,23,14,0.98)',
    sidebarBorder:   'rgba(122,144,72,0.2)',
    cardBg:          '#202818',
    cardBg2:         '#1a2113',
    rowBg:           'rgba(122,144,72,0.09)',
    text:            '#dde8c0',
    textSub:         '#7a8a6a',
    textMuted:       '#4a5a3a',
    border:          'rgba(122,144,72,0.22)',
    borderSoft:      'rgba(122,144,72,0.12)',
    accent:          'rgba(122,144,72,0.13)',
    navActiveBg:     'rgba(122,144,72,0.22)',
    navActiveColor:  '#bdd488',
    navColor:        '#7a8a6a',
    inputBg:         'rgba(255,255,255,0.06)',
    incomingBg:      'rgba(38,50,30,0.96)',
    incomingText:    '#dde8c0',
    timestampBg:     'rgba(0,0,0,0.45)',
  } : {
    isDark:          false as const,
    pageBg:          'linear-gradient(155deg,#f0f3e6,#f7f8f2)',
    sidebarBg:       'rgba(255,255,255,0.85)',
    sidebarBorder:   'rgba(122,144,72,0.14)',
    cardBg:          '#ffffff',
    cardBg2:         '#f8faf2',
    rowBg:           'rgba(122,144,72,0.06)',
    text:            '#1e2a10',
    textSub:         '#5a6a4a',
    textMuted:       '#9aaa82',
    border:          'rgba(122,144,72,0.18)',
    borderSoft:      'rgba(122,144,72,0.1)',
    accent:          'rgba(122,144,72,0.07)',
    navActiveBg:     'rgba(122,144,72,0.14)',
    navActiveColor:  '#3d5c1e',
    navColor:        '#4a5a3a',
    inputBg:         'rgba(0,0,0,0.04)',
    incomingBg:      'rgba(255,255,255,0.97)',
    incomingText:    '#1e2a10',
    timestampBg:     'rgba(0,0,0,0.18)',
  }
}

/* ── Shared components ─────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
      background: on ? 'var(--color-primary, #7a9048)' : '#c8cfb8',
      position: 'relative', transition: 'background .25s', flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 4, left: on ? 24 : 4,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .22s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      }} />
    </button>
  )
}

function Row({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: () => void }) {
  const c = useThemeColors()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 14, background: c.rowBg, gap: 12 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 12, color: c.textSub }}>{desc}</p>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  )
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useThemeColors()
  return (
    <div style={{ background: c.cardBg, borderRadius: 20, padding: '20px 22px', border: `1px solid ${c.border}`, boxShadow: c.isDark ? 'none' : '0 2px 16px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{ width: 3, height: 18, background: 'var(--color-primary, #7a9048)', borderRadius: 2 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary, #7a9048)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

/* ── Profile Section ───────────────────────────────────── */
function ProfileSection() {
  const c = useThemeColors()
  const user = useAuthStore(s => s.user)
  const localStatus = useAppearanceStore(s => s.localStatus)
  const setLocalStatus = useAppearanceStore(s => s.setLocalStatus)
  const [editingStatus, setEditingStatus] = useState(false)
  const rawStatus = user?.statusText ?? ''
  const decryptedStatus = (user?.id && rawStatus) ? decryptUserField(rawStatus, user.id) : rawStatus
  const [draft, setDraft] = useState(localStatus || decryptedStatus)
  const displayStatus = localStatus || decryptedStatus || 'Hola, estoy usando Whispr'
  const [saving, setSaving] = useState(false)
  const [avatarBust, setAvatarBust] = useState(0)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const saveStatus = async (value: string) => {
    setLocalStatus(value)
    setEditingStatus(false)
    setSaving(true)
    try {
      await userApi.updateProfile({ statusText: user?.id ? encryptUserField(value, user.id) : value })
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarMsg(null)
    try {
      await userApi.uploadAvatar(file)
      setAvatarFailed(false)
      setAvatarBust(b => b + 1) // bust cache → re-load from backend
      setAvatarMsg({ ok: true, text: 'Foto actualizada' })
    } catch {
      setAvatarMsg({ ok: false, text: 'Error al subir la foto' })
    } finally {
      setAvatarUploading(false)
    }
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <CardSection title="Mi perfil">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingBottom: 8 }}>
          {/* Avatar */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'linear-gradient(135deg,var(--color-primary, #7a9048),#91a662)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 38,
            boxShadow: '0 6px 28px rgba(122,144,72,0.3)',
            overflow: 'hidden', flexShrink: 0, position: 'relative',
          }}>
            {avatarUploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>
                ...
              </div>
            )}
            {!avatarFailed && user?.id
              ? <img
                  key={avatarBust}
                  src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/users/${user.id}/avatar?t=${avatarBust}`}
                  alt="avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setAvatarFailed(true)}
                />
              : user?.name?.[0]?.toUpperCase()
            }
          </div>

          {/* Status bubble */}
          <div style={{ position: 'relative', marginTop: 10 }}>
            <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(122,144,72,0.4)' }} />
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(122,144,72,0.28)' }} />
            </span>
            <div style={{
              background: c.cardBg, borderRadius: 22, border: `1.5px solid ${c.border}`,
              padding: '10px 20px', maxWidth: 280, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}>
              {editingStatus ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    autoFocus value={draft} onChange={e => setDraft(e.target.value)} maxLength={140}
                    style={{ fontSize: 13, border: 'none', outline: 'none', flex: 1, background: 'transparent', fontFamily: "'Poppins',system-ui,sans-serif", color: c.text }}
                    onKeyDown={e => { if (e.key === 'Enter') saveStatus(draft); if (e.key === 'Escape') setEditingStatus(false) }}
                  />
                  <button onClick={() => saveStatus(draft)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, fontWeight: 700 }}>✓</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 13, color: saving ? c.textMuted : c.textSub, flex: 1 }}>{displayStatus}</p>
                  <button onClick={() => { setDraft(displayStatus); setEditingStatus(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, flexShrink: 0 }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          <p style={{ marginTop: 14, fontSize: 20, fontWeight: 700, color: c.text }}>{user?.name}</p>
          <p style={{ fontSize: 13, color: c.textSub, marginTop: 2 }}>{user?.email}</p>

          <label style={{
            marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--color-primary)',
            background: 'rgba(122,144,72,0.1)', border: '1.5px solid rgba(122,144,72,0.25)',
            borderRadius: 22, padding: '8px 22px', cursor: 'pointer', transition: 'all .18s',
          }}>
            Cambiar foto
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </label>
          {avatarMsg && (
            <p style={{ fontSize: 12, marginTop: 8, color: avatarMsg.ok ? 'var(--color-primary)' : '#c0392b', fontWeight: 500 }}>
              {avatarMsg.text}
            </p>
          )}
        </div>
      </CardSection>
    </div>
  )
}

/* ── Chats Section ─────────────────────────────────────── */
function ChatsSection() {
  const c = useThemeColors()
  const { theme, chatBackground, palette, fontSize, setTheme, setChatBackground, setPalette, setFontSize } = useAppearanceStore()
  const [enterSend, setEnterSend] = useState(true)
  const [readReceipts, setReadReceipts] = useState(true)
  const [mediaSave, setMediaSave] = useState(false)

  useEffect(() => {
    const themeMap: Record<ThemeMode, string> = { light: 'LIGHT', dark: 'DARK', system: 'SYSTEM' }
    const fontMap: Record<FontSize, string> = { small: 'SMALL', normal: 'NORMAL', large: 'LARGE' }
    settingsApi.updatePreferences({ theme: themeMap[theme], fontSize: fontMap[fontSize] }).catch(() => {})
  }, [theme, fontSize])

  const THEMES: { value: ThemeMode; label: string; desc: string; bgPreview: string; headerPreview: string }[] = [
    { value: 'dark',   label: 'Oscuro',  desc: 'Interfaz oscura',             bgPreview: '#151a11', headerPreview: '#202818' },
    { value: 'system', label: 'Sistema', desc: 'Sigue tu dispositivo',         bgPreview: 'linear-gradient(90deg,#f0f3e6 50%,#151a11 50%)', headerPreview: 'linear-gradient(90deg,#e2e8d4 50%,#202818 50%)' },
  ]

  const bgIsDark = CHAT_BACKGROUNDS[chatBackground]?.dark === true
  // Match what MessageBubble actually renders:
  // outgoing = pale palette tint (p.light) + dark text
  // incoming = white/dark-surface + border
  const previewOutBg   = c.isDark ? PALETTES[palette].darkBubble : PALETTES[palette].light
  const previewOutText = c.isDark ? '#dde8c0' : '#1e2a10'
  const previewInBg    = bgIsDark ? '#232b1a' : (c.isDark ? '#232b1a' : '#ffffff')
  const previewInText  = bgIsDark || c.isDark ? '#dde8c0' : '#1e2a10'
  const previewInBorder = bgIsDark || c.isDark ? 'transparent' : 'rgba(0,0,0,0.08)'
  const previewFontSize = fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14

  return (
    <div className="settings-chats-cols" style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

      {/* ── Left column ── */}
      <div className="settings-chats-left" style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

        {/* Theme */}
        <CardSection title="Tema">
          <div style={{ display: 'flex', gap: 14 }}>
            {THEMES.map(t => (
              <button key={t.value} onClick={() => setTheme(t.value)} style={{
                flex: 1, padding: 0, borderRadius: 16, cursor: 'pointer',
                border: `2px solid ${theme === t.value ? 'var(--color-primary,#7a9048)' : c.border}`,
                background: 'none', overflow: 'hidden', transition: 'all .2s',
                boxShadow: theme === t.value ? '0 0 0 3px rgba(122,144,72,0.2)' : 'none',
              }}>
                <div style={{ height: 66, background: t.bgPreview, overflow: 'hidden' }}>
                  <div style={{ height: 16, background: t.headerPreview }} />
                  <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ alignSelf: 'flex-start', background: t.value === 'dark' ? 'rgba(40,55,32,0.9)' : 'rgba(255,255,255,0.9)', borderRadius: 6, height: 9, width: 38 }} />
                    <div style={{ alignSelf: 'flex-end', background: 'var(--color-primary,#7a9048)', borderRadius: 6, height: 9, width: 28 }} />
                  </div>
                </div>
                <div style={{ padding: '8px 10px 10px', background: c.cardBg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderTop: `1px solid ${c.borderSoft}` }}>
                  <span style={{ fontSize: 13, fontWeight: theme === t.value ? 700 : 500, color: theme === t.value ? 'var(--color-primary,#7a9048)' : c.text }}>{t.label}</span>
                  <span style={{ fontSize: 11, color: c.textSub }}>{t.desc}</span>
                  {theme === t.value && <div style={{ marginTop: 4, width: 20, height: 3, borderRadius: 2, background: 'var(--color-primary,#7a9048)' }} />}
                </div>
              </button>
            ))}
          </div>
        </CardSection>

        {/* Patterned backgrounds */}
        <CardSection title="Fondo del chat">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 12 }}>
            {PATTERN_BACKGROUNDS.map(key => {
              const val = CHAT_BACKGROUNDS[key as ChatBg]
              return (
                <button key={key} onClick={() => setChatBackground(key as ChatBg)} style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: '100%', height: 64, borderRadius: 13,
                    background: val.preview,
                    border: `2.5px solid ${chatBackground === key ? 'var(--color-primary,#7a9048)' : c.borderSoft}`,
                    boxShadow: chatBackground === key ? '0 0 0 3px rgba(122,144,72,0.22)' : '0 2px 8px rgba(0,0,0,0.07)',
                    transition: 'all .2s', position: 'relative', overflow: 'hidden',
                  }}>
                    {chatBackground === key && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.08)' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-primary,#7a9048)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: chatBackground === key ? 'var(--color-primary,#7a9048)' : c.textSub, fontWeight: chatBackground === key ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                    {val.label}
                  </span>
                </button>
              )
            })}
          </div>
        </CardSection>

        {/* Palette */}
        <CardSection title="Color de acento">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {(Object.entries(PALETTES) as [Palette, typeof PALETTES[Palette]][]).map(([key, val]) => (
              <button key={key} onClick={() => setPalette(key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: val.swatch,
                  border: `3px solid ${palette === key ? val.primary : 'transparent'}`,
                  outline: palette === key ? `3px solid ${val.primary}44` : 'none',
                  boxShadow: palette === key ? `0 4px 14px ${val.primary}66` : '0 2px 8px rgba(0,0,0,0.14)',
                  transition: 'all .2s',
                }} />
                <span style={{ fontSize: 10, color: palette === key ? val.primary : c.textSub, fontWeight: palette === key ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {val.label}
                </span>
              </button>
            ))}
          </div>
        </CardSection>

        {/* Font size */}
        <CardSection title="Tamaño de fuente">
          <div style={{ display: 'flex', gap: 12 }}>
            {(['small', 'normal', 'large'] as FontSize[]).map(f => (
              <button key={f} onClick={() => setFontSize(f)} style={{
                flex: 1, padding: '14px 10px', borderRadius: 14,
                border: `2px solid ${fontSize === f ? 'var(--color-primary,#7a9048)' : c.border}`,
                background: fontSize === f ? 'rgba(122,144,72,0.1)' : c.cardBg2,
                cursor: 'pointer', transition: 'all .2s', fontFamily: "'Poppins',system-ui,sans-serif",
                color: fontSize === f ? 'var(--color-primary,#7a9048)' : c.textSub,
                fontWeight: fontSize === f ? 700 : 400,
                fontSize: f === 'small' ? 12 : f === 'large' ? 17 : 14,
              }}>
                {FONT_SIZE_LABELS[f]}
              </button>
            ))}
          </div>
        </CardSection>

        {/* Behavior */}
        <CardSection title="Comportamiento">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="Enter para enviar" desc="Presiona Enter para enviar mensajes" on={enterSend} onChange={() => setEnterSend(v => !v)} />
            <Row label="Confirmaciones de lectura" desc="Permite que otros vean cuando lees" on={readReceipts} onChange={() => setReadReceipts(v => !v)} />
            <Row label="Guardar medios automáticamente" desc="Las imágenes se guardan al recibirlas" on={mediaSave} onChange={() => setMediaSave(v => !v)} />
          </div>
        </CardSection>
      </div>

      {/* ── Right column: Live preview (sticky) ── */}
      <div style={{ flex: '1 1 0', position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: c.textSub, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>Vista en vivo</p>
        <div style={{ borderRadius: 22, overflow: 'hidden', border: `2px solid ${c.border}`, boxShadow: c.isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.14)' }}>
          {/* Fake header */}
          <div style={{ padding: '11px 16px', background: 'var(--color-primary,#7a9048)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>👤</div>
            <div>
              <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>María García</p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: 0 }}>en línea</p>
            </div>
          </div>

          {/* Chat area */}
          <div style={{ minHeight: 320, padding: '16px 14px', background: CHAT_BACKGROUNDS[chatBackground]?.style || CHAT_BACKGROUNDS.default.style, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 10, background: bgIsDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '2px 10px' }}>Hoy</span>
            </div>
            <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: previewInBg, color: previewInText, padding: '9px 13px', borderRadius: '15px 15px 15px 4px', fontSize: previewFontSize, lineHeight: 1.45, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: `1px solid ${previewInBorder}` }}>
              ¡Hola! ¿Probamos el diseño? 👋
            </div>
            <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: previewOutBg, color: previewOutText, padding: '9px 13px', borderRadius: '15px 15px 4px 15px', fontSize: previewFontSize, lineHeight: 1.45, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              ¡Me encanta, queda genial! 🎉
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={previewOutText} strokeWidth="2.5" strokeLinecap="round" opacity={0.6}><path d="M18 6L7 17l-5-5"/><path d="M22 10l-5.5 5.5"/></svg>
              </div>
            </div>
            <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: previewInBg, color: previewInText, padding: '9px 13px', borderRadius: '15px 15px 15px 4px', fontSize: previewFontSize, lineHeight: 1.45, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', border: `1px solid ${previewInBorder}` }}>
              El texto se ve perfecto así 😊
            </div>
            <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: previewOutBg, color: previewOutText, padding: '9px 13px', borderRadius: '15px 15px 4px 15px', fontSize: previewFontSize, lineHeight: 1.45, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              Genial, ¡lo uso desde hoy!
            </div>
          </div>

          {/* Fake input */}
          <div style={{ padding: '10px 14px', background: c.cardBg, display: 'flex', alignItems: 'center', gap: 10, borderTop: `1px solid ${c.borderSoft}` }}>
            <div style={{ flex: 1, height: 36, borderRadius: 18, background: c.rowBg, border: `1px solid ${c.borderSoft}` }} />
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary,#7a9048)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Notifications Section ─────────────────────────────── */
function NotificationsSection() {
  const [msgs, setMsgs]     = useState(true)
  const [sound, setSound]   = useState(true)
  const [groups, setGroups] = useState(true)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Row label="Notificaciones de mensajes" desc="Recibe alertas de nuevos mensajes" on={msgs}   onChange={() => setMsgs(v => !v)} />
      <Row label="Sonido"                     desc="Reproducir sonido al recibir"      on={sound}  onChange={() => setSound(v => !v)} />
      <Row label="Grupos"                     desc="Alertas de actividad en grupos"    on={groups} onChange={() => setGroups(v => !v)} />
    </div>
  )
}

/* ── Account Section ───────────────────────────────────── */
type PrivacyLevel = 'EVERYONE' | 'CONTACTS' | 'NOBODY'

function AccountSection() {
  const c = useThemeColors()
  const [showPrivacy, setShowPrivacy]     = useState(false)
  const [lastSeen, setLastSeen]           = useState<PrivacyLevel>('EVERYONE')
  const [profilePic, setProfilePic]       = useState<PrivacyLevel>('EVERYONE')
  const [readReceipts, setReadReceipts]   = useState(true)
  const [saving, setSaving]               = useState(false)

  const LEVELS: { value: PrivacyLevel; label: string }[] = [
    { value: 'EVERYONE', label: 'Todos' },
    { value: 'CONTACTS', label: 'Contactos' },
    { value: 'NOBODY',   label: 'Nadie' },
  ]

  const pillStyle = (active: boolean, primary = 'var(--color-primary,#7a9048)'): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 20,
    border: `1.5px solid ${active ? primary : c.border}`,
    background: active ? 'rgba(122,144,72,0.12)' : 'transparent',
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 700 : 400,
    color: active ? primary : c.textSub,
    fontFamily: "'Poppins',system-ui,sans-serif", transition: 'all .15s',
  })

  const savePrivacy = async () => {
    setSaving(true)
    try {
      await settingsApi.updatePrivacy({ privacyLastSeen: lastSeen, privacyProfilePic: profilePic, privacyReadReceipts: readReceipts })
    } catch { /* silent */ } finally { setSaving(false) }
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
    textAlign: 'left', width: '100%', background: c.rowBg,
    fontFamily: "'Poppins',system-ui,sans-serif", transition: 'background .15s',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Privacy */}
      <button onClick={() => setShowPrivacy(v => !v)} style={rowStyle}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Privacidad</p>
          <p style={{ fontSize: 12, color: c.textSub }}>Quién puede ver tu foto y estado</p>
        </div>
        <svg width="16" height="16" fill="none" stroke={c.textSub} strokeWidth="2" viewBox="0 0 24 24">
          <path d={showPrivacy ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} strokeLinecap="round"/>
        </svg>
      </button>

      {showPrivacy && (
        <div style={{ padding: '18px 20px', borderRadius: 16, background: c.accent, border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 10 }}>Última vez</p>
            <div style={{ display: 'flex', gap: 8 }}>{LEVELS.map(l => <button key={l.value} onClick={() => setLastSeen(l.value)} style={pillStyle(lastSeen === l.value)}>{l.label}</button>)}</div>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 10 }}>Foto de perfil</p>
            <div style={{ display: 'flex', gap: 8 }}>{LEVELS.map(l => <button key={l.value} onClick={() => setProfilePic(l.value)} style={pillStyle(profilePic === l.value)}>{l.label}</button>)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 2 }}>Confirmaciones de lectura</p>
              <p style={{ fontSize: 12, color: c.textSub }}>Permite que otros vean cuando lees</p>
            </div>
            <Toggle on={readReceipts} onChange={() => setReadReceipts(v => !v)} />
          </div>
          <button onClick={savePrivacy} disabled={saving} style={{
            padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'var(--color-primary,#7a9048)', color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: "'Poppins',system-ui,sans-serif", alignSelf: 'flex-end', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}

      <button style={rowStyle}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 2 }}>Dispositivos conectados</p>
          <p style={{ fontSize: 12, color: c.textSub }}>Gestiona tus sesiones activas (próximamente)</p>
        </div>
        <svg width="16" height="16" fill="none" stroke={c.textSub} strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
      </button>

      <button style={{ ...rowStyle, background: 'rgba(192,57,43,0.07)' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#c0392b', marginBottom: 2 }}>Eliminar cuenta</p>
          <p style={{ fontSize: 12, color: c.textSub }}>Esta acción es irreversible</p>
        </div>
        <svg width="16" height="16" fill="none" stroke="#c0392b" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round"/></svg>
      </button>
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────── */
const SECTION_TITLES: Record<Section, string> = {
  profile:       'Mi Perfil',
  chats:         'Chats',
  notifications: 'Notificaciones',
  account:       'Cuenta',
}

const SECTION_COMPONENTS: Record<Section, React.ComponentType> = {
  profile:       ProfileSection,
  chats:         ChatsSection,
  notifications: NotificationsSection,
  account:       AccountSection,
}

export function SettingsPage() {
  const [active, setActive] = useState<Section>('profile')
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthStore(s => s.user)
  const c = useThemeColors()

  const ActiveSection = SECTION_COMPONENTS[active]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @media (max-width: 767px) {
          .settings-root { flex-direction: column !important; }
          .settings-sidebar {
            width: 100% !important; flex-shrink: 0;
            flex-direction: row !important; overflow-x: auto; overflow-y: hidden;
            border-right: none !important; border-bottom: 1px solid rgba(122,144,72,0.15);
          }
          .settings-sidebar-header { display: none !important; }
          .settings-sidebar-usercard { display: none !important; }
          .settings-sidebar-nav {
            flex: none !important; flex-direction: row !important; padding: 0 !important;
            gap: 0 !important; overflow-x: auto; white-space: nowrap;
          }
          .settings-sidebar-nav button { border-radius: 0 !important; padding: 10px 14px !important; font-size: 12px !important; width: auto !important; }
          .settings-sidebar-logout { display: none !important; }
          .settings-main { padding: 20px 16px !important; }
          .settings-chats-cols { flex-direction: column !important; gap: 20px !important; }
          .settings-chats-left { flex: none !important; width: 100% !important; }
        }
      `}</style>
      <div className="settings-root" style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Poppins',system-ui,sans-serif", background: c.pageBg }}>

        {/* ── Sidebar ── */}
        <aside className="settings-sidebar" style={{ width: 252, flexShrink: 0, display: 'flex', flexDirection: 'column', background: c.sidebarBg, backdropFilter: 'blur(20px)', borderRight: `1px solid ${c.sidebarBorder}` }}>
          {/* Back + title */}
          <div className="settings-sidebar-header" style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${c.borderSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textSub, padding: '6px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', transition: 'background .15s' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text, letterSpacing: '-.01em' }}>Ajustes</span>
          </div>

          {/* User mini card */}
          <div className="settings-sidebar-usercard" style={{ padding: '14px 18px', borderBottom: `1px solid ${c.borderSoft}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <UserAvatar userId={user?.id} name={user?.name ?? 'U'} size={44} style={{ boxShadow: '0 3px 12px rgba(122,144,72,0.3)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: c.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="settings-sidebar-nav" style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => setActive(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13,
                border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                fontFamily: "'Poppins',system-ui,sans-serif", transition: 'all .15s',
                background: active === item.id ? c.navActiveBg : 'transparent',
                color: active === item.id ? c.navActiveColor : c.navColor,
                fontWeight: active === item.id ? 600 : 400,
              }}>
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ opacity: active === item.id ? 1 : .65, flexShrink: 0 }}>
                  <path d={item.icon}/>
                </svg>
                <span style={{ fontSize: 13 }}>{item.label}</span>
                {active === item.id && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--color-primary,#7a9048)', opacity: 0.8 }} />}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="settings-sidebar-logout" style={{ padding: '10px 10px', borderTop: `1px solid ${c.borderSoft}` }}>
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 13,
              border: 'none', cursor: 'pointer', width: '100%', background: 'transparent',
              color: '#d9534f', fontFamily: "'Poppins',system-ui,sans-serif", fontSize: 13, fontWeight: 500,
              transition: 'background .15s',
            }}>
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Content ── */}
        <main className="settings-main" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 40px' }}>
          <div style={{ width: '100%', maxWidth: 1140 }}>
            {/* Page header */}
            <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${c.borderSoft}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary,#7a9048)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>
                Configuración
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: c.text, letterSpacing: '-.02em' }}>
                {SECTION_TITLES[active]}
              </h1>
            </div>

            <ActiveSection />
          </div>
        </main>
      </div>
    </>
  )
}
