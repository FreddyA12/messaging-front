import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api'
import { api } from '../../../lib/axios'
import type { GroupMemberDTO } from '../../../types/chat'
import type { AuthUser } from '../../../types/auth'
import { useAuthStore } from '../../../store/authStore'
import { useChatStore } from '../../../store/chatStore'

interface Props {
  chatId: number
  chatName: string
  description?: string | null
  onClose: () => void
}

export function GroupInfoPanel({ chatId, chatName, description, onClose }: Props) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const setActiveChat = useChatStore((s) => s.setActiveChat)
  const [tab, setTab] = useState<'members' | 'add'>('members')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AuthUser[]>([])
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['group-members', chatId],
    queryFn: () => chatApi.getGroupMembers(chatId),
  })

  const currentMember = members.find((m) => m.userId === currentUser?.id)
  const isAdmin = currentMember?.role === 'ADMIN'

  const searchUsers = async (q: string) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    const res = await api.get<AuthUser[]>('/api/users/search', { params: { q } })
    setSearchResults(res.data.filter((u) => !members.find((m) => m.userId === u.id)))
  }

  const handleAddMember = async (userId: number) => {
    await chatApi.addGroupMembers(chatId, [userId])
    setSearchResults((prev) => prev.filter((u) => u.id !== userId))
    refetchMembers()
  }

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('¿Eliminar a este miembro del grupo?')) return
    await chatApi.removeGroupMember(chatId, userId)
    refetchMembers()
  }

  const handleChangeRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    await chatApi.changeGroupMemberRole(chatId, userId, newRole)
    refetchMembers()
  }

  const handleGenerateLink = async () => {
    const res = await chatApi.generateInviteLink(chatId)
    setInviteLink(`${window.location.origin}/join/${res.code}`)
  }

  const handleLeave = async () => {
    if (!confirm('¿Salir del grupo?')) return
    setLeaving(true)
    try {
      await chatApi.leaveGroup(chatId)
      await queryClient.invalidateQueries({ queryKey: ['chats'] })
      setActiveChat(null)
      onClose()
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Info del grupo</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Group avatar + name */}
      <div className="flex flex-col items-center gap-2 px-4 py-5 border-b border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
             style={{ background: 'var(--color-primary, #7a9048)' }}>
          {chatName[0].toUpperCase()}
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{chatName}</p>
        {description && <p className="text-xs text-gray-500 text-center">{description}</p>}
        <p className="text-xs text-gray-400">{members.length} miembro{members.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Invite link */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        {inviteLink ? (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'var(--color-primary, #7a9048)', color: '#fff' }}
            >
              Copiar
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateLink}
            className="w-full text-xs py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-primary hover:text-primary transition-colors"
          >
            + Generar enlace de invitación
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('members')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === 'members' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
        >
          Miembros
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('add')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === 'add' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
          >
            Añadir
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'members' ? (
          <ul>
            {members.map((m) => (
              <MemberRow
                key={m.userId}
                member={m}
                isAdmin={isAdmin}
                isSelf={m.userId === currentUser?.id}
                onRemove={handleRemoveMember}
                onChangeRole={handleChangeRole}
              />
            ))}
          </ul>
        ) : (
          <div className="p-3">
            <input
              value={searchQuery}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Buscar usuario..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none dark:bg-gray-800 dark:text-gray-100"
            />
            <ul className="mt-2">
              {searchResults.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => handleAddMember(u.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                         style={{ background: 'var(--color-primary, #7a9048)' }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-primary flex-shrink-0">
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Leave group */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="w-full py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          {leaving ? 'Saliendo...' : 'Salir del grupo'}
        </button>
      </div>
    </div>
  )
}

function MemberRow({
  member,
  isAdmin,
  isSelf,
  onRemove,
  onChangeRole,
}: {
  member: GroupMemberDTO
  isAdmin: boolean
  isSelf: boolean
  onRemove: (id: number) => void
  onChangeRole: (id: number, role: string) => void
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
           style={{ background: 'var(--color-primary, #7a9048)' }}>
        {member.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-100 truncate">
          {member.name} {isSelf && <span className="text-xs text-gray-400">(tú)</span>}
        </p>
        <p className="text-xs text-gray-400 capitalize">{member.role === 'ADMIN' ? 'Admin' : 'Miembro'}</p>
      </div>
      {isAdmin && !isSelf && (
        <div className="flex gap-1">
          <button
            onClick={() => onChangeRole(member.userId, member.role)}
            title={member.role === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M12 15l8-8M4 21v-3a4 4 0 014-4h4" />
            </svg>
          </button>
          <button
            onClick={() => onRemove(member.userId)}
            title="Eliminar del grupo"
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </li>
  )
}
