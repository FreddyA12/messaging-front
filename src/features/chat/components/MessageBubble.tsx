import type { Message } from '../../../store/chatStore'

interface MessageBubbleProps {
  message: Message
  currentUserId: number
  chatType: 'PRIVATE' | 'GROUP'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, currentUserId, chatType }: MessageBubbleProps) {
  const isOwn = message.senderId === currentUserId

  if (message.deletedForEveryone) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[70%] px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-xs italic">
          Mensaje eliminado
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-3 py-1.5 rounded-2xl shadow-sm
          ${isOwn
            ? 'bg-bubble-outgoing text-gray-900 rounded-br-sm'
            : 'bg-bubble-incoming dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-transparent'
          }`}
      >
        {/* Sender name — groups, incoming only */}
        {!isOwn && chatType === 'GROUP' && (
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-0.5 truncate">
            {message.senderName}
          </p>
        )}

        {/* Text content */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap break-words leading-snug">
            {message.content}
          </p>
        )}

        {/* Timestamp + edit label + tick placeholder */}
        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {message.editedAt && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">editado ·</span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatTime(message.createdAt)}
          </span>
          {/* Single tick placeholder — Phase 3 will complete read/delivered state */}
          {isOwn && (
            <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
