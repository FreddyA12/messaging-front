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
  remoteStream: MediaStream | null
  onToggleMute: () => void
  onToggleCamera: () => void
  onEscalate: () => Promise<void>
  onEnd: () => void
}

export function CallScreen({
  call,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleCamera,
  onEscalate,
  onEnd,
}: Props) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [elapsed, setElapsed] = useState(0)
  // Simple app-level minimize — does NOT use browser PiP API so refs stay valid.
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (call.phase !== 'ACTIVE' || !call.startedAt) return
    const tick = () => setElapsed(Math.floor((Date.now() - (call.startedAt ?? 0)) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [call.phase, call.startedAt])

  const statusLabel =
    call.phase === 'RINGING_OUT' ? 'Llamando...'
    : call.phase === 'CONNECTING' ? 'Conectando...'
    : call.phase === 'ACTIVE' ? formatElapsed(elapsed)
    : call.phase === 'ENDED' && call.endReason === 'REJECTED' ? 'Llamada rechazada'
    : call.phase === 'ENDED' ? 'Llamada finalizada'
    : ''

  const showVideo = call.type === 'VIDEO'

  return (
    <>
      {/* Always-mounted audio element — keeps audio playing in any state */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/* ── Minimized bottom bar ─────────────────────────────────────────────── */}
      {isMinimized && (
        <div className="fixed bottom-0 left-0 right-0 z-[200] bg-gray-900/95 backdrop-blur-sm px-4 py-3
                        flex items-center gap-3 shadow-2xl border-t border-white/10">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center
                           text-white text-sm font-semibold shrink-0 ${avatarColor(call.peerName)}`}>
            {call.peerName[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{call.peerName}</p>
            <p className="text-white/60 text-xs">{statusLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MiniButton onClick={onToggleMute} active={call.muted} title={call.muted ? 'Activar mic' : 'Silenciar'}>
              {call.muted ? <MicOffIcon /> : <MicOnIcon />}
            </MiniButton>
            {showVideo && (
              <MiniButton onClick={onToggleCamera} active={call.cameraOff} title={call.cameraOff ? 'Activar cámara' : 'Apagar cámara'}>
                <CamIcon />
              </MiniButton>
            )}
            {/* Expand back to full screen — always works because overlay is always in DOM */}
            <MiniButton onClick={() => setIsMinimized(false)} title="Maximizar">
              <MaximizeIcon />
            </MiniButton>
            <button
              onClick={onEnd}
              className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
              title="Colgar"
            >
              <HangupIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/*
        Full-screen overlay is ALWAYS mounted (visibility toggled via CSS) so that:
        - remoteVideoRef / localVideoRef refs are never null
        - video stream keeps playing while minimized
        CSS class `invisible pointer-events-none` hides it visually without unmounting.
      */}
      <div
        className={`fixed inset-0 z-[100] bg-gray-900 flex flex-col
          ${isMinimized ? 'invisible pointer-events-none' : ''}`}
      >
        {/* Remote video / avatar */}
        <div className="flex-1 relative overflow-hidden">
          {showVideo ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-black"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
              {/* Hidden video keeps the srcObject alive even for voice calls */}
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
              <div className={`w-32 h-32 rounded-full flex items-center justify-center
                               text-white text-6xl font-semibold mb-5 ${avatarColor(call.peerName)}`}>
                {call.peerName[0]?.toUpperCase() ?? '?'}
              </div>
              <p className="text-white text-2xl font-semibold">{call.peerName}</p>
            </div>
          )}

          {/* Status overlay */}
          <div className="absolute top-6 left-0 right-0 flex flex-col items-center pointer-events-none">
            {showVideo && <p className="text-white font-semibold drop-shadow">{call.peerName}</p>}
            <p className="text-white/80 text-sm drop-shadow">{statusLabel}</p>
          </div>

          {/* Local video (PIP corner) */}
          {showVideo && (
            <div className="absolute bottom-4 right-4 w-32 h-44 md:w-40 md:h-56 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${call.cameraOff ? 'opacity-0' : ''}`}
              />
              {call.cameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <CamIcon className="w-8 h-8 text-white/60" />
                </div>
              )}
            </div>
          )}
          {!showVideo && (
            <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
          )}
        </div>

        {/* Controls */}
        <div className="shrink-0 px-6 py-6 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <ControlButton active={call.muted} onClick={onToggleMute} label={call.muted ? 'Activar' : 'Silenciar'}>
              {call.muted ? <MicOffIcon className="w-6 h-6" /> : <MicOnIcon className="w-6 h-6" />}
            </ControlButton>

            {showVideo ? (
              <>
                <ControlButton active={call.cameraOff} onClick={onToggleCamera} label={call.cameraOff ? 'Activar cámara' : 'Apagar cámara'}>
                  <CamIcon className="w-6 h-6" />
                </ControlButton>
                <ControlButton onClick={() => setIsMinimized(true)} label="Minimizar">
                  <MinimizeIcon className="w-6 h-6" />
                </ControlButton>
              </>
            ) : (
              <>
                <ControlButton onClick={() => setIsMinimized(true)} label="Minimizar">
                  <MinimizeIcon className="w-6 h-6" />
                </ControlButton>
                <ControlButton onClick={onEscalate} label="Video">
                  <CamIcon className="w-6 h-6" />
                </ControlButton>
              </>
            )}

            <div className="flex flex-col items-center gap-2 ml-4">
              <button
                onClick={onEnd}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95
                           flex items-center justify-center text-white shadow-lg transition-all"
                title="Colgar"
              >
                <HangupIcon className="w-6 h-6" />
              </button>
              <span className="text-white/80 text-xs">Colgar</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Icon components ────────────────────────────────────────────────────────────

interface IconProps { className?: string }

function MicOnIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  )
}

function MicOffIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  )
}

function CamIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function HangupIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={`${className} rotate-[135deg]`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  )
}

function MinimizeIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

function MaximizeIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  )
}

// ── Control button (full-screen toolbar) ──────────────────────────────────────

interface ControlButtonProps {
  onClick: () => void
  label: string
  active?: boolean
  children: React.ReactNode
}

function ControlButton({ onClick, label, active = false, children }: ControlButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
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

// ── Mini button (bottom bar when minimized) ───────────────────────────────────

interface MiniButtonProps {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}

function MiniButton({ onClick, title, active = false, children }: MiniButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
        ${active ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
      title={title}
    >
      {children}
    </button>
  )
}
