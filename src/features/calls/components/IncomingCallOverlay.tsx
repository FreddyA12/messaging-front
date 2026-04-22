import type { CallType } from '../../../types/call'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-amber-500',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

interface Props {
  peerName: string
  type: CallType
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallOverlay({ peerName, type, onAccept, onReject }: Props) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
        <div className={`relative w-28 h-28 rounded-full flex items-center justify-center
                         text-white text-5xl font-semibold ${avatarColor(peerName)}`}>
          {peerName[0]?.toUpperCase() ?? '?'}
        </div>
      </div>

      <p className="text-white text-2xl font-semibold mb-1">{peerName}</p>
      <p className="text-white/70 text-sm mb-12">
        Llamada {type === 'VIDEO' ? 'de video' : 'de voz'} entrante...
      </p>

      <div className="flex items-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-95
                       flex items-center justify-center text-white shadow-lg transition-all"
            title="Rechazar"
          >
            <svg className="w-7 h-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
          <span className="text-white/80 text-xs">Rechazar</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 active:scale-95
                       flex items-center justify-center text-white shadow-lg transition-all"
            title="Aceptar"
          >
            {type === 'VIDEO' ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            )}
          </button>
          <span className="text-white/80 text-xs">Aceptar</span>
        </div>
      </div>
    </div>
  )
}
