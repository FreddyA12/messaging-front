import { useCallback, useEffect, useRef, useState } from 'react'
import type { AttachType } from './AttachMenu'

interface CameraCaptureProps {
  onSend: (file: File, type: AttachType, caption: string, viewOnce: boolean) => void
  onClose: () => void
}

// ─── Filter types ────────────────────────────────────────────────────────────
type ColorFilter = 'none' | 'grayscale' | 'sepia' | 'vivid' | 'warm' | 'cool'
type ArFilterId = 'dog' | 'glasses' | 'bunny'
type SelectedFilter = { kind: 'color'; id: ColorFilter } | { kind: 'ar'; id: ArFilterId }

const COLOR_FILTERS: { id: ColorFilter; label: string; css: string; bg: string }[] = [
  { id: 'none',      label: 'Normal',  css: 'none',                                          bg: '#e8e8e8' },
  { id: 'grayscale', label: 'B&N',     css: 'grayscale(100%)',                               bg: '#888' },
  { id: 'sepia',     label: 'Sepia',   css: 'sepia(80%)',                                    bg: '#c8a882' },
  { id: 'vivid',     label: 'Vívido',  css: 'saturate(180%) contrast(110%)',                 bg: '#e63946' },
  { id: 'warm',      label: 'Cálido',  css: 'sepia(30%) saturate(140%) hue-rotate(-10deg)',  bg: '#f4a261' },
  { id: 'cool',      label: 'Frío',    css: 'saturate(120%) hue-rotate(20deg) brightness(105%)', bg: '#48cae4' },
]

const AR_FILTERS: { id: ArFilterId; label: string; emoji: string }[] = [
  { id: 'dog',     label: 'Perro',  emoji: '🐶' },
  { id: 'glasses', label: 'Gafas',  emoji: '🕶️' },
  { id: 'bunny',   label: 'Conejo', emoji: '🐰' },
]

type Phase = 'preview' | 'recording' | 'photo-taken' | 'video-taken'

// ─── Face detection (Chrome/Edge FaceDetector API) ───────────────────────────
interface FaceBox { x: number; y: number; width: number; height: number }

async function detectFace(img: HTMLImageElement): Promise<FaceBox | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FD = (window as any).FaceDetector
  if (!FD) return null
  try {
    const detector = new FD({ fastMode: true, maxDetectedFaces: 1 })
    const faces = await detector.detect(img)
    if (!faces.length) return null
    const bb = faces[0].boundingBox
    return { x: bb.x, y: bb.y, width: bb.width, height: bb.height }
  } catch { return null }
}

// Default face box when detector is unavailable
function defaultFace(w: number, h: number): FaceBox {
  return { x: w * 0.2, y: h * 0.1, width: w * 0.6, height: h * 0.55 }
}

