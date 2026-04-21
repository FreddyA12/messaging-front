import type { GalleryItemDTO } from '../../../types/chat'
import { AudioBubble } from '../../chat/components/AudioBubble'
import type { AttachmentDTO } from '../../../types/chat'

interface AudiosTabProps {
  items: GalleryItemDTO[]
  loading: boolean
  onScrollTo: (messageId: number) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function AudiosTab({ items, loading, onScrollTo }: AudiosTabProps) {
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
    return <p className="text-center text-xs text-gray-400 py-8">Sin audios compartidos.</p>
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((item) => {
        const attachment: AttachmentDTO = {
          id: item.attachmentId,
          type: 'AUDIO',
          filename: item.filename,
          mimeType: item.mimeType,
          sizeBytes: item.sizeBytes,
        }
        return (
          <li key={item.attachmentId} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                {item.senderName}
              </p>
              <button
                onClick={() => onScrollTo(item.messageId)}
                className="text-[10px] text-primary-500 hover:text-primary-700 transition-colors"
              >
                ir al mensaje
              </button>
            </div>
            <AudioBubble attachment={attachment} isOwn={false} />
            <p className="text-[10px] text-gray-400 mt-1">{formatDate(item.sentAt)}</p>
          </li>
        )
      })}
    </ul>
  )
}
