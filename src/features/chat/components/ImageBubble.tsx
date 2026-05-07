import { useState } from 'react'
import type { AttachmentDTO } from '../../../types/chat'
import { useAttachmentBlob } from '../../../hooks/useAttachmentBlob'

interface ImageBubbleProps {
  attachment: AttachmentDTO
  viewOnce?: boolean
  viewedByMe?: boolean
  isOwn?: boolean
  onView?: () => void
}

export function ImageBubble({ attachment, viewOnce, viewedByMe, isOwn, onView }: ImageBubbleProps) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [consumed, setConsumed] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const isViewOnceReceiver = !!(viewOnce && !isOwn)
  const hasBeenViewed = isViewOnceReceiver && (viewedByMe || consumed)

  // Load thumbnail only when needed
  const { url: thumbUrl, loading: thumbLoading } = useAttachmentBlob(
    (!isViewOnceReceiver || overlayOpen) ? (attachment.thumbnailId ?? attachment.id) : undefined,
    !!attachment.thumbnailId,
  )
  // Load full image for lightbox (normal) or view-once overlay
  const { url: fullUrl } = useAttachmentBlob(
    (lightbox || overlayOpen) ? attachment.id : undefined,
  )

  const handleOpenViewOnce = () => {
    setOverlayOpen(true)
    onView?.()
  }

  const handleCloseViewOnce = () => {
    setOverlayOpen(false)
    setConsumed(true)
  }

  // ── "Foto vista" placeholder ──────────────────────────────────────────────
  if (hasBeenViewed && !overlayOpen) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700/60 max-w-[200px]">
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Foto vista</span>
      </div>
    )
  }

  // ── "Ver foto" button (view-once, not yet viewed) ─────────────────────────
  if (isViewOnceReceiver && !overlayOpen) {
    return (
      <button
        onClick={handleOpenViewOnce}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30
                   border border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/50
                   transition-colors max-w-[200px] w-full"
      >
        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-800/60 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">Ver foto</p>
          <p className="text-[11px] text-primary-500 dark:text-primary-400">Ver una vez</p>
        </div>
      </button>
    )
  }

  // ── View-once fullscreen overlay ─────────────────────────────────────────
  if (isViewOnceReceiver && overlayOpen) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black flex flex-col"
        onClick={handleCloseViewOnce}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-white">
            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm font-medium">Ver una vez</span>
          </div>
          <button
            onClick={handleCloseViewOnce}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          {!fullUrl ? (
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <img
              src={fullUrl}
              alt={attachment.filename}
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              draggable={false}
            />
          )}
        </div>

        {/* Bottom hint */}
        <div className="px-4 py-3 flex justify-center">
          <span className="text-xs text-white/50">Toca fuera de la imagen para cerrar</span>
        </div>
      </div>
    )
  }

  // ── Normal image bubble ──────────────────────────────────────────────────
  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer max-w-[260px] min-w-[120px]"
        onClick={() => setLightbox(true)}
      >
        {thumbLoading && (
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
        {viewOnce && isOwn && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5
                          rounded-full bg-black/50 text-white">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-[9px] font-medium">1</span>
          </div>
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
