import { useAuthStore } from '../store/authStore'

// Placeholder layout — will be replaced in Phase 2 with ChatList + ChatWindow
export function MainLayout() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Sidebar placeholder */}
      <aside className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.statusText}</p>
            </div>
          </div>
          <button
            onClick={clearAuth}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Salir
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Los chats aparecerán aquí (Fase 2)
        </div>
      </aside>

      {/* Main area placeholder */}
      <main className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Selecciona un chat para comenzar
      </main>
    </div>
  )
}
