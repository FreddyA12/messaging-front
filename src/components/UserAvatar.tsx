import { useState } from 'react'

const AVATAR_COLORS = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #a855f7, #7c3aed)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #f97316, #c2410c)',
  'linear-gradient(135deg, #14b8a6, #0f766e)',
  'linear-gradient(135deg, #6366f1, #4338ca)',
  'linear-gradient(135deg, #ef4444, #b91c1c)',
  'linear-gradient(135deg, #f59e0b, #b45309)',
]

function nameColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

interface UserAvatarProps {
  userId?: number | null
  name: string
  size?: number
  fontSize?: number
  style?: React.CSSProperties
}

export function UserAvatar({ userId, name, size = 40, fontSize, style }: UserAvatarProps) {
  const [failed, setFailed] = useState(false)

  const fs = fontSize ?? Math.round(size * 0.38)
  const initial = name?.[0]?.toUpperCase() ?? '?'

  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  }

  if (userId && !failed) {
    return (
      <div style={base}>
        <img
          src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/users/${userId}/avatar`}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return (
    <div style={{ ...base, background: nameColor(name) }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: fs, letterSpacing: '-0.02em' }}>
        {initial}
      </span>
    </div>
  )
}
