import type { AttachmentDTO } from '../../../types/chat'
import { useAttachmentBlob } from '../../../hooks/useAttachmentBlob'

interface VideoBubbleProps {
  attachment: AttachmentDTO
}

export function VideoBubble({ attachment }: VideoBubbleProps) {
  const { url, loading } = useAttachmentBlob(attachment.id)

  if (loading) {
    return (
      <div className="rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center w-[260px] h-40">
        <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )
  }

  if (!url) return null

  return (
    <div className="rounded-xl overflow-hidden max-w-[260px]">
      <video
        src={url}
        controls
        preload="metadata"
        className="w-full max-h-64 rounded-xl bg-black"
      />
    </div>
  )
}
