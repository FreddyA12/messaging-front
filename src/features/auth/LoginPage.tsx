import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from './api'
import { useAuthStore } from '../../store/authStore'
import { useEncryptionStore } from '../../store/encryptionStore'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})
type FormData = z.infer<typeof schema>

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

/* ─── Floating bubble decorations for the left panel ─── */
const FloatingBubble = ({ size, x, y, delay, color }: { size: number; x: string; y: string; delay: number; color: string }) => (
  <div style={{
    position: 'absolute',
    left: x,
    top: y,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: color,
    animation: `floatBubble 6s ease-in-out ${delay}s infinite alternate`,
    opacity: 0.6,
  }} />
)

/* ─── Chat bubble decoration ─── */
const ChatBubbleDecor = ({ text, x, y, delay, align }: { text: string; x: string; y: string; delay: number; align: 'left' | 'right' }) => (
  <div style={{
    position: 'absolute',
    left: x,
    top: y,
    maxWidth: '180px',
    padding: '12px 18px',
    borderRadius: align === 'right' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: align === 'right'
      ? 'linear-gradient(135deg, rgba(122, 144, 72, 0.25), rgba(99, 120, 57, 0.18))'
      : 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    fontSize: '13px',
    color: align === 'right' ? '#4e602c' : '#7a8a6a',
    fontWeight: 500,
    animation: `floatBubble 7s ease-in-out ${delay}s infinite alternate`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
    lineHeight: 1.45,
  }}>
    {text}
  </div>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [showPwd, setShowPwd] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data)
      setAuth(res.user, res.accessToken, res.refreshToken)
      const oddValues: number[] = []
      for (let v = 3; v <= 255; v += 2) oddValues.push(v)
      const a = oddValues[Math.floor(Math.random() * oddValues.length)]
      const b = Math.floor(Math.random() * 256)
      useEncryptionStore.getState().setKey(a, b)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError('root', { message: msg ?? 'Credenciales inválidas' })
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Poppins', system-ui, sans-serif;
          overflow: hidden;
        }

        @keyframes floatBubble {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-14px) scale(1.04); }
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(122, 144, 72, 0.2); }
          50% { box-shadow: 0 0 0 12px rgba(122, 144, 72, 0); }
        }

        .login-input {
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .login-input:focus {
          border-color: #7a9048 !important;
          box-shadow: 0 0 0 4px rgba(122, 144, 72, 0.12), 0 1px 3px rgba(0,0,0,0.04) !important;
          outline: none;
          background: #ffffff !important;
        }
        .login-input::placeholder {
          color: #9aaa82;
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
        }
        .login-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #faf8f5 inset !important;
          -webkit-text-fill-color: #2d2a26 !important;
        }

        .login-btn {
          font-family: 'Poppins', sans-serif;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .login-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(122, 144, 72, 0.35) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.995);
        }

        .login-link {
          transition: all 0.25s ease;
          position: relative;
        }
        .login-link:hover {
          color: #637839 !important;
        }
        .login-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1.5px;
          background: #7a9048;
          transition: width 0.3s ease;
        }
        .login-link:hover::after {
          width: 100%;
        }

        .eye-toggle {
          transition: all 0.2s ease;
        }
        .eye-toggle:hover {
          color: #4e602c !important;
          transform: scale(1.1);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .login-split { flex-direction: column !important; }
          .login-left-panel { display: none !important; }
          .login-right-panel {
            width: 100% !important;
            min-height: 100vh !important;
            justify-content: center !important;
          }
        }
      `}</style>

      <div className="login-split" style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}>

        {/* ═══════════ LEFT PANEL — Brand & Decoration ═══════════ */}
        <div className="login-left-panel" style={{
          flex: '1 1 50%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #f0f3e6 0%, #e8ecda 30%, #e2e8d4 60%, #f0f3e6 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}>
          {/* Subtle pattern overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 20%, rgba(122, 144, 72, 0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(99, 120, 57, 0.08) 0%, transparent 50%)',
          }} />

          {/* Floating decorative bubbles */}
          <FloatingBubble size={80} x="15%" y="18%" delay={0} color="rgba(122, 144, 72, 0.18)" />
          <FloatingBubble size={50} x="72%" y="12%" delay={1.5} color="rgba(99, 120, 57, 0.13)" />
          <FloatingBubble size={35} x="82%" y="65%" delay={0.8} color="rgba(78, 96, 44, 0.16)" />
          <FloatingBubble size={60} x="8%" y="72%" delay={2} color="rgba(122, 144, 72, 0.12)" />
          <FloatingBubble size={25} x="55%" y="85%" delay={1.2} color="rgba(99, 120, 57, 0.18)" />
          <FloatingBubble size={45} x="40%" y="8%" delay={0.5} color="rgba(145, 166, 98, 0.16)" />

          {/* Decorative chat bubbles */}
          <ChatBubbleDecor text="¡Hola! ¿Cómo estás?" x="12%" y="28%" delay={0.3} align="left" />
          <ChatBubbleDecor text="Todo genial, gracias" x="55%" y="38%" delay={1} align="right" />
          <ChatBubbleDecor text="¡Nos vemos pronto!" x="18%" y="62%" delay={1.8} align="left" />

          {/* Brand content */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            animation: 'fadeIn 1s ease',
          }}>
            {/* Logo */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #7a9048, #91a662)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 32px rgba(122, 144, 72, 0.28)',
              animation: 'pulseGlow 3s ease-in-out infinite',
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>

            <h2 style={{
              fontFamily: "'Poppins', system-ui, sans-serif",
              fontSize: '42px',
              fontWeight: 600,
              color: '#242d16',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              lineHeight: 1.1,
            }}>
              Whispr
            </h2>

            <p style={{
              fontSize: '16px',
              color: '#7a8a6a',
              fontWeight: 400,
              maxWidth: '280px',
              lineHeight: 1.6,
              margin: '0 auto',
              letterSpacing: '0.01em',
            }}>
              Donde las conversaciones <br />fluyen naturalmente
            </p>

            {/* decorative line */}
            <div style={{
              width: '40px',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #7a9048, transparent)',
              margin: '28px auto 0',
              borderRadius: '1px',
            }} />
          </div>
        </div>

        {/* ═══════════ RIGHT PANEL — Login Form ═══════════ */}
        <div className="login-right-panel" style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f5f6f0 0%, #ffffff 40%, #f5f6f0 100%)',
          padding: '48px 40px',
          position: 'relative',
        }}>
          {/* subtle left border accent */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: '15%',
            bottom: '15%',
            width: '1px',
            background: 'linear-gradient(180deg, transparent, rgba(122, 144, 72, 0.2), transparent)',
          }} />

          <div style={{
            width: '100%',
            maxWidth: '400px',
            animation: 'fadeSlideUp 0.7s ease',
          }}>
            {/* Header */}
            <div style={{ marginBottom: '36px' }}>
              <p style={{
                fontSize: '13px',
                fontWeight: 500,
                color: '#7a9048',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: '10px',
              }}>
                Bienvenido de vuelta
              </p>
              <h1 style={{
                fontFamily: "'Poppins', system-ui, sans-serif",
                fontSize: '32px',
                fontWeight: 600,
                color: '#242d16',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                marginBottom: '8px',
              }}>
                Inicia sesión
              </h1>
              <p style={{
                fontSize: '14px',
                color: '#8a9a7a',
                fontWeight: 400,
                lineHeight: 1.5,
              }}>
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Form Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              border: '1px solid rgba(122, 144, 72, 0.15)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.02), 0 24px 64px rgba(0,0,0,0.05)',
              padding: '36px 32px 32px',
            }}>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

                {/* Email field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: focusedField === 'email' ? '#7a9048' : '#6a7a5a',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    transition: 'color 0.3s ease',
                  }}>
                    Correo electrónico
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: focusedField === 'email' ? '#7a9048' : '#9aaa82',
                      display: 'flex',
                      pointerEvents: 'none',
                      transition: 'color 0.3s ease',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="2" y="4" width="20" height="16" rx="3" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      {...register('email')}
                      className="login-input"
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@email.com"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 44px',
                        border: `1.5px solid ${errors.email ? '#e8a0a0' : '#d4dcc0'}`,
                        borderRadius: '14px',
                        color: '#2d2a26',
                        fontSize: '14px',
                        fontWeight: 400,
                        background: '#f5f6f0',
                        letterSpacing: '0.01em',
                      }}
                    />
                  </div>
                  {errors.email && (
                    <p style={{
                      fontSize: '12px',
                      color: '#d4716a',
                      marginTop: '6px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4m0 4h.01" />
                      </svg>
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: focusedField === 'password' ? '#7a9048' : '#6a7a5a',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    transition: 'color 0.3s ease',
                  }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: focusedField === 'password' ? '#7a9048' : '#9aaa82',
                      display: 'flex',
                      pointerEvents: 'none',
                      transition: 'color 0.3s ease',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <rect x="3" y="11" width="18" height="11" rx="3" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <input
                      {...register('password')}
                      className="login-input"
                      id="login-password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••"
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: '100%',
                        padding: '14px 48px 14px 44px',
                        border: `1.5px solid ${errors.password ? '#e8a0a0' : '#d4dcc0'}`,
                        borderRadius: '14px',
                        color: '#2d2a26',
                        fontSize: '14px',
                        fontWeight: 400,
                        background: '#f5f6f0',
                        letterSpacing: '0.05em',
                      }}
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => setShowPwd((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9aaa82',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <EyeIcon open={showPwd} />
                    </button>
                  </div>
                  {errors.password && (
                    <p style={{
                      fontSize: '12px',
                      color: '#d4716a',
                      marginTop: '6px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4m0 4h.01" />
                      </svg>
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Root error */}
                {errors.root && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #fef2f2, #fff5f5)',
                    border: '1px solid #f5cfcf',
                    color: '#c45c55',
                    fontSize: '13px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4m0 4h.01" />
                    </svg>
                    {errors.root.message}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  id="login-submit"
                  disabled={isSubmitting}
                  className="login-btn"
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: 'linear-gradient(135deg, #7a9048, #637839)',
                    border: 'none',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    boxShadow: '0 4px 18px rgba(122, 144, 72, 0.3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {isSubmitting && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  {isSubmitting ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            </div>

            {/* Register link */}
            <div style={{
              textAlign: 'center',
              marginTop: '28px',
            }}>
              <p style={{
                fontSize: '13px',
                color: '#a89e96',
                fontWeight: 400,
              }}>
                ¿No tienes una cuenta?{' '}
                <Link
                  to="/register"
                  className="login-link"
                  style={{
                    color: '#7a9048',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontFamily: "'Poppins', system-ui, sans-serif",
                  }}
                >
                  Regístrate gratis
                </Link>
              </p>
            </div>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: '40px',
              paddingTop: '20px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                fontSize: '11px',
                color: '#9aaa82',
              }}>
                <span>Privacidad</span>
                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#d8cfc8' }} />
                <span>Términos</span>
                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#d8cfc8' }} />
                <span>Ayuda</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
