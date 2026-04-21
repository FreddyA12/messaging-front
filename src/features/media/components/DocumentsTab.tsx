import type { GalleryItemDTO } from '../../../types/chat'
import { api } from '../../../lib/axios'

interface DocumentsTabProps {
  items: GalleryItemDTO[]
  loading: boolean
  onScrollTo: (messageId: number) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function downloadAttachment(id: number, filename: string) {
  try {
    const res = await api.get(`/api/media/attachments/${id}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // silently fail
  }
}

export function DocumentsTab({ items, loading, onScrollTo }: DocumentsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-center text-xs text-gray-400 py-8">Sin documentos compartidos.</p>
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((item) => (
        <li key={item.attachmentId}
          className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          onClick={() => onScrollTo(item.messageId)}
        >
          <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.filename}</p>
            <p className="text-[11px] text-gray-400">{formatBytes(item.sizeBytes)} · {formatDate(item.sentAt)}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); downloadAttachment(item.attachmentId, item.filename) }}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-500
                       rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            title="Descargar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
