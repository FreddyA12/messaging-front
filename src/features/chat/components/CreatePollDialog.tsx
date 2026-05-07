import { useState } from 'react'
import { pollsApi } from '../api'

interface CreatePollDialogProps {
  chatId: number
  onClose: () => void
}

export function CreatePollDialog({ chatId, onClose }: CreatePollDialogProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [allowsMultiple, setAllowsMultiple] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addOption = () => {
    if (options.length < 8) setOptions([...options, ''])
  }

  const removeOption = (i: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, val: string) => {
    const next = [...options]
    next[i] = val
    setOptions(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = question.trim()
    const opts = options.map((o) => o.trim()).filter(Boolean)
    if (!q) { setError('Escribe una pregunta'); return }
    if (opts.length < 2) { setError('Añade al menos 2 opciones'); return }
    setError(null)
    setLoading(true)
    try {
      await pollsApi.create(chatId, q, opts, allowsMultiple)
      onClose()
    } catch {
      setError('No se pudo crear la encuesta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Nueva encuesta</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-4">
          {/* Question */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Pregunta
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Cuál es tu pregunta?"
              maxLength={200}
              className="w-full px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-primary-400 dark:focus:border-primary-500 transition-colors"
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Opciones
            </label>
            <div className="flex flex-col gap-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Opción ${i + 1}`}
                    maxLength={100}
                    className="flex-1 px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-primary-400 dark:focus:border-primary-500 transition-colors"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir opción
              </button>
            )}
          </div>

          {/* Multiple answers toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setAllowsMultiple((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${allowsMultiple ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allowsMultiple ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-200">Múltiples respuestas</span>
          </label>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creando...' : 'Crear encuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
