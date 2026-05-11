export function modInverse(a: number, m: number): number {
  let [oldR, r] = [a, m]
  let [oldS, s] = [1, 0]
  while (r !== 0) {
    const q = Math.floor(oldR / r)
    ;[oldR, r] = [r, oldR - q * r]
    ;[oldS, s] = [s, oldS - q * s]
  }
  if (oldR !== 1) throw new Error(`No modular inverse: gcd(${a}, ${m}) = ${oldR}`)
  return ((oldS % m) + m) % m
}

export function isValidKey(a: number): boolean {
  return Number.isInteger(a) && a >= 3 && a <= 255 && a % 2 !== 0
}

export function encryptByte(x: number, a: number, b: number): number {
  return (a * x + b) & 0xff
}

export function decryptByte(y: number, aInv: number, b: number): number {
  return (aInv * ((y - b + 256) & 0xff)) & 0xff
}

export const AFFINE_PREFIX = 'AFN:'

export function deriveKey(userId: number): { a: number; b: number } {
  const a = (userId % 127) * 2 + 3
  const b = (userId * 37 + 11) % 256
  return { a, b }
}

export function encrypt(plaintext: string, a: number, b: number): string {
  const bytes = new TextEncoder().encode(plaintext)
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    out[i] = encryptByte(bytes[i], a, b)
  }
  return AFFINE_PREFIX + btoa(String.fromCharCode(...out))
}

export function decrypt(ciphertext: string, a: number, b: number): string {
  const payload = ciphertext.startsWith(AFFINE_PREFIX)
    ? ciphertext.slice(AFFINE_PREFIX.length)
    : ciphertext
  const aInv = modInverse(a, 256)
  const raw = atob(payload)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = decryptByte(raw.charCodeAt(i), aInv, b)
  }
  return new TextDecoder().decode(bytes)
}

export function safeDecrypt(ciphertext: string, a: number, b: number): string {
  if (!ciphertext.startsWith(AFFINE_PREFIX)) return ciphertext
  try {
    return decrypt(ciphertext, a, b)
  } catch {
    return ciphertext
  }
}
