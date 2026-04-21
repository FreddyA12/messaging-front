import { useEffect, useState } from 'react'
import { api } from '../lib/axios'

const cache = new Map<number, string>()

export function useAttachmentBlob(id: number | undefined, thumbnail = false): {
  url: string | null
  loading: boolean
} {
  const [url, setUrl] = useState<string | null>(() => (id != null ? (cache.get(thumbnail ? -id : id) ?? null) : null))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id == null) return
    const cacheKey = thumbnail ? -id : id
    if (cache.has(cacheKey)) {
      setUrl(cache.get(cacheKey)!)
      return
    }

    let objectUrl: string | null = null
    setLoading(true)

    const endpoint = thumbnail
      ? `/api/media/attachments/${id}/thumbnail`
      : `/api/media/attachments/${id}`

    api.get(endpoint, { responseType: 'blob' })
      .then((r) => {
        objectUrl = URL.createObjectURL(r.data)
        cache.set(cacheKey, objectUrl)
        setUrl(objectUrl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => {
      // object URLs are cached globally — do not revoke here
    }
  }, [id, thumbnail])

  return { url, loading }
}
