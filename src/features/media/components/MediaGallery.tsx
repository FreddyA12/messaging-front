import { useEffect, useState } from 'react'
import type { GalleryItemDTO, LinkItemDTO } from '../../../types/chat'
import { mediaApi } from '../api'
import { MediaTab } from './MediaTab'
import { DocumentsTab } from './DocumentsTab'
import { LinksTab } from './LinksTab'
import { AudiosTab } from './AudiosTab'

type Tab = 'MEDIA' | 'DOCS' | 'LINKS' | 'AUDIO'

interface MediaGalleryProps {
  chatId: number
  onClose: () => void
  onScrollTo: (messageId: number) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'MEDIA', label: 'Medios' },
  { id: 'DOCS', label: 'Docs' },
  { id: 'LINKS', label: 'Links' },
  { id: 'AUDIO', label: 'Audio' },
]

export function MediaGallery({ chatId, onClose, onScrollTo }: MediaGalleryProps) {
  const [activeTab, setActiveTab] = useState<Tab>('MEDIA')
  const [mediaItems, setMediaItems] = useState<GalleryItemDTO[]>([])
  const [docItems, setDocItems] = useState<GalleryItemDTO[]>([])
  const [linkItems, setLinkItems] = useState<LinkItemDTO[]>([])
  const [audioItems, setAudioItems] = useState<GalleryItemDTO[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const load = async () => {
      try {
        if (activeTab === 'MEDIA') {
          const [imgs, vids] = await Promise.all([
            mediaApi.getGallery(chatId, 'IMAGE'),
            mediaApi.getGallery(chatId, 'VIDEO'),
          ])
          setMediaItems([...imgs, ...vids].sort((a, b) => b.sentAt.localeCompare(a.sentAt)))
        } else if (activeTab === 'DOCS') {
          setDocItems(await mediaApi.getDocuments(chatId))
        } else if (activeTab === 'LINKS') {
          setLinkItems(await mediaApi.getLinks(chatId))
        } else if (activeTab === 'AUDIO') {
          setAudioItems(await mediaApi.getAudios(chatId))
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [chatId, activeTab])

  return (
    <div className="flex flex-col h-full w-full md:w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <h2 className="flex-1 font-semibold text-sm text-gray-900 dark:text-gray-100">Galería</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                     rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'MEDIA' && (
          <MediaTab items={mediaItems} loading={loading} onScrollTo={onScrollTo} />
        )}
        {activeTab === 'DOCS' && (
          <DocumentsTab items={docItems} loading={loading} onScrollTo={onScrollTo} />
        )}
        {activeTab === 'LINKS' && (
          <LinksTab items={linkItems} loading={loading} onScrollTo={onScrollTo} />
        )}
        {activeTab === 'AUDIO' && (
          <AudiosTab items={audioItems} loading={loading} onScrollTo={onScrollTo} />
        )}
      </div>
    </div>
  )
}
