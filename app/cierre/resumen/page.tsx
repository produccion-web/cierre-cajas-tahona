'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, CierreCaja, PagoProveedor } from '@/lib/supabase'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}
function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
      setCierre(c)
      setPagos(p || [])
      setLoading(false)
    }
    load()
  }, [id])

  function handlePrint() {
    window.print()
  }

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: '3rem', textAlign: 'center' }}>Cargando…</p>
  if (!cierre) return <p style={{ color: 'var(--accent)', padding: '3rem', textAlign: 'center' }}>No se encontró el cierre</p>

  const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Pantalla normal */}
      <div className="fade-in no-print">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cierre guardado</p>
            <h1 style={{ fontSize: '1.8rem' }}>Resumen del cierre</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-teal" onClick={handlePrint}>🖨 Imprimir ticket POS80</button>
            <button className="btn btn-secondary" onClick={() => router.push('/')}>Volver al inicio</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Info general</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Fecha</span><span>{fmtDate(cierre.fecha)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Turno</span><span className={`badge badge-${cierre.turno}`}>{cierre.turno}</span></div>
              {cierre.cerrado_por && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Cerrado por</span><span>{cierre.cerrado_por}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Fondo apertura</span><span style={{ fontFamily: 'Courier New', color: 'var(--gold)' }}>{fmt(cierre.fondo_apertura)}</span></div>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'rgba(15,188,179,0.3)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Fondo día siguiente</div>
            <div style={{ fontSize: '2.2rem', fontFamily: 'Courier New', fontWeight: 'bold', color: 'var(--teal)' }}>{fmt(cierre.fondo_siguiente_dia ?? 0)}</div>
            {cierre.retirada_efectivo > 0 && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Retirada: <span style={{ color: 'var(--accent)', fontFamily: 'Courier New' }}>{fmt(cierre.retirada_efectivo)}</span></div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card">
            <div style={{ fontSize: '0.78rem', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>TPV 1</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Efectivo</span><span style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(cierre.tpv1_efectivo)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Tarjeta</span><span style={{ fontFamily: 'Courier New', color: 'var(--teal)' }}>{fmt(cierre.tpv1_tarjeta)}</span></div>
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>Total TPV1</span><span style={{ fontFamily: 'Courier New' }}>{fmt(cierre.tpv1_efectivo + cierre.tpv1_tarjeta)}</span></div>
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.78rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>TPV 2</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Efectivo</span><span style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(cierre.tpv2_efectivo)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Tarjeta</span><span style={{ fontFamily: 'Courier New', color: 'var(--gold)' }}>{fmt(cierre.tpv2_tarjeta)}</span></div>
              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>Total TPV2</span><span style={{ fontFamily: 'Courier New' }}>{fmt(cierre.tpv2_efectivo + cierre.tpv2_tarjeta)}</span></div>
            </div>
          </div>
        </div>

        {pagos.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(231,76,60,0.25)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent-soft)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Pagos a proveedores</div>
            {pagos.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                <span>{p.concepto}</span>
                <span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(p.importe)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '0.5rem' }}>
              <span>Total pagos</span>
              <span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(cierre.pagos_proveedor)}</span>
            </div>
          </div>
        )}

        <div className="total-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total ventas efectivo</div>
            <div style={{ fontFamily: 'Courier New', color: 'var(--success)', fontSize: '1.1rem' }}>{fmt(cierre.total_efectivo_ventas ?? 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total ventas tarjeta</div>
            <div style={{ fontFamily: 'Courier New', color: 'var(--teal)', fontSize: '1.1rem' }}>{fmt(cierre.total_tarjeta ?? 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total ventas día</div>
            <div style={{ fontFamily: 'Courier New', color: 'var(--gold)', fontSize: '1.5rem', fontWeight: 'bold' }}>{fmt(cierre.total_ventas ?? 0)}</div>
          </div>
        </div>
      </div>

      {/* ── TICKET POS80 (solo al imprimir) ── */}
      <div className="pos-ticket print-only">
        <div className="pos-center pos-title">CIERRE DE CAJA</div>
        <div className="pos-center pos-sub">================================</div>
        <div className="pos-row"><span>Fecha:</span><span>{fmtDate(cierre.fecha)}</span></div>
        <div className="pos-row"><span>Hora:</span><span>{now}</span></div>
        <div className="pos-row"><span>Turno:</span><span>{cierre.turno.toUpperCase()}</span></div>
        {cierre.cerrado_por && <div className="pos-row"><span>Empleado:</span><span>{cierre.cerrado_por}</span></div>}
        <div className="pos-sep">--------------------------------</div>

        <div className="pos-section">APERTURA</div>
        <div className="pos-row"><span>Fondo apertura:</span><span>{fmt(cierre.fondo_apertura)}</span></div>

        <div className="pos-sep">--------------------------------</div>
        <div className="pos-section">TPV 1</div>
        <div className="pos-row"><span>Efectivo:</span><span>{fmt(cierre.tpv1_efectivo)}</span></div>
        <div className="pos-row"><span>Tarjeta:</span><span>{fmt(cierre.tpv1_tarjeta)}</span></div>
        <div className="pos-row pos-bold"><span>TOTAL TPV1:</span><span>{fmt(cierre.tpv1_efectivo + cierre.tpv1_tarjeta)}</span></div>

        <div className="pos-sep">--------------------------------</div>
        <div className="pos-section">TPV 2</div>
        <div className="pos-row"><span>Efectivo:</span><span>{fmt(cierre.tpv2_efectivo)}</span></div>
        <div className="pos-row"><span>Tarjeta:</span><span>{fmt(cierre.tpv2_tarjeta)}</span></div>
        <div className="pos-row pos-bold"><span>TOTAL TPV2:</span><span>{fmt(cierre.tpv2_efectivo + cierre.tpv2_tarjeta)}</span></div>

        {pagos.length > 0 && <>
          <div className="pos-sep">--------------------------------</div>
          <div className="pos-section">PAGOS PROVEEDORES</div>
          {pagos.map((p, i) => (
            <div key={i} className="pos-row"><span>{p.concepto}:</span><span>-{fmt(p.importe)}</span></div>
          ))}
          <div className="pos-row pos-bold"><span>TOTAL PAGOS:</span><span>-{fmt(cierre.pagos_proveedor)}</span></div>
        </>}

        <div className="pos-sep">================================</div>
        <div className="pos-row pos-big"><span>TOTAL VENTAS:</span><span>{fmt(cierre.total_ventas ?? 0)}</span></div>
        <div className="pos-row"><span>  Efectivo ventas:</span><span>{fmt(cierre.total_efectivo_ventas ?? 0)}</span></div>
        <div className="pos-row"><span>  Tarjeta:</span><span>{fmt(cierre.total_tarjeta ?? 0)}</span></div>

        <div className="pos-sep">================================</div>
        <div className="pos-section">EFECTIVO EN CAJA</div>
        <div className="pos-row"><span>Fondo apertura:</span><span>{fmt(cierre.fondo_apertura)}</span></div>
        <div className="pos-row"><span>+ Ventas efectivo:</span><span>{fmt(cierre.total_efectivo_ventas ?? 0)}</span></div>
        <div className="pos-row"><span>- Pagos proveed.:</span><span>{fmt(cierre.pagos_proveedor)}</span></div>
        <div className="pos-row pos-bold"><span>EFECTIVO EN CAJA:</span><span>{fmt(cierre.efectivo_en_caja ?? 0)}</span></div>

        {cierre.retirada_efectivo > 0 && <>
          <div className="pos-sep">--------------------------------</div>
          <div className="pos-row"><span>Retirada:</span><span>-{fmt(cierre.retirada_efectivo)}</span></div>
        </>}

        <div className="pos-sep">================================</div>
        <div className="pos-row pos-big"><span>FONDO MANANA:</span><span>{fmt(cierre.fondo_siguiente_dia ?? 0)}</span></div>
        <div className="pos-sep">================================</div>

        {cierre.notas && <>
          <div className="pos-section">NOTAS</div>
          <div style={{ fontSize: '11px', wordBreak: 'break-word' }}>{cierre.notas}</div>
          <div className="pos-sep">--------------------------------</div>
        </>}

        <div className="pos-center" style={{ fontSize: '10px', marginTop: '4px' }}>
          {new Date().toLocaleString('es-ES')}
        </div>
        <div style={{ marginTop: '20px' }}>&nbsp;</div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0; padding: 0; }
          nav { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
        .pos-ticket {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #000;
          background: white;
          width: 72mm;
          padding: 4mm 3mm;
          line-height: 1.5;
        }
        .pos-center { text-align: center; }
        .pos-title { font-size: 15px; font-weight: bold; letter-spacing: 1px; }
        .pos-sub { font-size: 10px; color: #555; }
        .pos-sep { text-align: center; margin: 2px 0; color: #333; }
        .pos-section { font-weight: bold; text-decoration: underline; margin: 4px 0 2px; font-size: 11px; }
        .pos-row { display: flex; justify-content: space-between; font-size: 11px; }
        .pos-bold { font-weight: bold; }
        .pos-big { font-weight: bold; font-size: 13px; }
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
