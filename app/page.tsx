'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, CierreCaja } from '@/lib/supabase'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function Home() {
  const [cierres, setCierres] = useState<CierreCaja[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('cierres_caja')
        .select('*')
        .eq('fecha', today())
        .order('created_at', { ascending: false })
      setCierres(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalEfectivo = cierres.reduce((s, c) => s + (c.efectivo_neto ?? 0), 0)
  const totalDatafono = cierres.reduce((s, c) => s + (c.total_datafono ?? 0), 0)
  const totalGlobal = cierres.reduce((s, c) => s + (c.total_caja ?? 0), 0)
  const totalPagos = cierres.reduce((s, c) => s + c.pagos_proveedor, 0)

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--text)', marginTop: '0.25rem' }}>
          Resumen del día
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{fmt(totalEfectivo)}</div>
          <div className="stat-label">Efectivo neto</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{fmt(totalDatafono)}</div>
          <div className="stat-label">Datáfonos</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{fmt(totalPagos)}</div>
          <div className="stat-label">Pagos proveedor</div>
        </div>
        <div className="stat-box" style={{ background: 'rgba(15,188,179,0.07)', border: '1px solid rgba(15,188,179,0.25)' }}>
          <div className="stat-value" style={{ color: 'var(--gold)', fontSize: '1.8rem' }}>{fmt(totalGlobal)}</div>
          <div className="stat-label">Total global hoy</div>
        </div>
      </div>

      {/* Cierres de hoy */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Cierres registrados hoy</h2>
        <Link href="/cierre" className="btn btn-primary btn-sm">+ Nuevo cierre</Link>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando…</p>
      ) : cierres.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.2rem' }}>No hay cierres registrados hoy</p>
          <Link href="/cierre" className="btn btn-teal">Registrar primer cierre</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {cierres.map(c => (
            <div key={c.id} className="card-dark" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge badge-${c.tpv.toLowerCase()}`}>{c.tpv}</span>
                <span className={`badge badge-${c.turno}`}>{c.turno}</span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Efectivo neto</div>
                <div style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(c.efectivo_neto ?? 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Datáfonos</div>
                <div style={{ fontFamily: 'Courier New', color: 'var(--teal)' }}>{fmt(c.total_datafono ?? 0)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</div>
                <div style={{ fontFamily: 'Courier New', fontWeight: 'bold', color: 'var(--gold)' }}>{fmt(c.total_caja ?? 0)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TPV status */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '1rem' }}>Estado TPVs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {(['TPV1','TPV2'] as const).map(tpv => {
            const cierre = cierres.find(c => c.tpv === tpv)
            return (
              <div key={tpv} className="card" style={{ borderColor: cierre ? 'rgba(46,204,113,0.3)' : 'var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className={`badge badge-${tpv.toLowerCase()}`}>{tpv}</span>
                  {cierre
                    ? <span className="badge badge-success">✓ Cerrado</span>
                    : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pendiente</span>}
                </div>
                {cierre ? (
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Turno: <span style={{ color: 'var(--text)' }}>{cierre.turno}</span> · Total: <span style={{ color: 'var(--gold)', fontFamily: 'Courier New' }}>{fmt(cierre.total_caja ?? 0)}</span>
                  </div>
                ) : (
                  <Link href={`/cierre?tpv=${tpv}`} className="btn btn-secondary btn-sm" style={{ marginTop: '0.25rem' }}>
                    Cerrar {tpv}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
