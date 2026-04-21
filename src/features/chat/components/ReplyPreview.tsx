import type { Message } from '../../../store/chatStore'

interface Props {
  message: Message
  onCancel: () => void
}

export function ReplyPreview({ message, onCancel }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
      <div className="flex-1 min-w-0 border-l-2 border-primary-500 pl-2">
        <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 truncate">
          {message.senderName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {message.content ?? 'Archivo adjunto'}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Cancelar respuesta"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
