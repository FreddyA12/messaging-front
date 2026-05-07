import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, safeDecrypt, modInverse, isValidKey, encryptByte, decryptByte } from './afin'

const KEY_PAIRS: [number, number][] = [
  [3, 0],
  [7, 128],
  [17, 50],
  [255, 255],
  [127, 1],
  [11, 200],
]

describe('isValidKey', () => {
  it('accepts odd numbers >= 3', () => {
    expect(isValidKey(3)).toBe(true)
    expect(isValidKey(7)).toBe(true)
    expect(isValidKey(255)).toBe(true)
    expect(isValidKey(127)).toBe(true)
  })

  it('rejects a=1', () => {
    expect(isValidKey(1)).toBe(false)
  })

  it('rejects even numbers', () => {
    expect(isValidKey(2)).toBe(false)
    expect(isValidKey(4)).toBe(false)
    expect(isValidKey(256)).toBe(false)
    expect(isValidKey(128)).toBe(false)
  })

  it('rejects non-integers and out of range', () => {
    expect(isValidKey(0)).toBe(false)
    expect(isValidKey(257)).toBe(false)
    expect(isValidKey(1.5)).toBe(false)
  })
})

describe('modInverse', () => {
  it('returns correct inverse for odd values mod 256', () => {
    expect((3 * modInverse(3, 256)) % 256).toBe(1)
    expect((7 * modInverse(7, 256)) % 256).toBe(1)
    expect((17 * modInverse(17, 256)) % 256).toBe(1)
    expect((255 * modInverse(255, 256)) % 256).toBe(1)
    expect((127 * modInverse(127, 256)) % 256).toBe(1)
  })

  it('throws for non-invertible values', () => {
    expect(() => modInverse(2, 256)).toThrow()
    expect(() => modInverse(4, 256)).toThrow()
  })
})

describe('encryptByte / decryptByte', () => {
  it('round-trips single bytes for all key pairs', () => {
    for (const [a, b] of KEY_PAIRS) {
      const aInv = modInverse(a, 256)
      for (const x of [0, 1, 65, 127, 128, 200, 255]) {
        const y = encryptByte(x, a, b)
        expect(decryptByte(y, aInv, b)).toBe(x)
      }
    }
  })

  it('stays in byte range', () => {
    for (const [a, b] of KEY_PAIRS) {
      for (let x = 0; x <= 255; x++) {
        const y = encryptByte(x, a, b)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(255)
      }
    }
  })
})

describe('encrypt / decrypt — ASCII', () => {
  const texts = ['hello', 'world', 'Hello, World!', '1234567890', 'abc XYZ 123']

  it('round-trips for all key pairs', () => {
    for (const [a, b] of KEY_PAIRS) {
      for (const text of texts) {
        expect(decrypt(encrypt(text, a, b), a, b)).toBe(text)
      }
    }
  })

  it('encrypted output is valid Base64 and not the original string', () => {
    for (const [a, b] of KEY_PAIRS) {
      const c = encrypt('hello world', a, b)
      expect(() => atob(c)).not.toThrow()
      expect(c).not.toBe('hello world')
    }
  })

  it('different keys produce different ciphertext', () => {
    const text = 'test message'
    const c1 = encrypt(text, 3, 0)
    const c2 = encrypt(text, 7, 50)
    expect(c1).not.toBe(c2)
  })
})

describe('encrypt / decrypt — multibyte / emoji', () => {
  const texts = [
    'Héllo Wörld',
    'こんにちは',
    '🔒🗝️',
    'café ñoño',
    '中文测试',
    '🎉🎊✨',
  ]

  it('round-trips multibyte strings for all key pairs', () => {
    for (const [a, b] of KEY_PAIRS) {
      for (const text of texts) {
        expect(decrypt(encrypt(text, a, b), a, b)).toBe(text)
      }
    }
  })
})

describe('encrypt / decrypt — edge cases', () => {
  it('handles empty string', () => {
    for (const [a, b] of KEY_PAIRS) {
      expect(decrypt(encrypt('', a, b), a, b)).toBe('')
    }
  })

  it('handles single character', () => {
    for (const [a, b] of KEY_PAIRS) {
      expect(decrypt(encrypt('x', a, b), a, b)).toBe('x')
    }
  })

  it('handles long strings', () => {
    const long = 'a'.repeat(1000) + '日本語テスト'.repeat(50)
    for (const [a, b] of KEY_PAIRS) {
      expect(decrypt(encrypt(long, a, b), a, b)).toBe(long)
    }
  })
})

describe('safeDecrypt', () => {
  it('returns original string when input is not valid Base64 ciphertext', () => {
    const result = safeDecrypt('plain text (not encrypted)', 3, 0)
    expect(result).toBe('plain text (not encrypted)')
  })

  it('decrypts valid ciphertext correctly', () => {
    const text = 'hello'
    const cipher = encrypt(text, 7, 42)
    expect(safeDecrypt(cipher, 7, 42)).toBe(text)
  })
})

describe('mutation-resistant tests', () => {
  it('b=0 still encrypts when a > 1', () => {
    const c = encrypt('abc', 3, 0)
    expect(decrypt(c, 3, 0)).toBe('abc')
    expect(c).not.toBe(btoa('abc'))
  })

  it('changing a single byte in ciphertext causes decryption mismatch', () => {
    const text = 'mutation test'
    const cipher = encrypt(text, 7, 100)
    const raw = atob(cipher)
    const tampered = btoa(String.fromCharCode(raw.charCodeAt(0) ^ 1) + raw.slice(1))
    expect(decrypt(tampered, 7, 100)).not.toBe(text)
  })

  it('all odd a values in [3,255] produce valid round-trips', () => {
    const text = 'round trip'
    for (let a = 3; a <= 255; a += 2) {
      const b = a % 256
      expect(decrypt(encrypt(text, a, b), a, b)).toBe(text)
    }
  })
})
