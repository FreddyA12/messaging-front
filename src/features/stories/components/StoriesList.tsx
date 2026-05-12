import { useEffect, useState } from 'react'
import { useStoryStore } from '../../../store/storyStore'
import { useAuthStore } from '../../../store/authStore'
import { storiesApi } from '../api'
import { CreateStoryDialog } from './CreateStoryDialog'
import { StoryPrivacyDialog } from './StoryPrivacyDialog'
import type { StoryUserGroupDTO } from '../../../types/story'
import { UserAvatar } from '../../../components/UserAvatar'

interface Props {
  onSelectGroup: (groups: StoryUserGroupDTO[], groupIdx: number) => void
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'Ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

const itemBtn: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 16px', border: 'none', background: 'none',
  cursor: 'pointer', textAlign: 'left',
  fontFamily: "'Poppins',system-ui,sans-serif",
}

export function StoriesList({ onSelectGroup }: Props) {
  const currentUser = useAuthStore((s) => s.user)
  const feedGroups = useStoryStore((s) => s.feedGroups)
  const myStories = useStoryStore((s) => s.myStories)
  const setFeedGroups = useStoryStore((s) => s.setFeedGroups)
  const setMyStories = useStoryStore((s) => s.setMyStories)

  const [showCreate, setShowCreate] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    Promise.all([storiesApi.getFeed(), storiesApi.getMyStories()])
      .then(([feed, mine]) => { setFeedGroups(feed); setMyStories(mine) })
      .catch(() => {})
  }, [])

  const openMine = () => {
    if (myStories.length === 0) { setShowCreate(true); return }
    const myGroup: StoryUserGroupDTO = {
      userId: currentUser?.id ?? 0,
      userName: currentUser?.name ?? 'Yo',
      hasUnviewed: false,
      stories: myStories,
    }
    onSelectGroup([myGroup], 0)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

        {/* ── Mi historia ── */}
        <div style={{ padding: '12px 0 4px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7a9048', textTransform: 'uppercase', letterSpacing: '.09em', padding: '0 16px 6px', margin: 0 }}>
            Mi historia
          </p>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={openMine}
              style={itemBtn}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122,144,72,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', padding: 2,
                  background: myStories.length > 0
                    ? 'linear-gradient(135deg,#7a9048,#91a662)'
                    : 'rgba(122,144,72,0.2)',
                }}>
                  <UserAvatar userId={currentUser?.id} name={currentUser?.name ?? 'U'} size={48} />
                </div>
                {myStories.length === 0 && (
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#7a9048', border: '2px solid #fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#242d16', margin: 0 }}>Mi historia</p>
                <p style={{ fontSize: 12, color: '#8a9a7a', margin: '2px 0 0' }}>
                  {myStories.length === 0
                    ? 'Toca para añadir'
                    : `${myStories.length} historia${myStories.length > 1 ? 's' : ''} · ${timeAgo(myStories[0].createdAt)}`
                  }
                </p>
              </div>
            </button>

            {/* Privacy settings */}
            <button
              onClick={() => setShowPrivacy(true)}
              title="Privacidad"
              style={{
                flexShrink: 0, marginRight: 10, background: 'none', border: 'none',
                cursor: 'pointer', color: '#9aaa82', padding: 6, borderRadius: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#7a9048' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9aaa82' }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(122,144,72,0.1)', margin: '4px 0' }} />

        {/* ── Recientes ── */}
        {feedGroups.length > 0 && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#7a9048', textTransform: 'uppercase', letterSpacing: '.09em', padding: '0 16px 6px', margin: 0 }}>
              Recientes
            </p>
            {feedGroups.map((group, idx) => (
              <button
                key={group.userId}
                onClick={() => onSelectGroup(feedGroups, idx)}
                style={itemBtn}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(122,144,72,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', padding: 2, flexShrink: 0,
                  background: group.hasUnviewed
                    ? 'linear-gradient(135deg,#7a9048,#91a662)'
                    : 'rgba(180,180,180,0.35)',
                }}>
                  <UserAvatar userId={group.userId} name={group.userName} size={48} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: group.hasUnviewed ? 600 : 400, color: '#242d16', margin: 0 }}>
                    {group.userName}
                  </p>
                  <p style={{ fontSize: 12, color: group.hasUnviewed ? '#5a6a4a' : '#9aaa82', margin: '2px 0 0' }}>
                    {timeAgo(group.stories[0].createdAt)} · {group.stories.length} historia{group.stories.length > 1 ? 's' : ''}
                  </p>
                </div>

                {group.hasUnviewed && (
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#7a9048', flexShrink: 0 }} />
                )}
              </button>
            ))}
          </div>
        )}

        {feedGroups.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9aaa82', fontSize: 13, padding: '32px 16px' }}>
            Ningún contacto ha publicado historias
          </p>
        )}
      </div>

      {showCreate && <CreateStoryDialog onClose={() => setShowCreate(false)} />}
      {showPrivacy && <StoryPrivacyDialog onClose={() => setShowPrivacy(false)} />}
    </>
  )
}
