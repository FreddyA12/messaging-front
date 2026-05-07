import { useEffect, useState } from 'react'
import { useChatStore } from '../../../store/chatStore'
import { storiesApi } from '../api'

interface Props {
  onClose: () => void
}

export function StoryPrivacyDialog({ onClose }: Props) {
  const chats = useChatStore((s) => s.chats)
  // Build a deduplicated list of contacts from private chats
  const contacts = chats
    .filter((c) => c.type === 'PRIVATE' && c.otherUserId)
    .map((c) => ({ id: c.otherUserId!, name: c.name }))
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)

  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    storiesApi.getPrivacy()
      .then((ids) => setHiddenIds(new Set(ids)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await storiesApi.updatePrivacy([...hiddenIds])
      onClose()
    } catch {
      /* silent */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 20, width: 360, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        fontFamily: "'Poppins',system-ui,sans-serif",
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px', borderBottom: '1px solid rgba(122,144,72,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#242d16', margin: 0 }}>
              Privacidad de historia
            </p>
            <p style={{ fontSize: 12, color: '#8a9a7a', margin: '2px 0 0' }}>
              Ocultar mi historia para estas personas
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9aaa82', padding: 4 }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#9aaa82', fontSize: 13, padding: 24 }}>Cargando...</p>
          ) : contacts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9aaa82', fontSize: 13, padding: 24 }}>
              No tienes contactos aún
            </p>
          ) : (
            contacts.map((c) => {
              const hidden = hiddenIds.has(c.id)
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 20px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122,144,72,0.06)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #7a9048, #91a662)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 15,
                  }}>
                    {c.name[0]?.toUpperCase()}
                  </div>

                  <span style={{ flex: 1, fontSize: 14, color: '#242d16', fontWeight: 500 }}>
                    {c.name}
                  </span>

                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `2px solid ${hidden ? '#c0392b' : 'rgba(122,144,72,0.3)'}`,
                    background: hidden ? 'rgba(192,57,43,0.1)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {hidden && (
                      <svg width="12" height="12" fill="none" stroke="#c0392b" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid rgba(122,144,72,0.1)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: 10, border: '1.5px solid rgba(122,144,72,0.25)',
              background: 'transparent', cursor: 'pointer', fontSize: 13,
              color: '#6a7a5a', fontFamily: "'Poppins',system-ui,sans-serif",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '8px 22px', borderRadius: 10, border: 'none',
              background: '#7a9048', color: '#fff', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              fontFamily: "'Poppins',system-ui,sans-serif",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
