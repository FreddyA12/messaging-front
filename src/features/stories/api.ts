import { api } from '../../lib/axios'
import type { StoryDTO, StoryUserGroupDTO } from '../../types/story'

export const storiesApi = {
  getFeed: () =>
    api.get<StoryUserGroupDTO[]>('/api/stories/feed').then((r) => r.data),

  getMyStories: () =>
    api.get<StoryDTO[]>('/api/stories/my').then((r) => r.data),

  createStory: (form: FormData) =>
    api.post<StoryDTO>('/api/stories', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  deleteStory: (id: number) =>
    api.delete(`/api/stories/${id}`),

  viewStory: (id: number) =>
    api.post(`/api/stories/${id}/view`),

  mediaUrl: (id: number) => `/api/stories/${id}/media`,

  thumbnailUrl: (id: number) => `/api/stories/${id}/thumbnail`,

  getPrivacy: () =>
    api.get<number[]>('/api/stories/privacy').then((r) => r.data),

  updatePrivacy: (hiddenFromUserIds: number[]) =>
    api.put('/api/stories/privacy', { hiddenFromUserIds }),
}
