import { useEffect } from 'react'
import { useAppearanceStore, PALETTES } from '../store/appearanceStore'

/**
 * Aplica el tema (dark/light/system), la paleta de color activa y el tamaño
 * de fuente como clases/variables CSS en :root.
 */
export function useTheme() {
  const theme    = useAppearanceStore((s) => s.theme)
  const palette  = useAppearanceStore((s) => s.palette)
  const fontSize = useAppearanceStore((s) => s.fontSize)

  // Apply dark class
  useEffect(() => {
    const html = document.documentElement
    const applyDark = (dark: boolean) => {
      html.classList.toggle('dark', dark)
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyDark(mq.matches)
      const handler = (e: MediaQueryListEvent) => applyDark(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyDark(theme === 'dark')
    }
  }, [theme])

  // Apply palette — only affects chat bubble colors, not global chrome
  useEffect(() => {
    const p = PALETTES[palette]
    const root = document.documentElement
    root.style.setProperty('--bubble-outgoing-lm', p.light)
    root.style.setProperty('--bubble-outgoing-dm', p.darkBubble)
  }, [palette])

  // Apply font size class
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-small', 'font-large')
    if (fontSize === 'small') root.classList.add('font-small')
    if (fontSize === 'large') root.classList.add('font-large')
  }, [fontSize])
}
