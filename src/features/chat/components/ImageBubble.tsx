import { useState } from 'react'
import type { AttachmentDTO } from '../../../types/chat'
import { useAttachmentBlob } from '../../../hooks/useAttachmentBlob'

interface ImageBubbleProps {
  attachment: AttachmentDTO
}

export function ImageBubble({ attachment }: ImageBubbleProps) {
  const { url: thumbUrl, loading } = useAttachmentBlob(attachment.thumbnailId ?? attachment.id, !!attachment.thumbnailId)
  const [lightbox, setLightbox] = useState(false)
  const { url: fullUrl } = useAttachmentBlob(lightbox ? attachment.id : undefined)

  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer max-w-[260px] min-w-[120px]"
        onClick={() => setLightbox(true)}
      >
        {loading && (
          <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-xl">
            <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt={attachment.filename}
            className="w-full max-h-64 object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-transparent hover:bg-black/10 transition-colors" />
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {fullUrl ? (
            <img
              src={fullUrl}
              alt={attachment.filename}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
        </div>
      )}
    </>
  )
}
