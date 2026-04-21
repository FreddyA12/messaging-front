import type { AttachmentDTO } from '../../../types/chat'
import { api } from '../../../lib/axios'

interface DocumentBubbleProps {
  attachment: AttachmentDTO
  isOwn: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const EXT_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📋', pptx: '📋', zip: '🗜️', txt: '📃',
}

function docIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return EXT_ICONS[ext] ?? '📁'
}

export function DocumentBubble({ attachment, isOwn }: DocumentBubbleProps) {
  const handleDownload = async () => {
    try {
      const res = await api.get(`/api/media/attachments/${attachment.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl min-w-[200px] max-w-[260px] cursor-pointer
        ${isOwn
          ? 'bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50'
          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
        } transition-colors`}
      onClick={handleDownload}
      title="Descargar"
    >
      <span className="text-2xl shrink-0">{docIcon(attachment.filename)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {attachment.filename}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {formatBytes(attachment.sizeBytes)}
        </p>
      </div>
      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </div>
  )
}
