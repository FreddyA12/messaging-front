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
  onSwitchCamera: () => Promise<void>
  onEscalate: () => Promise<void>
  onEnd: () => void
}

export function CallScreen({
  call,
  localStream,
  remoteStream,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onEscalate,
  onEnd,
}: Props) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, call.type])

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

  const handlePictureInPicture = async () => {
    const video = remoteVideoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture()
      }
    } catch (err) {
      console.warn('PIP failed', err)
    }
  }

  const statusLabel =
    call.phase === 'RINGING_OUT' ? 'Llamando...'
    : call.phase === 'CONNECTING' ? 'Conectando...'
    : call.phase === 'ACTIVE' ? formatElapsed(elapsed)
    : call.phase === 'ENDED' && call.endReason === 'REJECTED' ? 'Llamada rechazada'
    : call.phase === 'ENDED' ? 'Llamada finalizada'
    : ''

  const showVideo = call.type === 'VIDEO'

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      {/* Remote video / avatar */}
      <div className="flex-1 relative overflow-hidden">
        {showVideo && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center
                             text-white text-6xl font-semibold mb-5 ${avatarColor(call.peerName)}`}>
              {call.peerName[0]?.toUpperCase() ?? '?'}
            </div>
            <p className="text-white text-2xl font-semibold">{call.peerName}</p>
          </div>
        )}

        {/* Always-present audio element for remote audio track on voice calls */}
        {!showVideo && <audio ref={remoteAudioRef} autoPlay />}

        {/* Status overlay */}
        <div className="absolute top-6 left-0 right-0 flex flex-col items-center pointer-events-none">
          {showVideo && <p className="text-white font-semibold drop-shadow">{call.peerName}</p>}
          <p className="text-white/80 text-sm drop-shadow">{statusLabel}</p>
        </div>

        {/* Local video (PIP corner) */}
        {showVideo && localStream && (
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
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-6 py-6 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <ControlButton
            active={call.muted}
            onClick={onToggleMute}
            label={call.muted ? 'Activar' : 'Silenciar'}
          >
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

          {call.type === 'VIDEO' ? (
            <>
              <ControlButton
                active={call.cameraOff}
                onClick={() => { onToggleCamera() }}
                label={call.cameraOff ? 'Activar cámara' : 'Apagar cámara'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </ControlButton>

              <ControlButton
                onClick={() => { onSwitchCamera() }}
                label="Voltear"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </ControlButton>

              <ControlButton
                onClick={handlePictureInPicture}
                label="PIP"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16v12H4zM13 12h6v5h-6z" />
                </svg>
              </ControlButton>
            </>
          ) : (
            <ControlButton
              onClick={() => { onEscalate() }}
              label="Video"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </ControlButton>
          )}

          <div className="flex flex-col items-center gap-2 ml-4">
            <button
              onClick={onEnd}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95
                         flex items-center justify-center text-white shadow-lg transition-all"
              title="Colgar"
            >
              <svg className="w-6 h-6 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </button>
            <span className="text-white/80 text-xs">Colgar</span>
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
