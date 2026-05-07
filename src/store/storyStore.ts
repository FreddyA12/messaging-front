import { create } from 'zustand'
import type { StoryDTO, StoryUserGroupDTO } from '../types/story'

interface StoryState {
  feedGroups: StoryUserGroupDTO[]
  myStories: StoryDTO[]

  setFeedGroups: (groups: StoryUserGroupDTO[]) => void
  setMyStories: (stories: StoryDTO[]) => void
  addMyStory: (story: StoryDTO) => void
  removeMyStory: (storyId: number) => void
  markViewed: (storyId: number) => void
}

export const useStoryStore = create<StoryState>((set) => ({
  feedGroups: [],
  myStories: [],

  setFeedGroups: (groups) => set({ feedGroups: groups }),

  setMyStories: (stories) => set({ myStories: stories }),

  addMyStory: (story) =>
    set((s) => ({ myStories: [...s.myStories, story] })),

  removeMyStory: (storyId) =>
    set((s) => ({ myStories: s.myStories.filter((st) => st.id !== storyId) })),

  markViewed: (storyId) =>
    set((s) => ({
      feedGroups: s.feedGroups.map((g) => {
        const updatedStories = g.stories.map((st) =>
          st.id === storyId ? { ...st, viewedByMe: true } : st,
        )
        const hasUnviewed = updatedStories.some((st) => !st.viewedByMe)
        return { ...g, stories: updatedStories, hasUnviewed }
      }),
    })),
}))
