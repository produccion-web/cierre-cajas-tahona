'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, CierreCaja, PagoProveedor } from '@/lib/supabase'

function fmt(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) }
function fmtDate(s: string) { return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

function diffColor(d: number) {
  if (Math.abs(d) < 0.01) return '#2ecc71'
  return d > 0 ? '#0fbcb3' : '#e74c3c'
}
function diffLabel(d: number) {
  if (Math.abs(d) < 0.01) return 'CUADRADO'
  return d > 0 ? `SOBRAN ${fmt(d)}` : `FALTAN ${fmt(Math.abs(d))}`
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="pos-row" style={{ fontWeight: bold ? 'bold' : 'normal' }}>
      <span>{label}</span><span style={{ color: color || 'inherit' }}>{value}</span>
    </div>
  )
}

function ResumenContent() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id')
  const [cierre, setCierre] = useState<CierreCaja | null>(null)
  const [pagos, setPagos] = useState<PagoProveedor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: c } = await supabase.from('cierres_caja').select('*').eq('id', id).single()
      const { data: p } = await supabase.from('pagos_proveedor').select('*').eq('cierre_id', id)
      setCierre(c); setPagos(p || []); setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: '3rem', textAlign: 'center' }}>Cargando…</p>
  if (!cierre) return <p style={{ color: 'var(--accent)', padding: '3rem', textAlign: 'center' }}>No se encontró el cierre</p>

  const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const difEf = cierre.diferencia_efectivo ?? 0
  const difDf = cierre.diferencia_datafono ?? 0
  const difGlobal = difEf + difDf

  return (
    <>
      {/* ── Vista pantalla ── */}
      <div className="fade-in no-print">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Guardado correctamente</p>
            <h1 style={{ fontSize: '1.8rem' }}>Resumen del cierre</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-teal" onClick={() => window.print()}>🖨 Imprimir ticket POS80</button>
            <button className="btn btn-secondary" onClick={() => router.push('/')}>Volver al inicio</button>
          </div>
        </div>

        {/* Info + fondo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Info general</div>
            {[
              ['Fecha', fmtDate(cierre.fecha)],
              ['Turno', cierre.turno],
              ['Fondo apertura', fmt(cierre.fondo_apertura)],
              ...(cierre.cerrado_por ? [['Cerrado por', cierre.cerrado_por]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontFamily: 'Courier New' }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ borderColor: 'rgba(15,188,179,0.3)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Fondo día siguiente</div>
            <div style={{ fontSize: '2.2rem', fontFamily: 'Courier New', fontWeight: 'bold', color: 'var(--teal)' }}>{fmt(cierre.fondo_siguiente_dia ?? 0)}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              {fmt(cierre.efectivo_contado)} contado − {fmt(cierre.retirada_efectivo)} retirada
            </div>
          </div>
        </div>

        {/* TPVs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {[1, 2].map(t => {
            const ef = t === 1 ? cierre.tpv1_efectivo : cierre.tpv2_efectivo
            const tar = t === 1 ? cierre.tpv1_tarjeta : cierre.tpv2_tarjeta
            const col = t === 1 ? 'var(--teal)' : 'var(--gold)'
            return (
              <div key={t} className="card" style={{ borderColor: col + '44' }}>
                <div style={{ fontSize: '0.75rem', color: col, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>TPV {t}</div>
                {[['Efectivo', fmt(ef), 'var(--success)'], ['Tarjeta', fmt(tar), col], ['Total', fmt(ef + tar), col]].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontFamily: 'Courier New', color: c as string, fontWeight: k === 'Total' ? 'bold' : 'normal' }}>{v}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Cobros albaranes */}
        {(cierre.cobros_albaran_efectivo ?? 0) > 0 && (
          <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(245,166,35,0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>Cobros albaranes efectivo</div>
            <div style={{ fontFamily: 'Courier New', fontSize: '1.1rem', color: 'var(--gold)', fontWeight: 'bold' }}>{fmt(cierre.cobros_albaran_efectivo ?? 0)}</div>
          </div>
        )}

        {/* Datáfonos */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(15,188,179,0.25)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Cierres de datáfonos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', fontSize: '0.9rem' }}>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Datáfono 1</div><div style={{ fontFamily: 'Courier New' }}>{fmt(cierre.datafono1_cierre)}</div></div>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Datáfono 2</div><div style={{ fontFamily: 'Courier New' }}>{fmt(cierre.datafono2_cierre)}</div></div>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total cierre</div><div style={{ fontFamily: 'Courier New', fontWeight: 'bold' }}>{fmt(cierre.total_datafono ?? 0)}</div></div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Diferencia</div>
              <div style={{ fontFamily: 'Courier New', color: diffColor(difDf), fontWeight: 'bold' }}>{diffLabel(difDf)}</div>
            </div>
          </div>
        </div>

        {/* Efectivo contado */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(46,204,113,0.25)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Recuento efectivo</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', fontSize: '0.9rem' }}>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Esperado</div><div style={{ fontFamily: 'Courier New' }}>{fmt(cierre.efectivo_esperado ?? 0)}</div></div>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Contado</div><div style={{ fontFamily: 'Courier New', fontWeight: 'bold' }}>{fmt(cierre.efectivo_contado)}</div></div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Diferencia</div>
              <div style={{ fontFamily: 'Courier New', color: diffColor(difEf), fontWeight: 'bold' }}>{diffLabel(difEf)}</div>
            </div>
          </div>
        </div>

        {/* Pagos */}
        {pagos.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(231,76,60,0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Pagos a proveedores</div>
            {pagos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{p.concepto}</span><span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(p.importe)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '0.5rem' }}>
              <span>Total</span><span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(cierre.pagos_proveedor)}</span>
            </div>
          </div>
        )}

        {/* Totales */}
        {/* Cuadre global */}
        <div style={{ marginBottom: '1rem', background: Math.abs(difGlobal) < 0.01 ? 'rgba(46,204,113,0.08)' : 'rgba(231,76,60,0.08)', border: `1px solid ${Math.abs(difGlobal) < 0.01 ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)'}`, borderRadius: '10px', padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>⚖ Cuadre global (efectivo + datáfonos)</div>
            <div style={{ fontFamily: 'Courier New', fontSize: '1.3rem', fontWeight: 'bold', color: Math.abs(difGlobal) < 0.01 ? 'var(--success)' : 'var(--accent)', marginTop: '0.2rem' }}>
              {Math.abs(difGlobal) < 0.01 ? '✓ CAJA CUADRADA' : difGlobal > 0 ? `▲ Sobran ${fmt(difGlobal)}` : `▼ Faltan ${fmt(Math.abs(difGlobal))}`}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <div>Dif. efectivo: <span style={{ fontFamily: 'Courier New', color: Math.abs(difEf) < 0.01 ? 'var(--success)' : difEf > 0 ? 'var(--teal)' : 'var(--accent)' }}>{difEf > 0 ? '+' : ''}{fmt(difEf)}</span></div>
            <div>Dif. datáfonos: <span style={{ fontFamily: 'Courier New', color: Math.abs(difDf) < 0.01 ? 'var(--success)' : difDf > 0 ? 'var(--teal)' : 'var(--accent)' }}>{difDf > 0 ? '+' : ''}{fmt(difDf)}</span></div>
          </div>
        </div>

        <div className="total-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total ventas efectivo</div><div style={{ fontFamily: 'Courier New', color: 'var(--success)', fontSize: '1.1rem' }}>{fmt(cierre.total_efectivo_ventas ?? 0)}</div></div>
          <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total ventas tarjeta</div><div style={{ fontFamily: 'Courier New', color: 'var(--teal)', fontSize: '1.1rem' }}>{fmt(cierre.total_tarjeta_ventas ?? 0)}</div></div>
          <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total ventas día</div><div style={{ fontFamily: 'Courier New', color: 'var(--gold)', fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(cierre.total_ventas ?? 0)}</div></div>
        </div>
      </div>

      {/* ── TICKET POS80 ── */}
      <div className="pos-ticket print-only">
        <div className="pos-center pos-title">CIERRE DE CAJA</div>
        <div className="pos-center">================================</div>
        <Row label="Fecha:" value={fmtDate(cierre.fecha)} />
        <Row label="Hora:" value={now} />
        <Row label="Turno:" value={cierre.turno.toUpperCase()} />
        {cierre.cerrado_por && <Row label="Empleado:" value={cierre.cerrado_por} />}

        <div className="pos-sep">--------------------------------</div>
        <div className="pos-section">APERTURA</div>
        <Row label="Fondo apertura:" value={fmt(cierre.fondo_apertura)} />

        <div className="pos-sep">--------------------------------</div>
        <div className="pos-section">TPV 1</div>
        <Row label="Efectivo:" value={fmt(cierre.tpv1_efectivo)} />
        <Row label="Tarjeta:" value={fmt(cierre.tpv1_tarjeta)} />
        <Row label="TOTAL TPV1:" value={fmt(cierre.tpv1_efectivo + cierre.tpv1_tarjeta)} bold />

        <div className="pos-sep">--------------------------------</div>
        <div className="pos-section">TPV 2</div>
        <Row label="Efectivo:" value={fmt(cierre.tpv2_efectivo)} />
        <Row label="Tarjeta:" value={fmt(cierre.tpv2_tarjeta)} />
        <Row label="TOTAL TPV2:" value={fmt(cierre.tpv2_efectivo + cierre.tpv2_tarjeta)} bold />

        <div className="pos-sep">--------------------------------</div>
        <div className="pos-section">DATAFONOS</div>
        <Row label="Datafono 1:" value={fmt(cierre.datafono1_cierre)} />
        <Row label="Datafono 2:" value={fmt(cierre.datafono2_cierre)} />
        <Row label="Total cierre:" value={fmt(cierre.total_datafono ?? 0)} bold />
        <Row label="Ventas tarjeta:" value={fmt(cierre.total_tarjeta_ventas ?? 0)} />
        <Row label="Diferencia:" value={diffLabel(difDf)} bold color={diffColor(difDf)} />

        {pagos.length > 0 && <>
          <div className="pos-sep">--------------------------------</div>
          <div className="pos-section">PAGOS PROVEEDORES</div>
          {pagos.map((p, i) => <Row key={i} label={p.concepto + ':'} value={'-' + fmt(p.importe)} />)}
          <Row label="TOTAL PAGOS:" value={'-' + fmt(cierre.pagos_proveedor)} bold />
        </>}

        <div className="pos-sep">--------------------------------</div>
        <div className="pos-section">RECUENTO EFECTIVO</div>
        <Row label="Esperado:" value={fmt(cierre.efectivo_esperado ?? 0)} />
        <Row label="Contado:" value={fmt(cierre.efectivo_contado)} />
        <Row label="Diferencia:" value={diffLabel(difEf)} bold color={diffColor(difEf)} />

        <div className="pos-sep">================================</div>
        {(cierre.cobros_albaran_efectivo ?? 0) > 0 && <>
          <div className="pos-sep">--------------------------------</div>
          <div className="pos-section">COBROS ALBARAN EFECTIVO</div>
          <Row label="Importe:" value={fmt(cierre.cobros_albaran_efectivo ?? 0)} />
        </>}
        <div className="pos-sep">================================</div>
        <Row label="TOTAL VENTAS:" value={fmt(cierre.total_ventas ?? 0)} bold />
        <Row label="  Efectivo:" value={fmt(cierre.total_efectivo_ventas ?? 0)} />
        <Row label="  Tarjeta:" value={fmt(cierre.total_tarjeta_ventas ?? 0)} />

        <div className="pos-sep">================================</div>
        <div className="pos-section">CUADRE GLOBAL</div>
        <Row label="Dif. efectivo:" value={difEf >= 0 ? '+'+fmt(difEf) : fmt(difEf)} color={difEf >= 0 ? '#2ecc71' : '#e74c3c'} />
        <Row label="Dif. datafonos:" value={difDf >= 0 ? '+'+fmt(difDf) : fmt(difDf)} color={difDf >= 0 ? '#2ecc71' : '#e74c3c'} />
        <Row label="RESULTADO:" value={Math.abs(difGlobal) < 0.01 ? 'CUADRADA' : difGlobal > 0 ? 'SOBRAN '+fmt(difGlobal) : 'FALTAN '+fmt(Math.abs(difGlobal))} bold color={Math.abs(difGlobal) < 0.01 ? '#2ecc71' : '#e74c3c'} />
        <div className="pos-sep">================================</div>
        <Row label="Efectivo contado:" value={fmt(cierre.efectivo_contado)} />
        {cierre.retirada_efectivo > 0 && <Row label="Retirada:" value={'-' + fmt(cierre.retirada_efectivo)} />}
        <div className="pos-sep">================================</div>
        <Row label="FONDO MANANA:" value={fmt(cierre.fondo_siguiente_dia ?? 0)} bold />
        <div className="pos-sep">================================</div>

        {cierre.notas && <>
          <div className="pos-section">NOTAS</div>
          <div style={{ fontSize: '10px', wordBreak: 'break-word' }}>{cierre.notas}</div>
          <div className="pos-sep">--------------------------------</div>
        </>}
        <div className="pos-center" style={{ fontSize: '10px', marginTop: '4px' }}>{new Date().toLocaleString('es-ES')}</div>
        <div style={{ marginTop: '24px' }}>&nbsp;</div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0; padding: 0; }
          nav { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
        @media screen { .print-only { display: none; } }
        .pos-ticket { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: white; width: 72mm; padding: 4mm 3mm; line-height: 1.55; }
        .pos-center { text-align: center; }
        .pos-title { font-size: 15px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
        .pos-sep { text-align: center; margin: 2px 0; }
        .pos-section { font-weight: bold; text-decoration: underline; margin: 4px 0 2px; font-size: 11px; }
        .pos-row { display: flex; justify-content: space-between; font-size: 11px; }
      `}</style>
    </>
  )
}

export default function ResumenPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>Cargando…</div>}>
      <ResumenContent />
    </Suspense>
  )
}
