'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, CierreCaja } from '@/lib/supabase'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}
function today() { return new Date().toISOString().split('T')[0] }

export default function Home() {
  const [cierres, setCierres] = useState<CierreCaja[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('cierres_caja').select('*').eq('fecha', today())
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCierres(data || []); setLoading(false) })
  }, [])

  const ultimo = cierres[0]
  const totalVentas = cierres.reduce((s, c) => s + (c.total_ventas ?? 0), 0)
  const totalEfectivo = cierres.reduce((s, c) => s + (c.total_efectivo_ventas ?? 0), 0)
  const totalTarjeta = cierres.reduce((s, c) => s + (c.total_tarjeta_ventas ?? 0), 0)
  const totalPagos = cierres.reduce((s, c) => s + c.pagos_proveedor, 0)

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ fontSize: '1.8rem', marginTop: '0.25rem' }}>Resumen del día</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(totalEfectivo)}</div>
          <div className="stat-label">Ventas efectivo</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{fmt(totalTarjeta)}</div>
          <div className="stat-label">Ventas tarjeta</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(totalPagos)}</div>
          <div className="stat-label">Pagos proveedor</div>
        </div>
        <div className="stat-box" style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)' }}>
          <div className="stat-value" style={{ color: 'var(--gold)', fontSize: '1.7rem' }}>{fmt(totalVentas)}</div>
          <div className="stat-label">Total ventas hoy</div>
        </div>
      </div>

      {ultimo && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(15,188,179,0.3)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
            Fondo para mañana
          </div>
          <div style={{ fontSize: '2rem', fontFamily: 'Courier New', color: 'var(--teal)', fontWeight: 'bold' }}>
            {fmt(ultimo.fondo_siguiente_dia ?? 0)}
          </div>
          {(ultimo.retirada_efectivo ?? 0) > 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Retirada realizada: <span style={{ color: 'var(--accent)', fontFamily: 'Courier New' }}>{fmt(ultimo.retirada_efectivo)}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Cierres de hoy</h2>
        <Link href="/cierre" className="btn btn-primary btn-sm">+ Nuevo cierre</Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando…</p>
      ) : cierres.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.2rem' }}>No hay cierres registrados hoy</p>
          <Link href="/cierre" className="btn btn-teal">Registrar cierre</Link>
        </div>
      ) : (
        cierres.map(c => (
          <div key={c.id} className="card-dark" style={{ marginBottom: '0.6rem', display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <span className={`badge badge-${c.turno}`}>{c.turno}</span>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Efectivo ventas</div><div style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(c.total_efectivo_ventas ?? 0)}</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tarjeta</div><div style={{ fontFamily: 'Courier New', color: 'var(--teal)' }}>{fmt(c.total_tarjeta ?? 0)}</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fondo siguiente</div><div style={{ fontFamily: 'Courier New', color: 'var(--gold)' }}>{fmt(c.fondo_siguiente_dia ?? 0)}</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total ventas</div><div style={{ fontFamily: 'Courier New', fontWeight: 'bold' }}>{fmt(c.total_ventas ?? 0)}</div></div>
          </div>
        ))
      )}
    </div>
  )
}
