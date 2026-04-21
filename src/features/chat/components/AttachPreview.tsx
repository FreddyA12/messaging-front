import type { AttachType } from './AttachMenu'

interface AttachPreviewProps {
  file: File
  type: AttachType
  previewUrl: string | null
  progress: number | null
  onCancel: () => void
}

export function AttachPreview({ file, type, previewUrl, progress, onCancel }: AttachPreviewProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/60
                    border-t border-gray-200 dark:border-gray-700">
      {type === 'IMAGE' && previewUrl ? (
        <img src={previewUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover shrink-0" />
      ) : type === 'VIDEO' && previewUrl ? (
        <video src={previewUrl} className="w-12 h-12 rounded-lg object-cover shrink-0" muted />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
          {type === 'AUDIO' ? (
            <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
        {progress != null && (
          <div className="mt-1 w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {progress == null && (
        <button
          onClick={onCancel}
          className="shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                     rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
