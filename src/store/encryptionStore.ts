import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { isValidKey } from '../lib/afin'

interface EncryptionState {
  a: number | null
  b: number | null
  setKey: (a: number, b: number) => void
  clearKey: () => void
}

export const useEncryptionStore = create<EncryptionState>()(
  persist(
    (set) => ({
      a: null,
      b: null,

      setKey: (a, b) => {
        if (!isValidKey(a)) throw new Error(`Invalid affine key: a=${a}`)
        set({ a, b })
      },

      clearKey: () => set({ a: null, b: null }),
    }),
    {
      name: 'encryption-key',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
