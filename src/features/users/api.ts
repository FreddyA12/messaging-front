import { api } from '../../lib/axios'
import type { AuthUser } from '../../types/auth'

export const userApi = {
  searchUsers: (q: string) =>
    api.get<AuthUser[]>('/api/users/search', { params: { q } }).then((r) => r.data),
}
