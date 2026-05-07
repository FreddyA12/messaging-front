import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ChatBg   = 'default' | 'warm' | 'slate' | 'mint' | 'forest' | 'dots' | 'lines'
export type Palette  = 'olive' | 'slate' | 'terra' | 'sage' | 'charcoal'
export type FontSize = 'small' | 'normal' | 'large'

interface AppearanceState {
  theme:          ThemeMode
  chatBackground: ChatBg
  palette:        Palette
  fontSize:       FontSize
  localStatus:    string   // estado guardado localmente hasta que haya backend

  setTheme:          (t: ThemeMode) => void
  setChatBackground: (b: ChatBg)   => void
  setPalette:        (p: Palette)  => void
  setFontSize:       (f: FontSize) => void
  setLocalStatus:    (s: string)   => void
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      theme:          'light',
      chatBackground: 'default',
      palette:        'olive',
      fontSize:       'normal',
      localStatus:    '',

      setTheme:          (theme)          => set({ theme }),
      setChatBackground: (chatBackground) => set({ chatBackground }),
      setPalette:        (palette)        => set({ palette }),
      setFontSize:       (fontSize)       => set({ fontSize }),
      setLocalStatus:    (localStatus)    => set({ localStatus }),
    }),
    { name: 'whispr-appearance' },
  ),
)

/* ── Palettes ──────────────────────────────────────── */
export const PALETTES: Record<Palette, { label: string; primary: string; dark: string; light: string; swatch: string }> = {
  olive:    { label: 'Olivo',      primary: '#7a9048', dark: '#637839', light: '#eef1e5', swatch: '#7a9048' },
  slate:    { label: 'Pizarra',    primary: '#5b7fa6', dark: '#4a6a8e', light: '#e8eef5', swatch: '#5b7fa6' },
  terra:    { label: 'Terracota',  primary: '#a0624a', dark: '#8a5238', light: '#f5ece8', swatch: '#a0624a' },
  sage:     { label: 'Salvia',     primary: '#5a8a6e', dark: '#477258', light: '#e8f2ec', swatch: '#5a8a6e' },
  charcoal: { label: 'Carbón',     primary: '#5c636e', dark: '#464c55', light: '#ebebed', swatch: '#5c636e' },
}

/* ── Chat backgrounds ──────────────────────────────── */
export const CHAT_BACKGROUNDS: Record<ChatBg, { label: string; style: string; preview: string }> = {
  default: {
    label:   'Olivo suave',
    style:   'linear-gradient(180deg, #f5f6f0 0%, #f0f3e6 100%)',
    preview: 'linear-gradient(135deg, #f5f6f0, #f0f3e6)',
  },
  warm: {
    label:   'Arena cálida',
    style:   'linear-gradient(180deg, #faf5ef 0%, #f5ede3 100%)',
    preview: 'linear-gradient(135deg, #faf5ef, #f0e4d4)',
  },
  slate: {
    label:   'Niebla azul',
    style:   'linear-gradient(180deg, #f0f2f7 0%, #e8ecf4 100%)',
    preview: 'linear-gradient(135deg, #f0f2f7, #dde4f0)',
  },
  mint: {
    label:   'Menta fresca',
    style:   'linear-gradient(180deg, #f0f7f3 0%, #e4f0e9 100%)',
    preview: 'linear-gradient(135deg, #f0f7f3, #d8eee0)',
  },
  forest: {
    label:   'Bosque',
    style:   'linear-gradient(180deg, #1a2218 0%, #1e2a1c 100%)',
    preview: 'linear-gradient(135deg, #1a2218, #1e2a1c)',
  },
  dots: {
    label:   'Puntos',
    style:   "radial-gradient(circle, rgba(122,144,72,0.08) 1px, transparent 1px) center / 22px 22px, linear-gradient(180deg, #f5f6f0, #f0f3e6)",
    preview: "radial-gradient(circle, rgba(122,144,72,0.2) 1.5px, transparent 1.5px) center / 10px 10px, #f5f6f0",
  },
  lines: {
    label:   'Líneas',
    style:   "repeating-linear-gradient(0deg, rgba(122,144,72,0.07) 0px, rgba(122,144,72,0.07) 1px, transparent 1px, transparent 28px), linear-gradient(180deg, #f5f6f0, #eef1e5)",
    preview: "repeating-linear-gradient(0deg, rgba(122,144,72,0.2) 0px, rgba(122,144,72,0.2) 1px, transparent 1px, transparent 8px), #f5f6f0",
  },
}
