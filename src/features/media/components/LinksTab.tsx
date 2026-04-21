import type { LinkItemDTO } from '../../../types/chat'

interface LinksTabProps {
  items: LinkItemDTO[]
  loading: boolean
  onScrollTo: (messageId: number) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function LinksTab({ items, loading, onScrollTo }: LinksTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-center text-xs text-gray-400 py-8">Sin links compartidos.</p>
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((item, i) => {
        const hostname = (() => {
          try { return new URL(item.url).hostname } catch { return item.url }
        })()

        return (
          <li key={i}
            className="group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={() => onScrollTo(item.messageId)}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-12 h-10 rounded object-cover shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="w-12 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 truncate">{hostname}</p>
              {item.title && (
                <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mt-0.5">{item.title}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">{formatDate(item.sentAt)}</p>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-500
                         rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shrink-0"
              title="Abrir enlace"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
