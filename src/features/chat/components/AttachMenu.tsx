import { useRef } from 'react'

export type AttachType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO'

interface AttachMenuProps {
  onSelect: (file: File, type: AttachType) => void
  onClose: () => void
}

const OPTIONS: { type: AttachType; label: string; accept: string; icon: React.ReactNode }[] = [
  {
    type: 'IMAGE',
    label: 'Imagen',
    accept: 'image/*',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'VIDEO',
    label: 'Video',
    accept: 'video/*',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'AUDIO',
    label: 'Audio',
    accept: 'audio/*',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
  },
  {
    type: 'DOCUMENT',
    label: 'Documento',
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export function AttachMenu({ onSelect, onClose }: AttachMenuProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const triggerInput = (type: AttachType) => {
    inputRefs.current[type]?.click()
  }

  const handleChange = (type: AttachType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onSelect(file, type)
      onClose()
    }
    e.target.value = ''
  }

  return (
    <>
      {OPTIONS.map((opt) => (
        <input
          key={opt.type}
          ref={(el) => { inputRefs.current[opt.type] = el }}
          type="file"
          accept={opt.accept}
          className="hidden"
          onChange={(e) => handleChange(opt.type, e)}
        />
      ))}

      <div
        className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl
                   shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-30 min-w-[160px]"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => triggerInput(opt.type)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700
                       dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-primary-500">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </>
  )
}
