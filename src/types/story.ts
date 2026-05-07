export interface StoryDTO {
  id: number
  userId: number
  userName: string
  hasMedia: boolean
  mimeType: string | null
  hasThumbnail: boolean
  textContent: string | null
  backgroundColor: string | null
  createdAt: string
  expiresAt: string
  viewedByMe: boolean
  viewCount: number
}

export interface StoryUserGroupDTO {
  userId: number
  userName: string
  hasUnviewed: boolean
  stories: StoryDTO[]
}
