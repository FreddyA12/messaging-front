import { useState } from 'react'
import type { AttachmentDTO } from '../../../types/chat'
import { useAttachmentBlob } from '../../../hooks/useAttachmentBlob'

interface VideoBubbleProps {
  attachment: AttachmentDTO
  viewOnce?: boolean
  viewedByMe?: boolean
  isOwn?: boolean
  onView?: () => void
}

export function VideoBubble({ attachment, viewOnce, viewedByMe, isOwn, onView }: VideoBubbleProps) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [consumed, setConsumed] = useState(false)

  const isViewOnceReceiver = !!(viewOnce && !isOwn)
  const hasBeenViewed = isViewOnceReceiver && (viewedByMe || consumed)

  const { url, loading } = useAttachmentBlob(
    (!isViewOnceReceiver || overlayOpen) ? attachment.id : undefined,
  )

  const handleOpenViewOnce = () => {
    setOverlayOpen(true)
    onView?.()
  }

  const handleCloseViewOnce = () => {
    setOverlayOpen(false)
    setConsumed(true)
  }

  // ── "Video visto" placeholder ─────────────────────────────────────────────
  if (hasBeenViewed && !overlayOpen) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700/60 max-w-[200px]">
        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Video visto</span>
      </div>
    )
  }

  // ── "Ver video" button (view-once, not yet viewed) ────────────────────────
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
              d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">Ver video</p>
          <p className="text-[11px] text-primary-500 dark:text-primary-400">Ver una vez</p>
        </div>
      </button>
    )
  }

  // ── View-once fullscreen overlay ──────────────────────────────────────────
  if (isViewOnceReceiver && overlayOpen) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/60">
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

        {/* Video */}
        <div className="flex-1 flex items-center justify-center p-4">
          {loading || !url ? (
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <video
              src={url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg bg-black"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          )}
        </div>

        {/* Bottom hint */}
        <div className="px-4 py-3 flex justify-center">
          <span className="text-xs text-white/50">Cierra para no poder volver a verlo</span>
        </div>
      </div>
    )
  }

  // ── Normal video bubble ──────────────────────────────────────────────────
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
    <div className="rounded-xl overflow-hidden max-w-[260px] relative">
      <video
        src={url}
        controls
        preload="metadata"
        className="w-full max-h-64 rounded-xl bg-black"
      />
      {viewOnce && isOwn && (
        <div className="absolute bottom-8 left-1.5 flex items-center gap-1 px-1.5 py-0.5
                        rounded-full bg-black/50 text-white pointer-events-none">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-[9px] font-medium">1</span>
        </div>
      )}
    </div>
  )
}
