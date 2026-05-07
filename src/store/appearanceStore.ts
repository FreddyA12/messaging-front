import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ChatBg   =
  | 'default' | 'warm' | 'slate' | 'mint' | 'forest' | 'midnight' | 'charcoal'
  | 'dots' | 'bubbles' | 'grid' | 'lines' | 'confetti'
  | 'hexagons' | 'diamonds' | 'waves' | 'crosses' | 'circles'
export type Palette  = 'olive' | 'slate' | 'terra' | 'sage' | 'charcoal' | 'ocean' | 'rose' | 'violet' | 'amber' | 'indigo'
export type FontSize = 'small' | 'normal' | 'large'

interface AppearanceState {
  theme:          ThemeMode
  chatBackground: ChatBg
  palette:        Palette
  fontSize:       FontSize
  localStatus:    string

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
      chatBackground: 'dots',
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

/* ── Palettes ──────────────────────────────────────────── */
export const PALETTES: Record<Palette, { label: string; primary: string; dark: string; light: string; swatch: string; darkBubble: string }> = {
  olive:    { label: 'Olivo',      primary: '#7a9048', dark: '#637839', light: '#dde8c8', darkBubble: '#3a5020', swatch: '#7a9048' },
  slate:    { label: 'Pizarra',    primary: '#5b7fa6', dark: '#4a6a8e', light: '#d8e6f4', darkBubble: '#1e3a56', swatch: '#5b7fa6' },
  terra:    { label: 'Terracota',  primary: '#a0624a', dark: '#8a5238', light: '#f0d8d0', darkBubble: '#4a2518', swatch: '#a0624a' },
  sage:     { label: 'Salvia',     primary: '#5a8a6e', dark: '#477258', light: '#cce8da', darkBubble: '#1e4232', swatch: '#5a8a6e' },
  charcoal: { label: 'Carbón',     primary: '#5c636e', dark: '#464c55', light: '#d8dadc', darkBubble: '#2e3238', swatch: '#5c636e' },
  ocean:    { label: 'Océano',     primary: '#2980b9', dark: '#1f6a99', light: '#cde5f8', darkBubble: '#12354e', swatch: '#2980b9' },
  rose:     { label: 'Rosa',       primary: '#c0687a', dark: '#a55567', light: '#f5d2d8', darkBubble: '#50202c', swatch: '#c0687a' },
  violet:   { label: 'Violeta',    primary: '#7d5ba6', dark: '#664a8c', light: '#e2d4f8', darkBubble: '#32204a', swatch: '#7d5ba6' },
  amber:    { label: 'Ámbar',      primary: '#c5822a', dark: '#a86b20', light: '#f8e4c4', darkBubble: '#4e3010', swatch: '#c5822a' },
  indigo:   { label: 'Índigo',     primary: '#3d5a99', dark: '#2f4780', light: '#ccd5ee', darkBubble: '#182240', swatch: '#3d5a99' },
}

type BgEntry = { label: string; style: string; preview: string; dark?: boolean; pattern?: boolean }

/* ── Chat backgrounds ──────────────────────────────────── */
export const CHAT_BACKGROUNDS: Record<ChatBg, BgEntry> = {
  /* plain — not shown in pattern grid */
  default: {
    label:   'Clásico',
    style:   'linear-gradient(160deg, #f5f6f0 0%, #eff2e5 100%)',
    preview: 'linear-gradient(135deg, #f5f6f0, #eff2e5)',
  },
  warm: {
    label:   'Arena',
    style:   'linear-gradient(160deg, #faf5ef 0%, #f5ede3 100%)',
    preview: 'linear-gradient(135deg, #faf5ef, #f5ede3)',
  },
  slate: {
    label:   'Niebla',
    style:   'linear-gradient(160deg, #f0f2f7 0%, #e8ecf4 100%)',
    preview: 'linear-gradient(135deg, #f0f2f7, #e8ecf4)',
  },
  mint: {
    label:   'Menta',
    style:   'linear-gradient(160deg, #f0f7f3 0%, #e4f0e9 100%)',
    preview: 'linear-gradient(135deg, #f0f7f3, #e4f0e9)',
  },
  forest: {
    label:   'Bosque',
    style:   'linear-gradient(160deg, #0f1a12 0%, #192816 100%)',
    preview: 'linear-gradient(135deg, #0f1a12, #192816)',
    dark:    true,
  },
  midnight: {
    label:   'Medianoche',
    style:   'linear-gradient(160deg, #0a0f1a 0%, #121e32 100%)',
    preview: 'linear-gradient(135deg, #0a0f1a, #121e32)',
    dark:    true,
  },
  charcoal: {
    label:   'Antracita',
    style:   'linear-gradient(160deg, #1c1c1e 0%, #2a2a2c 100%)',
    preview: 'linear-gradient(135deg, #1c1c1e, #2a2a2c)',
    dark:    true,
  },
  /* patterns */
  dots: {
    label:   'Puntos',
    style:   'radial-gradient(circle, rgba(122,144,72,0.22) 1.5px, transparent 1.5px) 0 0/22px 22px #f5f6f0',
    preview: 'radial-gradient(circle, rgba(122,144,72,0.5) 2px, transparent 2px) 0 0/9px 9px #f5f6f0',
    pattern: true,
  },
  bubbles: {
    label:   'Burbujas',
    style:   'radial-gradient(circle, rgba(122,144,72,0.18) 7px, transparent 7px) 0 0/52px 52px, radial-gradient(circle, rgba(122,144,72,0.11) 4px, transparent 4px) 26px 26px/52px 52px, #f3f6ec',
    preview: 'radial-gradient(circle, rgba(122,144,72,0.42) 4px, transparent 4px) 0 0/18px 18px, radial-gradient(circle, rgba(122,144,72,0.26) 2.5px, transparent 2.5px) 9px 9px/18px 18px, #f3f6ec',
    pattern: true,
  },
  grid: {
    label:   'Cuadrícula',
    style:   'repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(122,144,72,0.13) 29px, rgba(122,144,72,0.13) 30px), repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(122,144,72,0.13) 29px, rgba(122,144,72,0.13) 30px), #f5f6f0',
    preview: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(122,144,72,0.35) 8px, rgba(122,144,72,0.35) 9px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(122,144,72,0.35) 8px, rgba(122,144,72,0.35) 9px), #f5f6f0',
    pattern: true,
  },
  lines: {
    label:   'Diagonal',
    style:   'repeating-linear-gradient(45deg, rgba(122,144,72,0.09) 0px, rgba(122,144,72,0.09) 1px, transparent 1px, transparent 18px), #f5f6f0',
    preview: 'repeating-linear-gradient(45deg, rgba(122,144,72,0.32) 0px, rgba(122,144,72,0.32) 1.5px, transparent 1.5px, transparent 7px), #f5f6f0',
    pattern: true,
  },
  confetti: {
    label:   'Confeti',
    style:   'radial-gradient(circle, rgba(122,144,72,0.22) 2px, transparent 2px) 0 0/24px 24px, radial-gradient(circle, rgba(91,127,166,0.2) 2px, transparent 2px) 12px 12px/24px 24px, radial-gradient(circle, rgba(160,98,74,0.18) 2px, transparent 2px) 6px 18px/24px 24px, #f8f5f0',
    preview: 'radial-gradient(circle, rgba(122,144,72,0.55) 2px, transparent 2px) 0 0/9px 9px, radial-gradient(circle, rgba(91,127,166,0.5) 2px, transparent 2px) 4.5px 4.5px/9px 9px, radial-gradient(circle, rgba(160,98,74,0.45) 2px, transparent 2px) 2px 7px/9px 9px, #f8f5f0',
    pattern: true,
  },
  hexagons: {
    label:   'Hexágonos',
    style:   'radial-gradient(circle farthest-side at 0% 50%, transparent 23%, rgba(122,144,72,0.12) 24%, rgba(122,144,72,0.12) 34%, transparent 35%), radial-gradient(circle farthest-side at 100% 50%, transparent 23%, rgba(122,144,72,0.12) 24%, rgba(122,144,72,0.12) 34%, transparent 35%), radial-gradient(circle farthest-side at 100% 50%, transparent 30%, rgba(122,144,72,0.08) 31%, rgba(122,144,72,0.08) 40%, transparent 41%), linear-gradient(rgba(122,144,72,0.12) 1px, transparent 1px) 0 -0.5px/28px 28px, linear-gradient(60deg, rgba(122,144,72,0.12) 1px, transparent 1px) 0 0/28px 28px, #f5f6f0',
    preview: 'repeating-linear-gradient(60deg, rgba(122,144,72,0.28) 0, rgba(122,144,72,0.28) 1px, transparent 0, transparent 50%), repeating-linear-gradient(-60deg, rgba(122,144,72,0.28) 0, rgba(122,144,72,0.28) 1px, transparent 0, transparent 50%), #f5f6f0',
    pattern: true,
  },
  diamonds: {
    label:   'Diamantes',
    style:   'repeating-linear-gradient(45deg, rgba(122,144,72,0.14) 0, rgba(122,144,72,0.14) 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, rgba(122,144,72,0.14) 0, rgba(122,144,72,0.14) 1px, transparent 0, transparent 50%) 0 0/28px 28px, #f5f6f0',
    preview: 'repeating-linear-gradient(45deg, rgba(122,144,72,0.38) 0, rgba(122,144,72,0.38) 1.5px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, rgba(122,144,72,0.38) 0, rgba(122,144,72,0.38) 1.5px, transparent 0, transparent 50%) 0 0/10px 10px, #f5f6f0',
    pattern: true,
  },
  waves: {
    label:   'Ondas',
    style:   'repeating-radial-gradient(circle at 0 0, transparent 0, #f5f6f0 10px), repeating-linear-gradient(rgba(122,144,72,0.12), rgba(122,144,72,0.12) 1px, transparent 1px, transparent 20px), #f5f6f0',
    preview: 'repeating-radial-gradient(circle at 0 0, transparent 0, #f5f6f0 4px), repeating-linear-gradient(rgba(122,144,72,0.35), rgba(122,144,72,0.35) 1px, transparent 1px, transparent 8px), #f5f6f0',
    pattern: true,
  },
  crosses: {
    label:   'Cruces',
    style:   'radial-gradient(circle, rgba(122,144,72,0.18) 1.5px, transparent 1.5px) 0 0/20px 20px, radial-gradient(circle, rgba(122,144,72,0.18) 1.5px, transparent 1.5px) 10px 10px/20px 20px, #f5f6f0',
    preview: 'radial-gradient(circle, rgba(122,144,72,0.48) 2px, transparent 2px) 0 0/8px 8px, radial-gradient(circle, rgba(122,144,72,0.48) 2px, transparent 2px) 4px 4px/8px 8px, #f5f6f0',
    pattern: true,
  },
  circles: {
    label:   'Círculos',
    style:   'radial-gradient(circle at 50% 50%, transparent 10px, rgba(122,144,72,0.13) 11px, rgba(122,144,72,0.13) 12px, transparent 13px) 0 0/32px 32px, #f5f6f0',
    preview: 'radial-gradient(circle at 50% 50%, transparent 4px, rgba(122,144,72,0.4) 5px, rgba(122,144,72,0.4) 6px, transparent 7px) 0 0/13px 13px, #f5f6f0',
    pattern: true,
  },
}

export const PATTERN_BACKGROUNDS = (Object.entries(CHAT_BACKGROUNDS) as [ChatBg, BgEntry][])
  .filter(([, v]) => v.pattern)
  .map(([k]) => k)
