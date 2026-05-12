import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoryDTO, StoryUserGroupDTO } from '../../../types/story'
import { storiesApi } from '../api'
import { useStoryStore } from '../../../store/storyStore'
import { api } from '../../../lib/axios'
import { UserAvatar } from '../../../components/UserAvatar'

const STORY_DURATION_MS = 5000 // 5 s per story

interface Props {
  groups: StoryUserGroupDTO[]
  initialGroupIndex: number
  onClose: () => void
}

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expirada'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StoryMedia({ story }: { story: StoryDTO }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const isVideo = story.mimeType?.startsWith('video/')

  useEffect(() => {
    if (!story.hasMedia) return
    let url: string
    api.get<Blob>(storiesApi.mediaUrl(story.id), { responseType: 'blob' })
      .then((r) => {
        url = URL.createObjectURL(r.data)
        setBlobUrl(url)
      })
      .catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [story.id, story.hasMedia])

  if (story.hasMedia) {
    if (!blobUrl) {
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )
    }
    return isVideo
      ? <video src={blobUrl} autoPlay muted loop className="absolute inset-0 w-full h-full object-cover" />
      : <img src={blobUrl} alt="story" className="absolute inset-0 w-full h-full object-cover" />
  }

  // Text story
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-8"
      style={{ background: story.backgroundColor ?? '#1a73e8' }}
    >
      <p className="text-white text-2xl font-semibold text-center leading-relaxed break-words">
        {story.textContent}
      </p>
    </div>
  )
}

export function StoryViewer({ groups, initialGroupIndex, onClose }: Props) {
  const markViewed = useStoryStore((s) => s.markViewed)
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number>(0)

  const group = groups[groupIdx]
  const story = group?.stories[storyIdx]

  const goNext = useCallback(() => {
    if (!group) return
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1)
      setProgress(0)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1)
      setStoryIdx(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1)
      setProgress(0)
    } else if (groupIdx > 0) {
      setGroupIdx((i) => i - 1)
      setStoryIdx(0)
      setProgress(0)
    }
  }, [storyIdx, groupIdx])

  // Auto-advance timer
  useEffect(() => {
    if (!story) return
    startRef.current = Date.now()
    setProgress(0)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(timerRef.current!)
        goNext()
      }
    }, 50)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [story?.id, goNext])

  // Mark viewed
  useEffect(() => {
    if (!story || story.viewedByMe) return
    storiesApi.viewStory(story.id).catch(() => {})
    markViewed(story.id)
  }, [story?.id])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, onClose])

  if (!group || !story) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Story container */}
      <div className="relative w-full h-full max-w-sm mx-auto" style={{ maxHeight: '100vh' }}>

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-2">
            <UserAvatar userId={group.userId} name={group.userName} size={32} />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{group.userName}</p>
              <p className="text-white/70 text-xs">{formatTimeLeft(story.expiresAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Story content */}
        <div className="relative w-full h-full bg-gray-900">
          <StoryMedia story={story} />
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 z-10 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={goPrev} />
          <div className="flex-1 h-full" />
          <div className="w-1/3 h-full cursor-pointer" onClick={goNext} />
        </div>

        {/* View count (bottom) */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center">
          <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-white/70 text-xs">{story.viewCount}</span>
          </div>
        </div>

        {/* Navigation arrows for groups */}
        {groupIdx > 0 && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white/60 hover:text-white transition-colors"
            onClick={() => { setGroupIdx((i) => i - 1); setStoryIdx(0); setProgress(0) }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {groupIdx < groups.length - 1 && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white/60 hover:text-white transition-colors"
            onClick={() => { setGroupIdx((i) => i + 1); setStoryIdx(0); setProgress(0) }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
