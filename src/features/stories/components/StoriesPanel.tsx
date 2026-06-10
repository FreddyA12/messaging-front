import { useCallback, useEffect, useRef, useState } from 'react'
import type { StoryDTO, StoryUserGroupDTO } from '../../../types/story'
import { storiesApi } from '../api'
import { useStoryStore } from '../../../store/storyStore'
import { api } from '../../../lib/axios'
import { UserAvatar } from '../../../components/UserAvatar'
import { decryptUserField } from '../../../lib/userEncryption'

const STORY_DURATION_MS = 5000

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
    let url = ''
    api.get<Blob>(storiesApi.mediaUrl(story.id), { responseType: 'blob' })
      .then((r) => { url = URL.createObjectURL(r.data); setBlobUrl(url) })
      .catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [story.id, story.hasMedia])

  if (story.hasMedia) {
    if (!blobUrl) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )
    }
    return isVideo
      ? <video src={blobUrl} autoPlay muted loop style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      : <img src={blobUrl} alt="historia" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px',
      background: story.backgroundColor ?? '#1a73e8',
    }}>
      <p style={{ color: '#fff', fontSize: 22, fontWeight: 600, textAlign: 'center', lineHeight: 1.5, wordBreak: 'break-word' }}>
        {story.textContent ? decryptUserField(story.textContent, story.userId) : ''}
      </p>
    </div>
  )
}

export function StoriesPanel({ groups, initialGroupIndex, onClose }: Props) {
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
      setStoryIdx((i) => i + 1); setProgress(0)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1); setStoryIdx(0); setProgress(0)
    } else {
      onClose()
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx((i) => i - 1); setProgress(0) }
    else if (groupIdx > 0) { setGroupIdx((i) => i - 1); setStoryIdx(0); setProgress(0) }
  }, [storyIdx, groupIdx])

  // Auto-advance timer
  useEffect(() => {
    if (!story) return
    startRef.current = Date.now()
    setProgress(0)
    timerRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - startRef.current) / STORY_DURATION_MS) * 100, 100)
      setProgress(pct)
      if (pct >= 100) { clearInterval(timerRef.current!); goNext() }
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [story?.id, goNext])

  // Mark viewed
  useEffect(() => {
    if (!story || story.viewedByMe) return
    storiesApi.viewStory(story.id).catch(() => {})
    markViewed(story.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id])

  // Keyboard navigation
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [goNext, goPrev, onClose])

  if (!group || !story) return null

  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#111', overflow: 'hidden', position: 'relative',
      fontFamily: "'Poppins',system-ui,sans-serif",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Story card — 9:16 ratio centered */}
      <div style={{
        position: 'relative',
        height: '100%',
        aspectRatio: '9/16',
        maxWidth: '100%',
        background: '#000',
        overflow: 'hidden',
      }}>
        {/* ── Progress bars ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          display: 'flex', gap: 4, padding: '12px 12px 0',
        }}>
          {group.stories.map((s, i) => (
            <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: '#fff',
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                transition: i === storyIdx ? 'none' : undefined,
              }} />
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div style={{
          position: 'absolute', top: 20, left: 0, right: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserAvatar userId={group.userId} name={group.userName} size={34} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>
                {group.userName}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                {formatTimeLeft(story.expiresAt)}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: 4 }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Story content ── */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <StoryMedia story={story} />
        </div>

        {/* ── Tap zones ── */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex' }}>
          <div style={{ width: '33%', height: '100%', cursor: 'pointer' }} onClick={goPrev} />
          <div style={{ flex: 1 }} />
          <div style={{ width: '33%', height: '100%', cursor: 'pointer' }} onClick={goNext} />
        </div>

        {/* ── View count ── */}
        <div style={{
          position: 'absolute', bottom: 20, left: 0, right: 0, zIndex: 20,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: '5px 12px',
          }}>
            <svg width="13" height="13" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{story.viewCount}</span>
          </div>
        </div>
      </div>

      {/* ── Group navigation arrows (outside the card) ── */}
      {groupIdx > 0 && (
        <button
          onClick={() => { setGroupIdx((i) => i - 1); setStoryIdx(0); setProgress(0) }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
            width: 40, height: 40, cursor: 'pointer', color: '#fff', zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={() => { setGroupIdx((i) => i + 1); setStoryIdx(0); setProgress(0) }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
            width: 40, height: 40, cursor: 'pointer', color: '#fff', zIndex: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
