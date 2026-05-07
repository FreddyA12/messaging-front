import { useEffect, useRef, useState } from 'react'

interface AudioRecorderProps {
  onAudioReady: (file: File) => void
  onCancel: () => void
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function AudioRecorder({ onAudioReady, onCancel }: AudioRecorderProps) {
  const [phase, setPhase] = useState<'recording' | 'preview'>('recording')
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        blobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        setPhase('preview')
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      mr.start(100)

      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    }).catch(() => { onCancel() })

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  const handleSend = () => {
    if (!blobRef.current) return
    const ext = blobRef.current.type.includes('ogg') ? 'ogg' : 'webm'
    const file = new File([blobRef.current], `audio-${Date.now()}.${ext}`, { type: blobRef.current.type })
    onAudioReady(file)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }

  const handleCancel = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    onCancel()
  }

  if (phase === 'preview' && audioUrl) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px 12px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-sidebar)',
      }}>
        <button
          onClick={handleCancel}
          className="w-9 h-9 flex items-center justify-center rounded-full text-red-400
                     hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
          title="Cancelar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <audio src={audioUrl} controls className="flex-1 h-9" style={{ minWidth: 0 }} />

        <button
          onClick={handleSend}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #7a9048, #637839)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', boxShadow: '0 3px 12px rgba(122,144,72,0.3)',
          }}
          title="Enviar audio"
        >
          <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 16px 12px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-sidebar)',
    }}>
      <button
        onClick={handleCancel}
        className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400
                   hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
        title="Cancelar grabación"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <div className="flex-1 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
        <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-400 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min((elapsed / 120) * 100, 100)}%` }}
          />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', minWidth: '40px' }}>
          {formatSeconds(elapsed)}
        </span>
      </div>

      <button
        onClick={stopRecording}
        style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7a9048, #637839)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', boxShadow: '0 3px 12px rgba(122,144,72,0.3)',
        }}
        title="Detener y previsualizar"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
