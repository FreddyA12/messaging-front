import { useCallback, useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import type { AttachType } from './AttachMenu'

interface CameraCaptureProps {
  onSend: (file: File, type: AttachType, caption: string, viewOnce: boolean) => void
  onClose: () => void
}

// ─── Filter types ────────────────────────────────────────────────────────────
type ColorFilter = 'none' | 'grayscale' | 'sepia' | 'vivid' | 'warm' | 'cool'
type ArFilterId = 'dog' | 'glasses' | 'bunny'
type SelectedFilter = { kind: 'color'; id: ColorFilter } | { kind: 'ar'; id: ArFilterId }

// ─── Face API models loader ──────────────────────────────────────────────────
let modelsLoaded = false

async function loadFaceAPIModels(): Promise<void> {
  if (modelsLoaded) return
  try {
    console.log('[FaceAPI] Loading models from CDN...')
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
    await Promise.all([
      faceapi.nets.tinyFaceDetector.load(MODEL_URL),
      faceapi.nets.faceLandmark68Net.load(MODEL_URL), // Required for .withFaceLandmarks()
    ])
    modelsLoaded = true
    console.log('[FaceAPI] Models loaded successfully')
  } catch (e) {
    console.error('[FaceAPI] Failed to load models:', e)
    modelsLoaded = false
  }
}

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

// ─── Face detection (face-api.js TinyFaceDetector) ──────────────────────────
interface FaceBox { x: number; y: number; width: number; height: number }
interface FaceLandmarks {
  leftEye: [number, number]
  rightEye: [number, number]
  nose: [number, number]
  mouth: [number, number]
}

interface DetectedFace {
  box: FaceBox
  landmarks: FaceLandmarks
}

async function detectFace(source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): Promise<DetectedFace | null> {
  if (!modelsLoaded) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detections = await faceapi
      .detectSingleFace(source as any, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()

    if (!detections) return null

    const box = detections.detection.box
    const lm = detections.landmarks

    // face-api returns Point objects { x, y } — NOT arrays — so centroid properly
    const centroid = (pts: Array<{ x: number; y: number }>): [number, number] => [
      pts.reduce((s, p) => s + p.x, 0) / pts.length,
      pts.reduce((s, p) => s + p.y, 0) / pts.length,
    ]

    return {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      landmarks: {
        leftEye:  centroid(lm.getLeftEye()),
        rightEye: centroid(lm.getRightEye()),
        nose:     centroid(lm.getNose()),
        mouth:    centroid(lm.getMouth()),
      },
    }
  } catch (e) {
    console.error('[FaceAPI] Error detecting face:', e)
    return null
  }
}

// Default face box when detector is unavailable
// More realistic face position for typical webcam framing
function defaultFace(w: number, h: number): FaceBox {
  return {
    x: w * 0.15,        // 15% from left
    y: h * 0.2,         // 20% from top (lower than before, centered better)
    width: w * 0.7,     // 70% width (wider face)
    height: h * 0.6     // 60% height
  }
}

// ─── AR drawing functions ────────────────────────────────────────────────────
// All functions receive landmarks in plain canvas pixel coordinates (lx < rx).
// face-api detects on the already-mirrored canvas, so "left eye" is screen-left.

function drawDog(ctx: CanvasRenderingContext2D, landmarks: FaceLandmarks | null) {
  if (!landmarks) return

  const [lx, ly] = landmarks.leftEye   // lx < rx — left eye on screen-left
  const [rx, ry] = landmarks.rightEye
  const [nx, ny] = landmarks.nose

  if (!isFinite(lx) || !isFinite(ly) || !isFinite(rx) || !isFinite(ry) || !isFinite(nx) || !isFinite(ny)) return

  const d = Math.sqrt((rx - lx) ** 2 + (ry - ly) ** 2)
  if (!isFinite(d) || d < 5) return

  const earW = d * 0.45
  const earH = d * 0.8
  

  // Left ear: to the LEFT of the left eye
  ctx.fillStyle = '#8B6F47'
  ctx.beginPath()
  ctx.ellipse(lx - d * 0.35, ly - d * 0.45, earW, earH, -0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#C8956C'
  ctx.beginPath()
  ctx.ellipse(lx - d * 0.35, ly - d * 0.45, earW * 0.55, earH * 0.65, -0.35, 0, Math.PI * 2)
  ctx.fill()

  // Right ear: to the RIGHT of the right eye
  ctx.fillStyle = '#8B6F47'
  ctx.beginPath()
  ctx.ellipse(rx + d * 0.35, ry - d * 0.45, earW, earH, 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#C8956C'
  ctx.beginPath()
  ctx.ellipse(rx + d * 0.35, ry - d * 0.45, earW * 0.55, earH * 0.65, 0.35, 0, Math.PI * 2)
  ctx.fill()

  // Nose
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.ellipse(nx, ny, d * 0.2, d * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.ellipse(nx - d * 0.06, ny - d * 0.04, d * 0.06, d * 0.04, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawGlasses(ctx: CanvasRenderingContext2D, landmarks: FaceLandmarks | null) {
  if (!landmarks) return

  const [lx, ly] = landmarks.leftEye   // lx < rx
  const [rx, ry] = landmarks.rightEye

  if (!isFinite(lx) || !isFinite(ly) || !isFinite(rx) || !isFinite(ry)) return

  const d = Math.sqrt((rx - lx) ** 2 + (ry - ly) ** 2)
  if (!isFinite(d) || d < 5) return

  // Oval lenses — slightly smaller than half the eye distance so they don't overlap
  const rX = d * 0.52
  const rY = d * 0.40
  const lw = Math.max(d * 0.07, 3)

  ctx.fillStyle = 'rgba(255, 20, 147, 0.25)'
  ctx.beginPath(); ctx.ellipse(lx, ly, rX, rY, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(rx, ry, rX, rY, 0, 0, Math.PI * 2); ctx.fill()

  ctx.strokeStyle = '#FF1493'
  ctx.lineWidth = lw
  ctx.lineJoin = 'round'
  ctx.beginPath(); ctx.ellipse(lx, ly, rX, rY, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(rx, ry, rX, rY, 0, 0, Math.PI * 2); ctx.stroke()

  // Bridge: right side of left lens → left side of right lens
  const midY = (ly + ry) / 2
  ctx.beginPath()
  ctx.moveTo(lx + rX, midY - rY * 0.1)
  ctx.quadraticCurveTo((lx + rx) / 2, midY - rY * 0.4, rx - rX, midY - rY * 0.1)
  ctx.stroke()

  // Left temple: from outer-left edge going further left
  ctx.beginPath(); ctx.moveTo(lx - rX, ly); ctx.lineTo(lx - rX - d * 0.45, ly - d * 0.05); ctx.stroke()
  // Right temple: from outer-right edge going further right
  ctx.beginPath(); ctx.moveTo(rx + rX, ry); ctx.lineTo(rx + rX + d * 0.45, ry - d * 0.05); ctx.stroke()
}

function drawBunny(ctx: CanvasRenderingContext2D, landmarks: FaceLandmarks | null) {
  if (!landmarks) return

  const [lx, ly] = landmarks.leftEye   // lx < rx
  const [rx, ry] = landmarks.rightEye
  const [nx, ny] = landmarks.nose

  if (!isFinite(lx) || !isFinite(ly) || !isFinite(rx) || !isFinite(ry) || !isFinite(nx) || !isFinite(ny)) return

  const d = Math.sqrt((rx - lx) ** 2 + (ry - ly) ** 2)
  if (!isFinite(d) || d < 5) return

  const centerX = (lx + rx) / 2

  // Ears above the forehead — earH determines how tall; center placed so bottom = top-of-head
  const earW = d * 0.25
  const earH = d * 0.75

  // Ear center Y: place bottom of ear at approximately forehead level (ly - 0.9*d)
  const earCY = ly - 0.9 * d - earH * 0.1   // center slightly above forehead

  // Left ear: to the LEFT of face center
  ctx.fillStyle = '#FFF0F5'
  ctx.beginPath()
  ctx.ellipse(centerX - d * 0.28, earCY, earW, earH, -0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FF9EB5'
  ctx.beginPath()
  ctx.ellipse(centerX - d * 0.28, earCY, earW * 0.45, earH * 0.78, -0.08, 0, Math.PI * 2)
  ctx.fill()

  // Right ear: to the RIGHT of face center
  ctx.fillStyle = '#FFF0F5'
  ctx.beginPath()
  ctx.ellipse(centerX + d * 0.28, earCY, earW, earH, 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FF9EB5'
  ctx.beginPath()
  ctx.ellipse(centerX + d * 0.28, earCY, earW * 0.45, earH * 0.78, 0.08, 0, Math.PI * 2)
  ctx.fill()

  // Nose
  ctx.fillStyle = '#FF69B4'
  ctx.beginPath()
  ctx.ellipse(nx, ny, d * 0.14, d * 0.10, 0, 0, Math.PI * 2)
  ctx.fill()
}

// ─── Convert CSS filter string to canvas filter string ────────────────────
function toCSSFilter(colorFilter: ColorFilter): string {
  const filter = COLOR_FILTERS.find((f) => f.id === colorFilter)
  return filter?.css ?? 'none'
}

// ─── Apply color filters manually via pixel manipulation ───────────────────
function applyColorFilter(ctx: CanvasRenderingContext2D, w: number, h: number, color: ColorFilter): void {
  if (color === 'none') return
  
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  
  if (color === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114
      data[i] = gray
      data[i+1] = gray
      data[i+2] = gray
    }
  } else if (color === 'sepia') {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2]
      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      data[i+1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      data[i+2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
    }
  } else if (color === 'vivid') {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2]
      data[i] = Math.min(255, Math.max(0, (r - 128) * 1.8 + 128))
      data[i+1] = Math.min(255, Math.max(0, (g - 128) * 1.8 + 128))
      data[i+2] = Math.min(255, Math.max(0, (b - 128) * 1.8 + 128))
    }
  } else if (color === 'warm') {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.1)
      data[i+1] = Math.min(255, data[i+1] * 0.95)
      data[i+2] = Math.min(255, data[i+2] * 0.8)
    }
  } else if (color === 'cool') {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 0.8)
      data[i+1] = Math.min(255, data[i+1] * 0.95)
      data[i+2] = Math.min(255, data[i+2] * 1.2)
    }
  }
  
  ctx.putImageData(imageData, 0, 0)
}

// ─── Apply filters to canvas and return Blob ─────────────────────────────────
async function buildFilteredBlob(
  src: HTMLCanvasElement,
  color: ColorFilter,
  ar: ArFilterId | null,
  detectedFace: DetectedFace | null,
): Promise<Blob> {
  const out = document.createElement('canvas')
  out.width = src.width; out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  
  // Apply color filter manually
  applyColorFilter(ctx, out.width, out.height, color)
  
  // Draw AR effects using landmarks
  if (ar && detectedFace) {
    if (ar === 'dog')     drawDog(ctx, detectedFace.landmarks)
    if (ar === 'glasses') drawGlasses(ctx, detectedFace.landmarks)
    if (ar === 'bunny')   drawBunny(ctx, detectedFace.landmarks)
  }
  
  return new Promise((res) => out.toBlob((b) => res(b!), 'image/jpeg', 0.92))
}

// ─── Render live frame with filters to canvas ────────────────────────────────
function renderFrameWithFilters(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  colorFilter: ColorFilter,
  arFilter: ArFilterId | null,
  detectedFace: DetectedFace | null,
  facingMode: 'user' | 'environment' = 'user',
): void {
  if (!video.videoWidth || !video.videoHeight) return
  
  // Initialize canvas dimensions
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  // Step 1: draw the video frame (mirrored for front camera) then restore immediately
  ctx.save()
  if (facingMode === 'user') {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  ctx.filter = toCSSFilter(colorFilter)
  ctx.drawImage(video, 0, 0)
  ctx.filter = 'none'
  ctx.restore()  // ← back to normal (un-mirrored) coordinates before drawing AR

  // Step 2: draw AR on top in plain pixel coordinates
  // face-api detects on the mirrored canvas → lx < rx (left eye is on screen-left)
  if (arFilter && detectedFace) {
    try {
      const { landmarks } = detectedFace
      if (arFilter === 'dog')     drawDog(ctx, landmarks)
      if (arFilter === 'glasses') drawGlasses(ctx, landmarks)
      if (arFilter === 'bunny')   drawBunny(ctx, landmarks)
    } catch (err) {
      console.error('[Render] Error drawing AR filter:', err)
    }
  }
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
  const canvasRef = useRef<HTMLCanvasElement>(null) // Live preview canvas with filters
  const streamRef = useRef<MediaStream | null>(null)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null) // Animation frame ID
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null) // unfiltered photo
  const detectedFaceRef = useRef<DetectedFace | null>(null)  // Change: store full DetectedFace
  const frameCountRef = useRef(0) // Counter for face detection sampling
  const filterRef = useRef<SelectedFilter>({ kind: 'color', id: 'none' }) // Keep in sync with state
  const facingModeRef = useRef<'user' | 'environment'>('user') // Keep in sync with state
  const captureTypeRef = useRef<AttachType>('IMAGE')

  // ── Sync filter state to ref for animation loop ──────────────────────────────
  useEffect(() => {
    filterRef.current = filter
  }, [filter])

  // ── Sync facing mode to ref ──────────────────────────────────────────────────
  useEffect(() => {
    facingModeRef.current = facingMode
  }, [facingMode])

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
    // Load face-api models on component mount
    loadFaceAPIModels().catch((err) => {
      console.error('[CameraCapture] Failed to load face-api models:', err)
    })
    
    startCamera(facingMode)
    console.log('[CameraCapture] Starting animation loop')
    
    // Animation loop for live filtering
    const animate = async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !streamRef.current) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }
      
      // Render current frame with filters (using refs for current state)
      const ar = filterRef.current.kind === 'ar' ? filterRef.current.id : null
      const color = filterRef.current.kind === 'color' ? filterRef.current.id : 'none'
      renderFrameWithFilters(video, canvas, color, ar, detectedFaceRef.current, facingModeRef.current)
      
      // Detect face every 6 frames to avoid blocking the render loop
      if (frameCountRef.current % 6 === 0) {
        detectFace(canvas).then((detectedFace) => {
          if (detectedFace) detectedFaceRef.current = detectedFace
        }).catch(() => {/* silenced */})
      }
      
      frameCountRef.current++
      animFrameRef.current = requestAnimationFrame(animate)
    }
    
    animFrameRef.current = requestAnimationFrame(animate)
    
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
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
    buildFilteredBlob(originalCanvasRef.current, filter.kind === 'color' ? filter.id : 'none', ar, detectedFaceRef.current)
      .then((blob) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(URL.createObjectURL(blob))
      })
      .finally(() => setProcessing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, phase])

  // ── Photo capture ────────────────────────────────────────────────────────────
  const takePhoto = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Create a copy of the canvas with filters applied (for export)
    const photoCanvas = document.createElement('canvas')
    photoCanvas.width = canvas.width
    photoCanvas.height = canvas.height
    const ctx = photoCanvas.getContext('2d')!
    
    // Draw the filtered canvas
    ctx.drawImage(canvas, 0, 0)
    
    originalCanvasRef.current = photoCanvas
    captureTypeRef.current = 'IMAGE'
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    // Reset filter on new capture
    setFilter({ kind: 'color', id: 'none' })
    detectedFaceRef.current = null
    setProcessing(true)
    setPhase('photo-taken')

    // Detect face and build initial preview
    photoCanvas.toBlob(async (blob) => {
      if (!blob) { setProcessing(false); return }
      const img = new Image()
      const tmpUrl = URL.createObjectURL(blob)
      img.onload = async () => {
        URL.revokeObjectURL(tmpUrl)
        detectedFaceRef.current = await detectFace(img)
        const noFilterBlob = await buildFilteredBlob(photoCanvas, 'none', null, detectedFaceRef.current)
        setPreviewUrl(URL.createObjectURL(noFilterBlob))
        setProcessing(false)
      }
      img.src = tmpUrl
    }, 'image/jpeg', 0.97)
  }

  // ── Video recording ──────────────────────────────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current || !canvasRef.current) return
    chunksRef.current = []
    
    // Capture video from canvas (with filters) at 30 fps
    const canvasStream = canvasRef.current.captureStream(30)
    
    // Add audio track from the original stream
    const audioTracks = streamRef.current.getAudioTracks()
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0])
    }
    
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus' : 'video/webm'
    const mr = new MediaRecorder(canvasStream, { mimeType: mime })
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
    detectedFaceRef.current = null
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
        const blob = await buildFilteredBlob(originalCanvasRef.current, colorId, ar, detectedFaceRef.current)
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
          // Live camera feed with filters on canvas
          <>
            <video
              ref={videoRef}
              autoPlay muted playsInline
              style={{
                position: 'absolute', width: 0, height: 0, visibility: 'hidden',
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                display: 'block',
              }}
            />
            {/* Active filter indicator */}
            {((filter.kind === 'ar' && filter.id !== null) || (filter.kind === 'color' && filter.id !== 'none')) && (
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur rounded-full">
                <span className="text-white text-xs font-medium">
                  {filter.kind === 'ar'
                    ? AR_FILTERS.find(f => f.id === filter.id)?.label ?? ''
                    : COLOR_FILTERS.find(f => f.id === filter.id)?.label ?? ''}
                </span>
              </div>
            )}
          </>
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

      {/* ── Filter controls (always visible except during errors) ──────────────── */}
      {!error && (
        <div className="shrink-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-4 pb-2">
          <div className="flex items-center gap-0 px-3 overflow-x-auto">
            {/* AR filters */}
            {AR_FILTERS.map((af) => {
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
            <div className="w-px h-10 bg-white/30 mx-2 shrink-0" />

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
        </div>
      )}

      {/* ── Confirmation: caption + send ──────────────────────────────────────── */}
      {isConfirmation && (
        <div className="shrink-0">
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
