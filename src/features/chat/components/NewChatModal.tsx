import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../../users/api'
import { chatApi } from '../api'
import { useChatStore } from '../../../store/chatStore'
import type { AuthUser } from '../../../types/auth'

interface NewChatModalProps {
  onClose: () => void
}

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

export function NewChatModal({ onClose }: NewChatModalProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const setActiveChat = useChatStore((s) => s.setActiveChat)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Debounce the search query by 300 ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: users = [], isFetching } = useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => userApi.searchUsers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  })

  const createChat = useMutation({
    mutationFn: (userId: number) => chatApi.createPrivateChat(userId),
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      setActiveChat(chat.id)
      onClose()
    },
  })

  const handleSelect = (user: AuthUser) => {
    if (createChat.isPending) return
    createChat.mutate(user.id)
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl
                      flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nuevo chat</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
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
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg
                         text-gray-900 dark:text-gray-100 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto scrollbar-thin max-h-72">
          {debouncedQuery.length < 2 ? (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8 px-4">
              Escribe al menos 2 caracteres para buscar
            </p>
          ) : isFetching ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/5" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
                </div>
              </div>
            ))
          ) : users.length === 0 ? (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8 px-4">
              No se encontraron usuarios
            </p>
          ) : (
            users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                disabled={createChat.isPending}
                className="w-full flex items-center gap-3 px-4 py-3 text-left
                           hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center
                               text-white font-semibold shrink-0 ${avatarColor(user.name)}`}
                >
                  {user.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                {createChat.isPending && (
                  <svg
                    className="w-4 h-4 text-primary-500 animate-spin shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>

        {createChat.isError && (
          <p className="text-xs text-red-500 text-center px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            No se pudo crear el chat. Intenta de nuevo.
          </p>
        )}
      </div>
    </div>
  )
}
