'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, CierreCaja, PagoProveedor } from '@/lib/supabase'

function fmt(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) }
function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

type CierreConPagos = CierreCaja & { pagos: PagoProveedor[] }

export default function Historial() {
  const router = useRouter()
  const [cierres, setCierres] = useState<CierreConPagos[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filtros, setFiltros] = useState({ desde: '', hasta: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    let q = supabase.from('cierres_caja').select('*').order('fecha', { ascending: false }).limit(120)
    if (filtros.desde) q = q.gte('fecha', filtros.desde)
    if (filtros.hasta) q = q.lte('fecha', filtros.hasta)
    const { data: ciData } = await q
    if (!ciData) { setLoading(false); return }
    const ids = ciData.map(c => c.id)
    const { data: pagosData } = await supabase.from('pagos_proveedor').select('*').in('cierre_id', ids)
    const pagosMap: Record<string, PagoProveedor[]> = {}
    ;(pagosData || []).forEach(p => { if (!pagosMap[p.cierre_id]) pagosMap[p.cierre_id] = []; pagosMap[p.cierre_id].push(p) })
    setCierres(ciData.map(c => ({ ...c, pagos: pagosMap[c.id] || [] })))
    setLoading(false)
  }

  async function deleteCierre(id: string) {
    if (!confirm('¿Eliminar este cierre?')) return
    await supabase.from('cierres_caja').delete().eq('id', id)
    setCierres(cs => cs.filter(c => c.id !== id))
  }

  const totalVentas = cierres.reduce((s, c) => s + (c.total_ventas ?? 0), 0)
  const totalEf = cierres.reduce((s, c) => s + (c.total_efectivo_ventas ?? 0), 0)
  const totalTar = cierres.reduce((s, c) => s + (c.total_tarjeta ?? 0), 0)
  const totalPagos = cierres.reduce((s, c) => s + c.pagos_proveedor, 0)

  const porFecha: Record<string, CierreConPagos[]> = {}
  cierres.forEach(c => { if (!porFecha[c.fecha]) porFecha[c.fecha] = []; porFecha[c.fecha].push(c) })

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Registros</p>
        <h1 style={{ fontSize: '1.8rem' }}>Historial de cierres</h1>
      </div>

      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label>Desde</label><input type="date" value={filtros.desde} onChange={e => setFiltros(f => ({ ...f, desde: e.target.value }))} style={{ width: '155px' }} /></div>
          <div><label>Hasta</label><input type="date" value={filtros.hasta} onChange={e => setFiltros(f => ({ ...f, hasta: e.target.value }))} style={{ width: '155px' }} /></div>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>Filtrar</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setFiltros({ desde: '', hasta: '' }); setTimeout(loadData, 50) }}>Limpiar</button>
        </div>
      </div>

      {cierres.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Ventas efectivo', val: totalEf, color: 'var(--success)' },
            { label: 'Ventas tarjeta', val: totalTar, color: 'var(--teal)' },
            { label: 'Pagos proveedor', val: totalPagos, color: 'var(--accent)' },
            { label: 'Total ventas', val: totalVentas, color: 'var(--gold)' },
          ].map(s => (
            <div key={s.label} className="stat-box" style={{ padding: '0.75rem' }}>
              <div className="stat-value" style={{ color: s.color, fontSize: '1.1rem' }}>{fmt(s.val)}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '3rem', textAlign: 'center' }}>Cargando…</p>
      ) : cierres.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay cierres registrados</p>
        </div>
      ) : (
        Object.entries(porFecha).map(([fecha, cs]) => (
          <div key={fecha} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{fmtDate(fecha)}</span>
              <span style={{ fontFamily: 'Courier New', fontSize: '0.9rem', color: 'var(--gold)' }}>{fmt(cs.reduce((s, c) => s + (c.total_ventas ?? 0), 0))}</span>
            </div>
            {cs.map(c => (
              <div key={c.id}>
                <div className="card-dark" style={{ cursor: 'pointer', marginBottom: '0.1rem' }} onClick={() => setExpanded(expanded === c.id ? null : c.id!)}>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                    <span className={`badge badge-${c.turno}`}>{c.turno}</span>
                    <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ef. ventas</div><div style={{ fontFamily: 'Courier New', fontSize: '0.88rem', color: 'var(--success)' }}>{fmt(c.total_efectivo_ventas ?? 0)}</div></div>
                    <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Tarjeta</div><div style={{ fontFamily: 'Courier New', fontSize: '0.88rem', color: 'var(--teal)' }}>{fmt(c.total_tarjeta ?? 0)}</div></div>
                    <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Fondo sig.</div><div style={{ fontFamily: 'Courier New', fontSize: '0.88rem', color: 'var(--gold)' }}>{fmt(c.fondo_siguiente_dia ?? 0)}</div></div>
                    <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total ventas</div><div style={{ fontFamily: 'Courier New', fontWeight: 'bold' }}>{fmt(c.total_ventas ?? 0)}</div></div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button className="btn btn-teal btn-sm" onClick={e => { e.stopPropagation(); router.push(`/cierre/resumen?id=${c.id}`) }}>🖨</button>
                      <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteCierre(c.id!) }}>×</button>
                    </div>
                  </div>
                </div>
                {expanded === c.id && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '1rem 1.2rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Fondo apertura: </span><span style={{ fontFamily: 'Courier New', color: 'var(--gold)' }}>{fmt(c.fondo_apertura)}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>TPV1 ef/tar: </span><span style={{ fontFamily: 'Courier New' }}>{fmt(c.tpv1_efectivo)} / {fmt(c.tpv1_tarjeta)}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>TPV2 ef/tar: </span><span style={{ fontFamily: 'Courier New' }}>{fmt(c.tpv2_efectivo)} / {fmt(c.tpv2_tarjeta)}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Efectivo en caja: </span><span style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(c.efectivo_en_caja ?? 0)}</span></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Retirada: </span><span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(c.retirada_efectivo)}</span></div>
                      {c.cerrado_por && <div><span style={{ color: 'var(--text-muted)' }}>Empleado: </span><span>{c.cerrado_por}</span></div>}
                      {c.notas && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notas: </span><span>{c.notas}</span></div>}
                    </div>
                    {c.pagos.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Pagos proveedores</div>
                        {c.pagos.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0.6rem', background: 'rgba(231,76,60,0.07)', borderRadius: '4px', marginBottom: '0.25rem' }}>
                            <span>{p.concepto}</span><span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(p.importe)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
