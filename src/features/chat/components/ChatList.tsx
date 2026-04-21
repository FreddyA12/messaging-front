import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useChatStore } from '../../../store/chatStore'
import { chatApi } from '../api'
import { NewChatModal } from './NewChatModal'

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-amber-500',
]

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000)

  if (date >= startOfToday) {
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }
  if (date >= startOfYesterday) return 'Ayer'
  const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return date.toLocaleDateString('es', { weekday: 'short' })
  }
  return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function ChatItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
      </div>
    </div>
  )
}

export function ChatList() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { chats, activeChatId, setChats, setActiveChat } = useChatStore()

  const { data, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => chatApi.getChats(),
  })

  useEffect(() => {
    if (data) setChats(data)
  }, [data, setChats])

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Search bar + new chat button */}
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar chats..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full
                         text-gray-900 dark:text-gray-100 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            title="Nuevo chat"
            className="w-8 h-8 flex items-center justify-center rounded-full
                       text-gray-500 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            Array.from({ length: 7 }).map((_, i) => <ChatItemSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-10 px-4">
              {search ? 'Sin resultados' : 'Aún no tienes chats'}
            </p>
          ) : (
            filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${
                    activeChatId === chat.id
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
              >
                {/* Avatar */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center
                               text-white font-semibold text-lg shrink-0
                               ${avatarColor(chat.name)}`}
                >
                  {chat.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                      {chat.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {chat.lastMessage ?? (
                        <span className="italic text-gray-400">Sin mensajes</span>
                      )}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span
                        className="shrink-0 min-w-[20px] h-5 rounded-full bg-primary-500
                                   text-white text-xs font-semibold
                                   flex items-center justify-center px-1"
                      >
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {showModal && <NewChatModal onClose={() => setShowModal(false)} />}
    </>
  )
}
