'use client'
import { useEffect, useState } from 'react'
import { supabase, CierreCaja, PagoProveedor } from '@/lib/supabase'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

type CierreConPagos = CierreCaja & { pagos: PagoProveedor[] }

export default function Historial() {
  const [cierres, setCierres] = useState<CierreConPagos[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filtros, setFiltros] = useState({ tpv: '', desde: '', hasta: '' })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    let q = supabase
      .from('cierres_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtros.tpv) q = q.eq('tpv', filtros.tpv)
    if (filtros.desde) q = q.gte('fecha', filtros.desde)
    if (filtros.hasta) q = q.lte('fecha', filtros.hasta)

    const { data: ciData } = await q
    if (!ciData) { setLoading(false); return }

    const ids = ciData.map(c => c.id)
    const { data: pagosData } = await supabase
      .from('pagos_proveedor')
      .select('*')
      .in('cierre_id', ids)

    const pagosMap: Record<string, PagoProveedor[]> = {}
    ;(pagosData || []).forEach(p => {
      if (!pagosMap[p.cierre_id]) pagosMap[p.cierre_id] = []
      pagosMap[p.cierre_id].push(p)
    })

    setCierres(ciData.map(c => ({ ...c, pagos: pagosMap[c.id] || [] })))
    setLoading(false)
  }

  async function deleteCierre(id: string) {
    if (!confirm('¿Seguro que quieres eliminar este cierre?')) return
    await supabase.from('cierres_caja').delete().eq('id', id)
    setCierres(cs => cs.filter(c => c.id !== id))
  }

  // Totales del período
  const totalEfectivo = cierres.reduce((s, c) => s + (c.efectivo_neto ?? 0), 0)
  const totalDatafono = cierres.reduce((s, c) => s + (c.total_datafono ?? 0), 0)
  const totalPagos = cierres.reduce((s, c) => s + c.pagos_proveedor, 0)
  const totalGlobal = cierres.reduce((s, c) => s + (c.total_caja ?? 0), 0)

  // Agrupar por fecha
  const porFecha: Record<string, CierreConPagos[]> = {}
  cierres.forEach(c => {
    if (!porFecha[c.fecha]) porFecha[c.fecha] = []
    porFecha[c.fecha].push(c)
  })

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Registros</p>
        <h1 style={{ fontSize: '1.8rem' }}>Historial de cierres</h1>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '120px' }}>
            <label>TPV</label>
            <select value={filtros.tpv} onChange={e => setFiltros(f => ({ ...f, tpv: e.target.value }))}>
              <option value="">Todos</option>
              <option value="TPV1">TPV1</option>
              <option value="TPV2">TPV2</option>
            </select>
          </div>
          <div style={{ minWidth: '150px' }}>
            <label>Desde</label>
            <input type="date" value={filtros.desde} onChange={e => setFiltros(f => ({ ...f, desde: e.target.value }))} />
          </div>
          <div style={{ minWidth: '150px' }}>
            <label>Hasta</label>
            <input type="date" value={filtros.hasta} onChange={e => setFiltros(f => ({ ...f, hasta: e.target.value }))} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>Filtrar</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setFiltros({ tpv: '', desde: '', hasta: '' }); setTimeout(loadData, 0) }}>Limpiar</button>
        </div>
      </div>

      {/* Resumen período */}
      {cierres.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="stat-box" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.15rem' }}>{fmt(totalEfectivo)}</div>
            <div className="stat-label">Efectivo neto</div>
          </div>
          <div className="stat-box" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ color: 'var(--teal)', fontSize: '1.15rem' }}>{fmt(totalDatafono)}</div>
            <div className="stat-label">Datáfonos</div>
          </div>
          <div className="stat-box" style={{ padding: '0.75rem' }}>
            <div className="stat-value" style={{ color: 'var(--accent)', fontSize: '1.15rem' }}>{fmt(totalPagos)}</div>
            <div className="stat-label">Pagos proveedor</div>
          </div>
          <div className="stat-box" style={{ padding: '0.75rem', background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div className="stat-value" style={{ color: 'var(--gold)', fontSize: '1.15rem' }}>{fmt(totalGlobal)}</div>
            <div className="stat-label">Total período</div>
          </div>
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
            {/* Cabecera de día */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {fmtDate(fecha)}
              </span>
              <span style={{ fontFamily: 'Courier New', fontSize: '0.9rem', color: 'var(--gold)' }}>
                {fmt(cs.reduce((s, c) => s + (c.total_caja ?? 0), 0))}
              </span>
            </div>

            {/* Cierres del día */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {cs.map(c => (
                <div key={c.id}>
                  <div className="card-dark" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === c.id ? null : c.id!)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${c.tpv.toLowerCase()}`}>{c.tpv}</span>
                        <span className={`badge badge-${c.turno}`}>{c.turno}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Efectivo contado</div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '0.9rem' }}>{fmt(c.efectivo_contado)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>− Proveedores</div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '0.9rem', color: 'var(--accent)' }}>{fmt(c.pagos_proveedor)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Datáfonos</div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '0.9rem', color: 'var(--teal)' }}>{fmt(c.total_datafono ?? 0)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total</div>
                        <div style={{ fontFamily: 'Courier New', fontWeight: 'bold', color: 'var(--gold)' }}>{fmt(c.total_caja ?? 0)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{expanded === c.id ? '▲' : '▼'}</span>
                        <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteCierre(c.id!) }}>×</button>
                      </div>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {expanded === c.id && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderTop: 'none',
                      borderRadius: '0 0 8px 8px', padding: '1rem 1.2rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Datáfono 1: </span><span style={{ fontFamily: 'Courier New' }}>{fmt(c.datafono1_importe)}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Datáfono 2: </span><span style={{ fontFamily: 'Courier New' }}>{fmt(c.datafono2_importe)}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Efectivo neto: </span><span style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(c.efectivo_neto ?? 0)}</span></div>
                        {c.cerrado_por && <div><span style={{ color: 'var(--text-muted)' }}>Cerrado por: </span><span>{c.cerrado_por}</span></div>}
                        {c.notas && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-muted)' }}>Notas: </span><span>{c.notas}</span></div>}
                      </div>

                      {c.pagos.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                            Pagos a proveedores
                          </div>
                          {c.pagos.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem',
                              padding: '0.35rem 0.6rem', background: 'rgba(231,76,60,0.07)', borderRadius: '4px', marginBottom: '0.3rem' }}>
                              <span>{p.concepto}</span>
                              <span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(p.importe)}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
