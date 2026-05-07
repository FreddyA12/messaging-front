import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api'
import { api } from '../../../lib/axios'
import type { AuthUser as UserDTO } from '../../../types/auth'
import { useChatStore } from '../../../store/chatStore'

interface Props {
  onClose: () => void
}

export function CreateGroupDialog({ onClose }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserDTO[]>([])
  const [selected, setSelected] = useState<UserDTO[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const queryClient = useQueryClient()
  const setActiveChat = useChatStore((s) => s.setActiveChat)

  const search = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await api.get<UserDTO[]>('/api/users/search', { params: { q } })
      setResults(res.data.filter((u) => !selected.find((s) => s.id === u.id)))
    } finally {
      setSearching(false)
    }
  }

  const toggleUser = (user: UserDTO) => {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    )
    setResults((prev) => prev.filter((u) => u.id !== user.id))
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError('El nombre del grupo es obligatorio'); return }
    setCreating(true)
    setError('')
    try {
      const chat = await chatApi.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds: selected.map((u) => u.id),
      })
      await queryClient.invalidateQueries({ queryKey: ['chats'] })
      setActiveChat(chat.id)
      onClose()
    } catch {
      setError('No se pudo crear el grupo. Intenta de nuevo.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Nuevo grupo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Group name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del grupo *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del grupo"
              maxLength={100}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"
              style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripción (opcional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del grupo"
              maxLength={500}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Selected members */}
          {selected.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Miembros seleccionados</label>
              <div className="flex flex-wrap gap-2">
                {selected.map((u) => (
                  <span
                    key={u.id}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium"
                  >
                    {u.name}
                    <button onClick={() => setSelected((prev) => prev.filter((x) => x.id !== u.id))} className="ml-1 text-green-600 hover:text-green-900">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search members */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Añadir miembros</label>
            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary"
            />
            {searching && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
            {results.length > 0 && (
              <ul className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                {results.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => toggleUser(u)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-bold flex-shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--color-primary, #7a9048)' }}
          >
            {creating ? 'Creando...' : 'Crear grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}