// ─── AR drawing functions ────────────────────────────────────────────────────
function drawDog(ctx: CanvasRenderingContext2D, w: number, h: number, face: FaceBox | null) {
  const fb = face ?? defaultFace(w, h)
  const fw = fb.width
  const earW = fw * 0.21
  const earH = fw * 0.38

  // Left ear
  ctx.save()
  ctx.translate(fb.x + fw * 0.08, fb.y - earH * 0.25)
  ctx.rotate(-0.38)
  ctx.fillStyle = '#7B3F00'
  ctx.beginPath(); ctx.ellipse(0, 0, earW, earH, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#C68642'
  ctx.beginPath(); ctx.ellipse(0, earH * 0.1, earW * 0.55, earH * 0.72, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Right ear
  ctx.save()
  ctx.translate(fb.x + fw * 0.92, fb.y - earH * 0.25)
  ctx.rotate(0.38)
  ctx.fillStyle = '#7B3F00'
  ctx.beginPath(); ctx.ellipse(0, 0, earW, earH, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#C68642'
  ctx.beginPath(); ctx.ellipse(0, earH * 0.1, earW * 0.55, earH * 0.72, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Nose
  const nx = fb.x + fw * 0.5, ny = fb.y + fb.height * 0.78
  ctx.fillStyle = '#1a1a1a'
  ctx.beginPath()
  ctx.roundRect(nx - fw * 0.09, ny - fw * 0.06, fw * 0.18, fw * 0.115, fw * 0.05)
  ctx.fill()
  // Highlight on nose
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath(); ctx.ellipse(nx - fw * 0.03, ny - fw * 0.025, fw * 0.03, fw * 0.025, 0, 0, Math.PI * 2); ctx.fill()

  // Cheek spots
  ctx.fillStyle = 'rgba(139,90,43,0.28)'
  ctx.beginPath(); ctx.ellipse(fb.x + fw * 0.22, fb.y + fb.height * 0.66, fw * 0.1, fw * 0.067, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(fb.x + fw * 0.78, fb.y + fb.height * 0.66, fw * 0.1, fw * 0.067, 0, 0, Math.PI * 2); ctx.fill()
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, size * 0.35)
  ctx.bezierCurveTo(-size * 1.2, -size * 0.75, -size * 2.4, size * 0.25, 0, size * 1.5)
  ctx.bezierCurveTo(size * 2.4, size * 0.25, size * 1.2, -size * 0.75, 0, size * 0.35)
  ctx.fill(); ctx.restore()
}

function drawGlasses(ctx: CanvasRenderingContext2D, w: number, h: number, face: FaceBox | null) {
  const fb = face ?? defaultFace(w, h)
  const fw = fb.width
  const eyeY = fb.y + fb.height * 0.38
  const r = fw * 0.175
  const lx = fb.x + fw * 0.27, rx = fb.x + fw * 0.73
  const lw = fw * 0.028

  // Lens fill
  ctx.fillStyle = 'rgba(255, 100, 180, 0.22)'
  ctx.beginPath(); ctx.arc(lx, eyeY, r, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(rx, eyeY, r, 0, Math.PI * 2); ctx.fill()

  // Frames
  ctx.strokeStyle = '#FF1493'; ctx.lineWidth = lw; ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.arc(lx, eyeY, r, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(rx, eyeY, r, 0, Math.PI * 2); ctx.stroke()

  // Bridge
  ctx.beginPath()
  ctx.moveTo(lx + r, eyeY - r * 0.15)
  ctx.quadraticCurveTo((lx + rx) / 2, eyeY - r * 0.5, rx - r, eyeY - r * 0.15)
  ctx.stroke()

  // Temples
  ctx.beginPath(); ctx.moveTo(lx - r, eyeY); ctx.lineTo(fb.x - fw * 0.05, eyeY - fw * 0.04); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(rx + r, eyeY); ctx.lineTo(fb.x + fw * 1.05, eyeY - fw * 0.04); ctx.stroke()

  // Hearts inside lenses
  drawHeart(ctx, lx, eyeY - r * 0.1, r * 0.3, 'rgba(255,100,180,0.7)')
  drawHeart(ctx, rx, eyeY - r * 0.1, r * 0.3, 'rgba(255,100,180,0.7)')

  // Star decorations
  const starSize = r * 0.18
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + i * 0.15})`
    ctx.beginPath()
    ctx.arc(lx + Math.cos(angle) * r * 0.75, eyeY + Math.sin(angle) * r * 0.75, starSize, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBunny(ctx: CanvasRenderingContext2D, w: number, h: number, face: FaceBox | null) {
  const fb = face ?? defaultFace(w, h)
  const fw = fb.width
  const earW = fw * 0.115
  const earH = fw * 0.58
  const lx = fb.x + fw * 0.3, rx = fb.x + fw * 0.7
  const earCY = fb.y - earH * 0.38

  // Left ear
  ctx.save(); ctx.translate(lx, earCY); ctx.rotate(-0.12)
  ctx.fillStyle = '#F0F0F0'
  ctx.beginPath(); ctx.ellipse(0, 0, earW, earH, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#FFB6C1'
  ctx.beginPath(); ctx.ellipse(0, earH * 0.05, earW * 0.45, earH * 0.78, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Right ear
  ctx.save(); ctx.translate(rx, earCY); ctx.rotate(0.12)
  ctx.fillStyle = '#F0F0F0'
  ctx.beginPath(); ctx.ellipse(0, 0, earW, earH, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#FFB6C1'
  ctx.beginPath(); ctx.ellipse(0, earH * 0.05, earW * 0.45, earH * 0.78, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  // Nose
  const nx = fb.x + fw * 0.5, ny = fb.y + fb.height * 0.77
  ctx.fillStyle = '#FF9EB5'
  ctx.beginPath()
  ctx.moveTo(nx, ny - fw * 0.048)
  ctx.lineTo(nx - fw * 0.052, ny + fw * 0.03)
  ctx.lineTo(nx + fw * 0.052, ny + fw * 0.03)
  ctx.closePath(); ctx.fill()

  // Cheek blush
  ctx.fillStyle = 'rgba(255,182,193,0.38)'
  ctx.beginPath(); ctx.ellipse(fb.x + fw * 0.2, ny - fw * 0.05, fw * 0.1, fw * 0.065, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(fb.x + fw * 0.8, ny - fw * 0.05, fw * 0.1, fw * 0.065, 0, 0, Math.PI * 2); ctx.fill()

  // Whisker dots
  ctx.fillStyle = 'rgba(180, 100, 130, 0.6)'
  const dotPositions = [
    [0.18, 0.72], [0.23, 0.76], [0.18, 0.80],
    [0.82, 0.72], [0.77, 0.76], [0.82, 0.80],
  ]
  for (const [px, py] of dotPositions) {
    ctx.beginPath()
    ctx.arc(fb.x + fw * px, fb.y + fb.height * py, fw * 0.018, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ─── Apply filters to canvas and return Blob ─────────────────────────────────
async function buildFilteredBlob(
  src: HTMLCanvasElement,
  color: ColorFilter,
  ar: ArFilterId | null,
  face: FaceBox | null,
): Promise<Blob> {
  const out = document.createElement('canvas')
  out.width = src.width; out.height = src.height
  const ctx = out.getContext('2d')!
  const csf = COLOR_FILTERS.find((f) => f.id === color)?.css ?? 'none'
  ctx.filter = csf
  ctx.drawImage(src, 0, 0)
  ctx.filter = 'none'
  if (ar === 'dog')     drawDog(ctx, out.width, out.height, face)
  if (ar === 'glasses') drawGlasses(ctx, out.width, out.height, face)
  if (ar === 'bunny')   drawBunny(ctx, out.width, out.height, face)
  return new Promise((res) => out.toBlob((b) => res(b!), 'image/jpeg', 0.92))
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CameraCapture({ onSend, onClose }: CameraCaptureProps) {
  const [phase, setPhase] = useState<Phase>('preview')
  const [filter, setFilter] = useState<SelectedFilter>({ kind: 'color', id: 'none' })
  const [caption, setCaption] = useState('')
  const [viewOnce, setViewOnce] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [error, setError] = useState<string | null>(null)
  const [recElapsed, setRecElapsed] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null) // filtered preview for photo
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null) // unfiltered photo
  const faceRef = useRef<FaceBox | null>(null)
  const captureTypeRef = useRef<AttachType>('IMAGE')

  // ── Camera startup ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Tu navegador no permite acceso a la cámara.')
      return
    }
    const tryStream = async (): Promise<MediaStream> => {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })
      } catch {
        return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      }
    }
    try {
      const stream = await tryStream()
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
        setError('Permiso denegado. Habilítalo en la configuración del navegador.')
      else if (name === 'NotFoundError')
        setError('No se encontró ninguna cámara en este dispositivo.')
      else if (name === 'NotReadableError')
        setError('La cámara está siendo usada por otra aplicación.')
      else
        setError('No se pudo acceder a la cámara.')
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Rebuild preview when filter changes (photo phase only) ───────────────────
  useEffect(() => {
    if (phase !== 'photo-taken' || !originalCanvasRef.current) return
    setProcessing(true)
    const ar = filter.kind === 'ar' ? filter.id : null
    buildFilteredBlob(originalCanvasRef.current, filter.kind === 'color' ? filter.id : 'none', ar, faceRef.current)
      .then((blob) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(URL.createObjectURL(blob))
      })
      .finally(() => setProcessing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, phase])

  // ── Photo capture ────────────────────────────────────────────────────────────
  const takePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    originalCanvasRef.current = canvas
    captureTypeRef.current = 'IMAGE'
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    // Reset filter on new capture
    setFilter({ kind: 'color', id: 'none' })
    faceRef.current = null
    setProcessing(true)
    setPhase('photo-taken')

    // Detect face and build initial preview (no filter)
    canvas.toBlob(async (blob) => {
      if (!blob) { setProcessing(false); return }
      const img = new Image()
      const tmpUrl = URL.createObjectURL(blob)
      img.onload = async () => {
        URL.revokeObjectURL(tmpUrl)
        faceRef.current = await detectFace(img)
        const noFilterBlob = await buildFilteredBlob(canvas, 'none', null, faceRef.current)
        setPreviewUrl(URL.createObjectURL(noFilterBlob))
        setProcessing(false)
      }
      img.src = tmpUrl
    }, 'image/jpeg', 0.97)
  }

  // ── Video recording ──────────────────────────────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus' : 'video/webm'
    const mr = new MediaRecorder(streamRef.current, { mimeType: mime })
    mrRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime })
      captureTypeRef.current = 'VIDEO'
      const url = URL.createObjectURL(blob)
      setVideoUrl(url)
      setFilter({ kind: 'color', id: 'none' })
      setPhase('video-taken')
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mr.start(100)
    setRecElapsed(0)
    setPhase('recording')
    timerRef.current = setInterval(() => setRecElapsed((s) => s + 1), 1000)
  }

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mrRef.current?.stop()
  }

  // ── Retake ───────────────────────────────────────────────────────────────────
  const retake = () => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    if (videoUrl) { URL.revokeObjectURL(videoUrl); setVideoUrl(null) }
    originalCanvasRef.current = null
    faceRef.current = null
    setCaption('')
    setViewOnce(false)
    setFilter({ kind: 'color', id: 'none' })
    setPhase('preview')
    startCamera(facingMode)
  }

  const flipCamera = () => {
    const next: 'user' | 'environment' = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(next)
    startCamera(next)
  }

  // ── Send ─────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (processing) return
    setProcessing(true)
    try {
      if (phase === 'photo-taken' && originalCanvasRef.current) {
        const ar = filter.kind === 'ar' ? filter.id : null
        const colorId = filter.kind === 'color' ? filter.id : 'none'
        const blob = await buildFilteredBlob(originalCanvasRef.current, colorId, ar, faceRef.current)
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onSend(file, 'IMAGE', caption, viewOnce)
      } else if (phase === 'video-taken') {
        const raw = new Blob(chunksRef.current, { type: 'video/webm' })
        const file = new File([raw], `camera-${Date.now()}.webm`, { type: raw.type })
        onSend(file, 'VIDEO', caption, viewOnce)
      }
    } finally {
      setProcessing(false)
    }
  }

  const isConfirmation = phase === 'photo-taken' || phase === 'video-taken'
  const cssFilter = filter.kind === 'color'
    ? (COLOR_FILTERS.find((f) => f.id === filter.id)?.css ?? 'none')
    : 'none'

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={(e) => e.stopPropagation()}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={isConfirmation ? retake : onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          {isConfirmation ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>

        {phase === 'recording' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600/80 rounded-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-mono font-semibold">
              {String(Math.floor(recElapsed / 60)).padStart(2, '0')}:{String(recElapsed % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        {!isConfirmation && (
          <button
            onClick={flipCamera}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Viewfinder / Preview ─────────────────────────────────────────────── */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error && !isConfirmation ? (
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-white text-sm leading-relaxed">{error}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-full transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : !isConfirmation ? (
          // Live camera feed — no filter applied here
          <video
            ref={videoRef}
            autoPlay muted playsInline
            style={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            }}
          />
        ) : phase === 'photo-taken' ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="captura"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            )}
            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}
          </div>
        ) : (
          // Video preview — color filter via CSS (AR not applied to video)
          videoUrl && (
            <video
              src={videoUrl}
              controls autoPlay loop
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: cssFilter }}
            />
          )
        )}
      </div>

      {/* ── Confirmation: filter strip + caption + send ──────────────────────── */}
      {isConfirmation && (
        <div className="shrink-0">
          {/* Filter strip */}
          <div className="flex items-center gap-0 px-3 py-2 overflow-x-auto">
            {/* AR filters */}
            {phase === 'photo-taken' && AR_FILTERS.map((af) => {
              const active = filter.kind === 'ar' && filter.id === af.id
              return (
                <button
                  key={af.id}
                  onClick={() => setFilter({ kind: 'ar', id: af.id })}
                  className={`flex flex-col items-center gap-1 shrink-0 px-2 transition-opacity ${active ? 'opacity-100' : 'opacity-55'}`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl
                    border-2 transition-colors ${active ? 'border-white' : 'border-transparent'}`}
                    style={{ background: 'rgba(255,255,255,0.15)' }}>
                    {af.emoji}
                  </div>
                  <span className="text-white text-[10px] font-medium">{af.label}</span>
                </button>
              )
            })}

            {/* Divider */}
            {phase === 'photo-taken' && (
              <div className="w-px h-10 bg-white/30 mx-2 shrink-0" />
            )}

            {/* Color filters */}
            {COLOR_FILTERS.map((cf) => {
              const active = filter.kind === 'color' && filter.id === cf.id
              return (
                <button
                  key={cf.id}
                  onClick={() => setFilter({ kind: 'color', id: cf.id })}
                  className={`flex flex-col items-center gap-1 shrink-0 px-2 transition-opacity ${active ? 'opacity-100' : 'opacity-55'}`}
                >
                  <div
                    className={`w-11 h-11 rounded-full border-2 transition-colors`}
                    style={{
                      background: cf.bg,
                      borderColor: active ? '#fff' : 'transparent',
                    }}
                  />
                  <span className="text-white text-[10px] font-medium">{cf.label}</span>
                </button>
              )
            })}
          </div>

          {/* Caption input */}
          <div className="px-4 pb-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Añade un mensaje..."
              className="w-full px-4 py-2.5 rounded-2xl text-sm text-white placeholder-white/50 outline-none"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </div>

          {/* View-once + Send row */}
          <div className="flex items-center justify-between px-4 pb-6">
            <button
              onClick={() => setViewOnce((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                viewOnce
                  ? 'bg-white/90 text-gray-900'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              title="Ver una vez"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver una vez
            </button>

            <button
              onClick={handleSend}
              disabled={processing}
              style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #7a9048, #637839)',
                border: 'none', cursor: processing ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', boxShadow: '0 4px 16px rgba(122,144,72,0.4)',
                opacity: processing ? 0.6 : 1,
              }}
              title="Enviar"
            >
              {processing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Viewfinder controls (capture buttons) ───────────────────────────── */}
      {!isConfirmation && (
        <div className={`flex items-center justify-center gap-8 py-8 shrink-0 ${error ? 'invisible' : ''}`}>
          {phase === 'recording' ? (
            <button
              onClick={stopRecording}
              className="flex flex-col items-center gap-1.5 text-white"
            >
              <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-red-600">
                <div className="w-6 h-6 rounded bg-white" />
              </div>
              <span className="text-xs">Detener</span>
            </button>
          ) : (
            <>
              <button onClick={startRecording} className="flex flex-col items-center gap-1.5 text-white opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-red-500" />
                </div>
                <span className="text-xs">Video</span>
              </button>

              <button onClick={takePhoto} className="flex flex-col items-center gap-1.5 text-white">
                <div className="w-18 h-18 rounded-full border-4 border-white p-1.5">
                  <div className="w-full h-full rounded-full bg-white" style={{ width: 56, height: 56 }} />
                </div>
                <span className="text-xs font-semibold">Foto</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
