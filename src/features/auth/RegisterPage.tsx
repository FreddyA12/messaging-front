import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from './api'
import { useAuthStore } from '../../store/authStore'
import { useEncryptionStore } from '../../store/encryptionStore'
import { deriveKey } from '../../lib/afin'
import { sha256 } from '../../lib/hash'
import { encryptTransit } from '../../lib/transitEncryption'

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Debe tener al menos un símbolo'),
})

type FormData = z.infer<typeof schema>

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: '', width: '0%' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++

  if (score <= 1) return { label: 'Muy débil', color: 'bg-red-500', width: '25%' }
  if (score === 2) return { label: 'Débil', color: 'bg-orange-400', width: '50%' }
  if (score === 3) return { label: 'Buena', color: 'bg-yellow-400', width: '75%' }
  return { label: 'Fuerte', color: 'bg-green-500', width: '100%' }
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const password = watch('password', '')
  const strength = getPasswordStrength(password)

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register({ name: encryptTransit(data.name), email: encryptTransit(data.email), password: await sha256(data.password) })
      setAuth(res.user, res.accessToken, res.refreshToken)
      const { a, b } = deriveKey(res.user.id)
      useEncryptionStore.getState().setKey(a, b)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError('root', { message: msg ?? 'Error al registrarse' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Crear cuenta</h1>
          <p className="mt-2 text-sm text-gray-500">Únete a Chat App</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              {...register('name')}
              type="text"
              autoComplete="name"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700"
              placeholder="Tu nombre"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700"
              placeholder="tu@email.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700"
              placeholder="••••••••"
            />
            {password && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full rounded bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-1 rounded transition-all ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className="text-xs text-gray-500">{strength.label}</p>
              </div>
            )}
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
