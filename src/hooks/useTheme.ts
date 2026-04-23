import { useEffect } from 'react'
import { useAppearanceStore, PALETTES } from '../store/appearanceStore'

/**
 * Aplica el tema (dark/light/system) y la paleta de color activa como
 * variables CSS en :root. Debe llamarse una sola vez, en la raíz de la app.
 */
export function useTheme() {
  const theme   = useAppearanceStore((s) => s.theme)
  const palette = useAppearanceStore((s) => s.palette)

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

  // Apply palette as CSS custom properties
  useEffect(() => {
    const p = PALETTES[palette]
    const root = document.documentElement
    root.style.setProperty('--color-primary',       p.primary)
    root.style.setProperty('--color-primary-dark',  p.dark)
    root.style.setProperty('--color-primary-light', p.light)
    root.style.setProperty('--color-primary-swatch', p.swatch)
  }, [palette])
}
