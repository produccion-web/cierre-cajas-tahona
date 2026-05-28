'use client'
import { usePathname } from 'next/navigation'
import { AuthProvider } from './AuthProvider'
import AuthGuard from './AuthGuard'
import NavBar from './NavBar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const isLogin = path === '/login'

  if (isLogin) {
    return <AuthProvider>{children}</AuthProvider>
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <NavBar />
        <main style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
          {children}
        </main>
      </AuthGuard>
    </AuthProvider>
  )
}
