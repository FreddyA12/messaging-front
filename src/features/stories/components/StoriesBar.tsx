import { useEffect, useState } from 'react'
import { useStoryStore } from '../../../store/storyStore'
import { useAuthStore } from '../../../store/authStore'
import { storiesApi } from '../api'
import { StoryViewer } from './StoryViewer'
import { CreateStoryDialog } from './CreateStoryDialog'
import { StoryPrivacyDialog } from './StoryPrivacyDialog'
import type { StoryUserGroupDTO } from '../../../types/story'

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-red-500', 'bg-amber-500',
]
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

export function StoriesBar() {
  const currentUser = useAuthStore((s) => s.user)
  const feedGroups = useStoryStore((s) => s.feedGroups)
  const myStories = useStoryStore((s) => s.myStories)
  const setFeedGroups = useStoryStore((s) => s.setFeedGroups)
  const setMyStories = useStoryStore((s) => s.setMyStories)

  const [viewerGroups, setViewerGroups] = useState<StoryUserGroupDTO[] | null>(null)
  const [viewerInitialIdx, setViewerInitialIdx] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  useEffect(() => {
    Promise.all([storiesApi.getFeed(), storiesApi.getMyStories()])
      .then(([feed, mine]) => {
        setFeedGroups(feed)
        setMyStories(mine)
      })
      .catch(() => {})
  }, [])

  const openFeedStory = (idx: number) => {
    setViewerGroups(feedGroups)
    setViewerInitialIdx(idx)
  }

  const openMyStory = () => {
    if (myStories.length === 0) {
      setShowCreate(true)
      return
    }
    const myGroup: StoryUserGroupDTO = {
      userId: currentUser?.id ?? 0,
      userName: currentUser?.name ?? 'Yo',
      hasUnviewed: false,
      stories: myStories,
    }
    setViewerGroups([myGroup])
    setViewerInitialIdx(0)
  }

  const hasMyStories = myStories.length > 0

  return (
    <>
      <div
        className="flex items-center gap-3 px-3 py-3 overflow-x-auto scrollbar-thin border-b"
        style={{ borderColor: 'rgba(122,144,72,0.12)', minHeight: '84px' }}
      >
        {/* My story + privacy settings */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={openMyStory}
              title={hasMyStories ? 'Mi historia' : 'Añadir historia'}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  padding: '2px',
                  background: hasMyStories
                    ? 'linear-gradient(135deg, #7a9048, #91a662)'
                    : 'rgba(122,144,72,0.15)',
                }}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative overflow-hidden">
                  <span className="text-base font-semibold text-gray-600 dark:text-gray-300">
                    {currentUser?.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                  {!hasMyStories && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Privacy settings cog */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowPrivacy(true) }}
              title="Privacidad de historia"
              style={{
                position: 'absolute', bottom: -2, right: -4,
                width: 16, height: 16, borderRadius: '50%',
                background: '#6b7280', border: '1.5px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0,
              }}
            >
              <svg width="9" height="9" fill="white" viewBox="0 0 24 24">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113zM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>

          <span className="text-[10px] text-gray-500 dark:text-gray-400 w-12 text-center truncate leading-tight">
            {hasMyStories ? 'Mi historia' : 'Añadir'}
          </span>
        </div>

        {/* Feed groups */}
        {feedGroups.map((group, idx) => (
          <button
            key={group.userId}
            onClick={() => openFeedStory(idx)}
            className="flex flex-col items-center gap-1 shrink-0 group"
            title={group.userName}
          >
            <div
              className="w-12 h-12 rounded-full relative"
              style={{
                padding: '2px',
                background: group.hasUnviewed
                  ? 'linear-gradient(135deg, #7a9048, #91a662)'
                  : 'rgba(200,200,200,0.5)',
              }}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm
                              ${avatarColor(group.userName)}`}>
                {group.userName[0].toUpperCase()}
              </div>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 w-12 text-center truncate leading-tight">
              {group.userName.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {viewerGroups && (
        <StoryViewer
          groups={viewerGroups}
          initialGroupIndex={viewerInitialIdx}
          onClose={() => setViewerGroups(null)}
        />
      )}

      {showCreate && (
        <CreateStoryDialog onClose={() => setShowCreate(false)} />
      )}

      {showPrivacy && (
        <StoryPrivacyDialog onClose={() => setShowPrivacy(false)} />
      )}
    </>
  )
}
