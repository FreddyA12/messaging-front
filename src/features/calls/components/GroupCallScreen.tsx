import { useEffect, useRef, useState } from 'react'
import type { ActiveCall } from '../../../store/callStore'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-amber-500',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

interface Props {
  call: ActiveCall
  localStream: MediaStream | null
  remoteStreams: Map<number, MediaStream>
  currentUserId: number
  currentUserName: string
  onToggleMute: () => void
  onToggleCamera: () => void
  onLeave: () => void
}

interface TileProps {
  name: string
  stream: MediaStream | null
  muted?: boolean
  isLocal?: boolean
  showVideo: boolean
}

function ParticipantTile({ name, stream, muted, isLocal, showVideo }: TileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const hasVideoTrack = stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live')

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center">
      {showVideo && hasVideoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold ${avatarColor(name)}`}>
            {name[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-white text-sm font-medium">{name}</span>
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-2 left-2 bg-black/50 rounded-md px-2 py-0.5 flex items-center gap-1">
        <span className="text-white text-xs">{isLocal ? 'Tú' : name}</span>
        {muted && (
          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </div>
    </div>
  )
}

export function GroupCallScreen({
  call,
  localStream,
  remoteStreams,
  currentUserId: _currentUserId,
  currentUserName,
  onToggleMute,
  onToggleCamera,
  onLeave,
}: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (call.phase !== 'ACTIVE' || !call.startedAt) return
    const tick = () => setElapsed(Math.floor((Date.now() - (call.startedAt ?? 0)) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [call.phase, call.startedAt])

  const showVideo = call.type === 'VIDEO'

  const statusLabel =
    call.phase === 'RINGING_OUT' ? 'Esperando que otros se unan...'
    : call.phase === 'CONNECTING' ? 'Conectando...'
    : call.phase === 'ACTIVE' ? formatElapsed(elapsed)
    : call.phase === 'ENDED' ? 'Llamada finalizada'
    : ''

  // Build participant tiles: local + all connected remote peers
  const tiles: { key: string; name: string; stream: MediaStream | null; isLocal: boolean }[] = [
    { key: 'local', name: currentUserName, stream: localStream, isLocal: true },
    ...call.groupParticipants.map((p) => ({
      key: `peer-${p.userId}`,
      name: p.userName,
      stream: remoteStreams.get(p.userId) ?? null,
      isLocal: false,
    })),
  ]

  const count = tiles.length
  const gridCols = count <= 1 ? 'grid-cols-1' : count <= 2 ? 'grid-cols-2' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3 bg-gray-900/90 backdrop-blur-sm">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate">{call.chatName ?? 'Llamada grupal'}</p>
          <p className="text-white/60 text-xs">{statusLabel}</p>
        </div>
        <span className="text-white/60 text-xs">{tiles.length} participantes</span>
      </div>

      {/* Participant grid */}
      <div className={`flex-1 grid ${gridCols} gap-2 p-2 overflow-hidden`}>
        {tiles.map((tile) => (
          <ParticipantTile
            key={tile.key}
            name={tile.name}
            stream={tile.stream}
            muted={tile.isLocal ? call.muted : false}
            isLocal={tile.isLocal}
            showVideo={showVideo}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-6 py-5 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-center gap-5">
          <ControlButton active={call.muted} onClick={onToggleMute} label={call.muted ? 'Activar' : 'Silenciar'}>
            {call.muted ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </ControlButton>

          {showVideo && (
            <ControlButton active={call.cameraOff} onClick={onToggleCamera} label={call.cameraOff ? 'Activar cámara' : 'Apagar cámara'}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </ControlButton>
          )}

          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onLeave}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95
                         flex items-center justify-center text-white shadow-lg transition-all"
              title="Salir de la llamada"
            >
              <svg className="w-6 h-6 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </button>
            <span className="text-white/80 text-xs">Salir</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ControlButtonProps {
  onClick: () => void
  label: string
  active?: boolean
  children: React.ReactNode
}

function ControlButton({ onClick, label, active = false, children }: ControlButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onClick}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95
          ${active
            ? 'bg-white text-gray-900 shadow-lg'
            : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
          }`}
        title={label}
      >
        {children}
      </button>
      <span className="text-white/80 text-xs">{label}</span>
    </div>
  )
}
