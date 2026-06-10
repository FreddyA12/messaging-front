import { AFFINE_PREFIX, encrypt } from './afin'

// Fixed transit key shared with backend for encrypting fields the server must process
const TRANSIT_A = 3
const TRANSIT_B = 7
export const TRANSIT_PREFIX = 'TRN:'

export function encryptTransit(text: string): string {
  if (!text) return text
  const affineResult = encrypt(text, TRANSIT_A, TRANSIT_B)
  return TRANSIT_PREFIX + affineResult.slice(AFFINE_PREFIX.length)
}
