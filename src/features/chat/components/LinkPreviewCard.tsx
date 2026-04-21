import type { LinkPreviewDTO } from '../../../types/chat'

interface LinkPreviewCardProps {
  preview: LinkPreviewDTO
}

export function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  const hostname = (() => {
    try { return new URL(preview.url).hostname } catch { return preview.url }
  })()

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600
                 hover:border-primary-300 dark:hover:border-primary-600 transition-colors mt-1"
    >
      {preview.imageUrl && (
        <img
          src={preview.imageUrl}
          alt={preview.title ?? ''}
          className="w-full h-32 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800">
        {preview.siteName && (
          <p className="text-[10px] text-primary-500 dark:text-primary-400 font-medium truncate mb-0.5">
            {preview.siteName}
          </p>
        )}
        {preview.title && (
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
            {preview.description}
          </p>
        )}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-1">{hostname}</p>
      </div>
    </a>
  )
}
