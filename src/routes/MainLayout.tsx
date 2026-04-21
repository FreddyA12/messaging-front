import { useAuthStore } from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import { ChatList } from '../features/chat/components/ChatList'

export function MainLayout() {
  const user = useAuthStore((s) => s.user)
  const { logout } = useAuth()

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
        {/* User header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.statusText}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 ml-2"
          >
            Salir
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 min-h-0">
          <ChatList />
        </div>
      </aside>

      {/* Main area — ChatWindow will be placed here in Phase 2.2 */}
      <main className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        Selecciona un chat para comenzar
      </main>
    </div>
  )
}
