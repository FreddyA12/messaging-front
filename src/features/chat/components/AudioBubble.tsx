import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import type { AttachmentDTO } from '../../../types/chat'
import { useAttachmentBlob } from '../../../hooks/useAttachmentBlob'

interface AudioBubbleProps {
  attachment: AttachmentDTO
  isOwn: boolean
}

export function AudioBubble({ attachment, isOwn }: AudioBubbleProps) {
  const { url, loading } = useAttachmentBlob(attachment.id)
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!url || !containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: isOwn ? '#a3c4f3' : '#94a3b8',
      progressColor: isOwn ? '#2563eb' : '#475569',
      height: 36,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      interact: true,
      cursorWidth: 0,
    })

    wsRef.current = ws

    ws.on('ready', () => {
      setDuration(ws.getDuration())
      setReady(true)
    })
    ws.on('timeupdate', (t) => setCurrentTime(t))
    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => { setIsPlaying(false); setCurrentTime(0) })

    ws.load(url)

    return () => {
      ws.destroy()
      wsRef.current = null
    }
  }, [url, isOwn])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const togglePlay = () => wsRef.current?.playPause()

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl min-w-[220px] max-w-[280px]
      ${isOwn ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>

      <button
        onClick={togglePlay}
        disabled={!ready}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
          ${ready
            ? 'bg-primary-500 hover:bg-primary-600 text-white'
            : 'bg-gray-300 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
      >
        {loading || !ready ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : isPlaying ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div ref={containerRef} className="w-full" />
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          {formatTime(currentTime)}{duration != null ? ` / ${formatTime(duration)}` : ''}
        </p>
      </div>
    </div>
  )
}
