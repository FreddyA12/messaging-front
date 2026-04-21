import type { Message } from '../../../store/chatStore'

interface StarredMessagesViewProps {
  messages: Message[]
  isLoading: boolean
  onClose: () => void
  onScrollTo: (messageId: number) => void
  onUnstar: (messageId: number) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function StarredMessagesView({
  messages,
  isLoading,
  onClose,
  onScrollTo,
  onUnstar,
}: StarredMessagesViewProps) {
  return (
    <div className="flex flex-col h-full w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <svg className="w-5 h-5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <h2 className="flex-1 font-semibold text-sm text-gray-900 dark:text-gray-100">
          Mensajes destacados
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                     rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8 px-4">
            Ningún mensaje destacado todavía.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {messages.map((msg) => (
              <li key={msg.id} className="group px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onScrollTo(msg.id)}>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 truncate">
                      {msg.senderName}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-3 break-words">
                      {msg.content ?? 'Archivo adjunto'}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onUnstar(msg.id)}
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-amber-400
                               hover:text-amber-600 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20
                               transition-all"
                    title="Quitar destacado"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
