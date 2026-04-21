import type { GalleryItemDTO } from '../../../types/chat'
import { useAttachmentBlob } from '../../../hooks/useAttachmentBlob'

interface MediaTabProps {
  items: GalleryItemDTO[]
  loading: boolean
  onScrollTo: (messageId: number) => void
}

function MediaThumb({ item, onClick }: { item: GalleryItemDTO; onClick: () => void }) {
  const { url, loading } = useAttachmentBlob(item.thumbnailId ?? item.attachmentId, !!item.thumbnailId)

  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700
                 hover:opacity-90 transition-opacity relative"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}
      {url && <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />}
      {item.type === 'VIDEO' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      )}
    </button>
  )
}

export function MediaTab({ items, loading, onScrollTo }: MediaTabProps) {
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
    return <p className="text-center text-xs text-gray-400 py-8">Sin medios compartidos.</p>
  }

  return (
    <div className="grid grid-cols-3 gap-1 p-2">
      {items.map((item) => (
        <MediaThumb key={item.attachmentId} item={item} onClick={() => onScrollTo(item.messageId)} />
      ))}
    </div>
  )
}
