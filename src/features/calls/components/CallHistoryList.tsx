import { useEffect, useState } from 'react'
import { callApi } from '../api'
import { useCallStore } from '../../../store/callStore'
import { useAuthStore } from '../../../store/authStore'
import type { CallDTO } from '../../../types/call'
import { UserAvatar } from '../../../components/UserAvatar'

function formatDuration(secs: number | null): string {
  if (!secs) return ''
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'Ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

const PhoneIcon = ({ stroke }: { stroke: string }) => (
  <svg width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
)

const VideoIcon = ({ stroke }: { stroke: string }) => (
  <svg width="14" height="14" fill="none" stroke={stroke} strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

export function CallHistoryList() {
  const [calls, setCalls] = useState<CallDTO[]>([])
  const [loading, setLoading] = useState(true)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const requestOutgoingCall = useCallStore((s) => s.requestOutgoingCall)

  useEffect(() => {
    callApi.history()
      .then(setCalls)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{
        padding: '24px', textAlign: 'center', color: '#9aaa82', fontSize: 13,
        fontFamily: "'Poppins',system-ui,sans-serif",
      }}>
        Cargando...
      </div>
    )
  }

  if (calls.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: '48px 24px', color: '#9aaa82',
        fontFamily: "'Poppins',system-ui,sans-serif",
      }}>
        <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
        <p style={{ fontSize: 14, margin: 0 }}>Sin llamadas recientes</p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {calls.map((call) => {
        const isCaller = call.callerId === currentUserId
        const peerId = isCaller ? call.calleeId : call.callerId
        const peerName = isCaller ? (call.calleeName ?? 'Grupo') : call.callerName
        // Only the callee can have a missed call; outgoing unanswered calls are just "Saliente"
        const missed = !isCaller && (call.status === 'MISSED' || call.status === 'REJECTED')
        const callTime = call.endedAt ?? call.startedAt
        const arrowColor = missed ? '#c0392b' : '#7a9048'
        const labelColor = missed ? '#c0392b' : '#8a9a7a'

        return (
          <div
            key={call.id}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 16px',
              fontFamily: "'Poppins',system-ui,sans-serif",
            }}
          >
            <UserAvatar userId={peerId} name={peerName} size={48} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 14, fontWeight: 500, color: 'var(--color-text)', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {peerName}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <svg width="11" height="11" fill="none" stroke={arrowColor} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 12 12">
                  {isCaller
                    ? <><line x1="2" y1="10" x2="10" y2="2" /><polyline points="4,2 10,2 10,8" /></>
                    : <><line x1="10" y1="2" x2="2" y2="10" /><polyline points="8,10 2,10 2,4" /></>
                  }
                </svg>
                <span style={{ fontSize: 12, color: labelColor }}>
                  {missed ? 'Perdida' : isCaller ? 'Saliente' : 'Entrante'}
                  {call.durationSeconds ? ` · ${formatDuration(call.durationSeconds)}` : ''}
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#9aaa82' }}>{timeAgo(callTime)}</span>
            </div>

            <button
              onClick={() => requestOutgoingCall({
                peerId: peerId!,
                peerName: peerName ?? '?',
                type: call.type,
                chatId: call.chatId ?? undefined,
              })}
              title={call.type === 'VIDEO' ? 'Videollamada' : 'Llamada de voz'}
              style={{
                background: 'rgba(122,144,72,0.12)', border: 'none', borderRadius: '50%',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, color: '#7a9048',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122,144,72,0.22)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(122,144,72,0.12)' }}
            >
              {call.type === 'VIDEO' ? <VideoIcon stroke="#7a9048" /> : <PhoneIcon stroke="#7a9048" />}
            </button>
          </div>
        )
      })}
    </div>
  )
}
