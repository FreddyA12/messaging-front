import { useRef, useState } from 'react'
import { storiesApi } from '../api'
import { useStoryStore } from '../../../store/storyStore'
import { useAuthStore } from '../../../store/authStore'
import { encryptUserField } from '../../../lib/userEncryption'

const BG_COLORS = [
  '#1a73e8', '#0f9d58', '#e53935', '#f57c00',
  '#6d4c41', '#5e35b1', '#00838f', '#212121',
]

interface Props {
  onClose: () => void
}

export function CreateStoryDialog({ onClose }: Props) {
  const addMyStory = useStoryStore((s) => s.addMyStory)
  const currentUser = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<'text' | 'media'>('text')
  const [text, setText] = useState('')
  const [bg, setBg] = useState(BG_COLORS[0])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async () => {
    if (tab === 'text' && !text.trim()) return
    if (tab === 'media' && !file) return
    setLoading(true)
    try {
      const form = new FormData()
      if (tab === 'media' && file) {
        form.append('file', file)
      }
      if (tab === 'text') {
        form.append('textContent', currentUser?.id ? encryptUserField(text.trim(), currentUser.id) : text.trim())
        form.append('backgroundColor', bg)
      }
      const story = await storiesApi.createStory(form)
      addMyStory(story)
      onClose()
    } finally {
      setLoading(false)
      if (preview) URL.revokeObjectURL(preview)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Nueva historia</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {(['text', 'media'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors
                ${tab === t
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
            >
              {t === 'text' ? 'Texto' : 'Imagen / Video'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'text' ? (
            <>
              {/* Text preview */}
              <div
                className="rounded-xl flex items-center justify-center mb-4 h-40 relative"
                style={{ background: bg }}
              >
                <p className="text-white font-semibold text-lg text-center px-4 break-words max-w-full">
                  {text || 'Tu texto aquí...'}
                </p>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe algo..."
                maxLength={300}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:border-primary-400 resize-none mb-3"
              />

              {/* Color picker */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBg(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${bg === c ? 'scale-125 ring-2 ring-offset-1 ring-primary-500' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Media preview */}
              <div
                className="rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4 h-48 overflow-hidden cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  file?.type.startsWith('video/') ? (
                    <video src={preview} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={preview} alt="preview" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Toca para seleccionar</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {!preview && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-2 mb-4 text-sm text-primary-600 border border-primary-300 rounded-xl hover:bg-primary-50 transition-colors"
                >
                  Seleccionar archivo
                </button>
              )}
            </>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || (tab === 'text' ? !text.trim() : !file)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                       disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7a9048, #637839)' }}
          >
            {loading ? 'Publicando...' : 'Publicar historia'}
          </button>
        </div>
      </div>
    </div>
  )
}
