'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/supabase'

export default function NavBar() {
  const path = usePathname()
  const router = useRouter()
  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/cierre', label: 'Nuevo cierre' },
    { href: '/historial', label: 'Historial' },
    { href: '/banco', label: '🏦 Banco' },
  ]

  async function handleLogout() {
    await signOut()
    router.replace('/login')
  }

  return (
    <nav style={{
      background: 'var(--brand-mid)',
      borderBottom: '1px solid var(--border)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <span style={{
        fontFamily: 'Georgia, serif',
        fontSize: '1rem',
        letterSpacing: '0.05em',
        color: 'var(--teal)',
        marginRight: '1.5rem',
        fontWeight: 'bold',
      }}>
        ◈ CAJA
      </span>
      {links.map(l => (
        <Link key={l.href} href={l.href}
          className={`nav-link${path === l.href ? ' active' : ''}`}>
          {l.label}
        </Link>
      ))}
      <div style={{ marginLeft: 'auto' }}>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm">
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
