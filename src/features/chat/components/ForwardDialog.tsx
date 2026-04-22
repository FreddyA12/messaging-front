import { useState } from 'react'
import type { Message } from '../../../store/chatStore'
import type { ChatListItem } from '../../../store/chatStore'

interface ForwardDialogProps {
  message: Message
  chats: ChatListItem[]
  onConfirm: (chatIds: number[]) => void
  onClose: () => void
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-amber-500',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

export function ForwardDialog({ chats, onConfirm, onClose }: ForwardDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="flex-1 font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Reenviar mensaje
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                       rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar chat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg
                         bg-gray-100 dark:bg-gray-700
                         text-gray-900 dark:text-gray-100 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filtered.map((chat) => (
            <label
              key={chat.id}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center
                               text-white font-semibold text-sm shrink-0 ${avatarColor(chat.name)}`}>
                {chat.name[0].toUpperCase()}
              </div>
              <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                {chat.name}
              </span>
              <input
                type="checkbox"
                checked={selected.has(chat.id)}
                onChange={() => toggle(chat.id)}
                className="w-4 h-4 rounded border-gray-300 text-primary-500
                           focus:ring-primary-500 accent-primary-500"
              />
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-6">Sin resultados</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400
                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                       transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0}
            className="flex-1 py-2 rounded-xl text-sm text-white font-medium
                       bg-primary-500 hover:bg-primary-600 disabled:opacity-40
                       disabled:cursor-not-allowed transition-colors"
          >
            Reenviar {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
