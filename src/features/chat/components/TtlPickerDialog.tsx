import { useState } from 'react'
import type { Message } from '../../../store/chatStore'

const PRESETS: { label: string; seconds: number }[] = [
  { label: '30 segundos', seconds: 30 },
  { label: '5 minutos',   seconds: 5 * 60 },
  { label: '1 hora',      seconds: 3600 },
  { label: '24 horas',    seconds: 86400 },
  { label: '7 días',      seconds: 7 * 86400 },
]

interface Props {
  message: Message
  onConfirm: (messageId: number, ttlSeconds: number) => void
  onClose: () => void
}

export function TtlPickerDialog({ message, onConfirm, onClose }: Props) {
  const [custom, setCustom] = useState('')

  const handlePreset = (seconds: number) => {
    onConfirm(message.id, seconds)
    onClose()
  }

  const handleCustom = () => {
    const secs = parseInt(custom, 10)
    if (!secs || secs <= 0) return
    onConfirm(message.id, secs)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Autodestrucción</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          El mensaje se eliminará automáticamente después del tiempo seleccionado.
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.seconds}
              onClick={() => handlePreset(p.seconds)}
              className="w-full py-2 text-sm text-left px-3 rounded-xl bg-gray-50 dark:bg-gray-700
                         text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="number"
            min={1}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Segundos personalizados"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleCustom}
            disabled={!custom || parseInt(custom) <= 0}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
            style={{ background: 'var(--color-primary, #7a9048)' }}
          >
            OK
          </button>
        </div>

        {message.expiresAt && (
          <button
            onClick={() => { onConfirm(message.id, 0); onClose() }}
            className="w-full py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Cancelar autodestrucción
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 mt-1 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
