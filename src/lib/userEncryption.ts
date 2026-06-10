import { encrypt, safeDecrypt, deriveKey } from './afin'

export function encryptUserField(text: string, userId: number): string {
  const { a, b } = deriveKey(userId)
  return encrypt(text, a, b)
}

export function decryptUserField(text: string, userId: number): string {
  const { a, b } = deriveKey(userId)
  return safeDecrypt(text, a, b)
}
