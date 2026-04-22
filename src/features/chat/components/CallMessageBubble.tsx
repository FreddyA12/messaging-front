import type { Message } from '../../../store/chatStore'

interface CallMessageBubbleProps {
  message: Message
  currentUserId: number
}

type CallInfo = {
  type: 'voice' | 'video'
  status: 'answered' | 'missed' | 'rejected'
  duration?: string
}

function parseCallMessage(content: string | null): CallInfo | null {
  if (!content) return null

  // Examples:
  // "Llamada de voz perdida"
  // "Videollamada rechazada"
  // "Llamada de voz - 2:15"
  // "Videollamada - 45s"

  const isVideo = content.includes('Videollamada')
  const type = isVideo ? 'video' : 'voice'

  if (content.includes('perdida')) {
    return { type, status: 'missed' }
  }

  if (content.includes('rechazada')) {
    return { type, status: 'rejected' }
  }

  // Check if it has duration (answered call)
  const durationMatch = content.match(/- (.+)$/)
  if (durationMatch) {
    return { type, status: 'answered', duration: durationMatch[1] }
  }

  // Default to answered (if no duration, probably just started/ended without time)
  return { type, status: 'answered' }
}

// SVG Icons
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function PhoneMissedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l-4-4m0 0l-4 4m4-4v12M3 16a2 2 0 012-2h3.28a1 1 0 01.948.684l.648 1.945" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function VideoOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

export function CallMessageBubble({ message, currentUserId }: CallMessageBubbleProps) {
  const callInfo = parseCallMessage(message.content)

  if (!callInfo) {
    // Fallback to regular display if we can't parse
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs">
          {message.content}
        </div>
      </div>
    )
  }

  const isOutgoing = message.senderId === currentUserId
  const { type, status, duration } = callInfo

  // Icon and color based on type and status
  let IconComponent = PhoneIcon
  let iconColor = 'text-green-600'

  if (type === 'video') {
    if (status === 'answered') {
      IconComponent = VideoIcon
      iconColor = 'text-green-600'
    } else {
      IconComponent = VideoOffIcon
      iconColor = 'text-red-600'
    }
  } else {
    // voice
    if (status === 'answered') {
      IconComponent = PhoneIcon
      iconColor = 'text-green-600'
    } else {
      IconComponent = PhoneMissedIcon
      iconColor = 'text-red-600'
    }
  }

  // Text label
  let label = ''
  if (status === 'answered') {
    label = isOutgoing ? 'Llamada saliente' : 'Llamada entrante'
  } else if (status === 'missed') {
    label = isOutgoing ? 'Llamada cancelada' : 'Llamada perdida'
  } else {
    // rejected
    label = isOutgoing ? 'Llamada rechazada' : 'Llamada rechazada'
  }

  return (
    <div className="flex justify-center my-2">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm border ${
          status === 'answered'
            ? 'bg-white border-gray-200'
            : 'bg-red-50 border-red-100'
        }`}
      >
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full ${
            status === 'answered' ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <IconComponent className={`w-4 h-4 ${iconColor}`} />
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          {duration && (
            <span className="text-xs text-gray-500">{duration}</span>
          )}
        </div>
      </div>
    </div>
  )
}
