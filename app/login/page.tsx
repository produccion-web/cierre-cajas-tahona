'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
    } else {
      router.replace('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--brand)',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo / título */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            fontSize: '2.5rem',
            color: 'var(--teal)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}>◈</div>
          <h1 style={{ fontSize: '1.5rem', letterSpacing: '0.06em', fontWeight: 'normal' }}>
            CIERRE DE CAJA
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Acceso de administrador
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label>Correo electrónico</label>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@tutienda.com"
            />
          </div>
          <div>
            <label>Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(231,76,60,0.15)',
              border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: '6px',
              padding: '0.6rem 0.9rem',
              color: '#ff8a80',
              fontSize: '0.88rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', padding: '0.75rem' }}
          >
            {loading ? 'Accediendo…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
