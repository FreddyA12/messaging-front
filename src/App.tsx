import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AppRoutes } from './routes/AppRoutes'
import { useAppearanceStore, PALETTES } from './store/appearanceStore'

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme    = useAppearanceStore((s) => s.theme)
  const palette  = useAppearanceStore((s) => s.palette)
  const fontSize = useAppearanceStore((s) => s.fontSize)

  useEffect(() => {
    const root = document.documentElement
    const apply = (dark: boolean) => root.classList.toggle('dark', dark)
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches)
      const handler = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    apply(theme === 'dark')
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const p = PALETTES[palette]
    root.style.setProperty('--color-primary',       p.primary)
    root.style.setProperty('--color-primary-dark',  p.dark)
    root.style.setProperty('--color-primary-light', p.light)
    root.style.setProperty('--bubble-outgoing',     p.light)
  }, [palette])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-small', 'font-large')
    if (fontSize === 'small') root.classList.add('font-small')
    if (fontSize === 'large') root.classList.add('font-large')
  }, [fontSize])

  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
