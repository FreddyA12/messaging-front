import { useState } from 'react'
import type { Message } from '../../../store/chatStore'

interface PinnedMessageBannerProps {
  messages: Message[]
  onScrollTo: (messageId: number) => void
  onUnpin?: (messageId: number) => void
}

export function PinnedMessageBanner({ messages, onScrollTo, onUnpin }: PinnedMessageBannerProps) {
  const [index, setIndex] = useState(0)

  if (messages.length === 0) return null

  const current = messages[index % messages.length]

  const cycleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIndex((i) => (i + 1) % messages.length)
  }

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900
                 border-b border-gray-200 dark:border-gray-700 cursor-pointer
                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
      onClick={() => onScrollTo(current.id)}
    >
      <svg className="w-4 h-4 text-primary-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2h2a1 1 0 010 2h-1v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8H3a1 1 0 110-2h2V4zm2 2h6V4H7v2zm-1 2v8h8V8H6z" />
      </svg>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-primary-500 dark:text-primary-400 leading-none mb-0.5">
          Mensaje fijado {messages.length > 1 ? `(${index + 1}/${messages.length})` : ''}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
          {current.content ?? 'Archivo adjunto'}
        </p>
      </div>

      {messages.length > 1 && (
        <button
          onClick={cycleNext}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                     rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Ver siguiente mensaje fijado"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {onUnpin && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnpin(current.id) }}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                     rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Desfijar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
