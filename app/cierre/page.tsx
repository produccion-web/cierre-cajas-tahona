'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, Turno, PagoProveedor } from '@/lib/supabase'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}
function today() { return new Date().toISOString().split('T')[0] }

function n(s: string) { return parseFloat(s) || 0 }

function CierreForm() {
  const router = useRouter()
  const params = useSearchParams()

  const [form, setForm] = useState({
    fecha: today(),
    turno: 'completo' as Turno,
    cerrado_por: '',
    notas: '',
    fondo_apertura: '',
    tpv1_efectivo: '',
    tpv1_tarjeta: '',
    tpv2_efectivo: '',
    tpv2_tarjeta: '',
    retirada_efectivo: '',
  })
  const [pagos, setPagos] = useState<{ concepto: string; importe: number }[]>([])
  const [nuevoPago, setNuevoPago] = useState({ concepto: '', importe: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  // Cálculos en tiempo real
  const fondoApertura = n(form.fondo_apertura)
  const tpv1Ef = n(form.tpv1_efectivo)
  const tpv1Tar = n(form.tpv1_tarjeta)
  const tpv2Ef = n(form.tpv2_efectivo)
  const tpv2Tar = n(form.tpv2_tarjeta)
  const totalPagos = pagos.reduce((s, p) => s + p.importe, 0)
  const retirada = n(form.retirada_efectivo)

  const totalEfVentas = tpv1Ef + tpv2Ef
  const totalTarjeta = tpv1Tar + tpv2Tar
  const totalVentas = totalEfVentas + totalTarjeta
  const efectivoEnCaja = fondoApertura + totalEfVentas - totalPagos
  const fondoSiguiente = efectivoEnCaja - retirada

  function addPago() {
    if (!nuevoPago.concepto.trim()) { setError('El concepto es obligatorio'); return }
    const imp = parseFloat(nuevoPago.importe)
    if (!imp || imp <= 0) { setError('Importe inválido'); return }
    setPagos(p => [...p, { concepto: nuevoPago.concepto.trim(), importe: imp }])
    setNuevoPago({ concepto: '', importe: '' })
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: cierre, error: err1 } = await supabase
        .from('cierres_caja')
        .insert({
          fecha: form.fecha,
          turno: form.turno,
          fondo_apertura: fondoApertura,
          tpv1_efectivo: tpv1Ef,
          tpv1_tarjeta: tpv1Tar,
          tpv2_efectivo: tpv2Ef,
          tpv2_tarjeta: tpv2Tar,
          pagos_proveedor: totalPagos,
          retirada_efectivo: retirada,
          notas: form.notas || null,
          cerrado_por: form.cerrado_por || null,
        })
        .select().single()

      if (err1) throw err1

      if (pagos.length > 0 && cierre) {
        const { error: err2 } = await supabase.from('pagos_proveedor').insert(
          pagos.map(p => ({ cierre_id: cierre.id, fecha: form.fecha, concepto: p.concepto, importe: p.importe }))
        )
        if (err2) throw err2
      }

      router.push(`/cierre/resumen?id=${cierre.id}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError(`Ya existe un cierre para el turno "${form.turno}" el ${form.fecha}`)
      } else {
        setError('Error al guardar: ' + msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '0.35rem' }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.8rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Registro</p>
        <h1 style={{ fontSize: '1.8rem' }}>Nuevo cierre de caja</h1>
      </div>

      <form onSubmit={submit}>
        {/* ── Datos generales ── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Datos generales
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '0.9rem' }}>
            <div style={fieldStyle}><label>Fecha</label><input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} /></div>
            <div style={fieldStyle}>
              <label>Turno</label>
              <select value={form.turno} onChange={e => set('turno', e.target.value as Turno)}>
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="completo">Completo (día entero)</option>
              </select>
            </div>
            <div style={fieldStyle}><label>Cerrado por</label><input type="text" placeholder="Empleado" value={form.cerrado_por} onChange={e => set('cerrado_por', e.target.value)} /></div>
          </div>
        </div>

        {/* ── Fondo de apertura ── */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(245,166,35,0.25)' }}>
          <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
            Fondo de apertura
          </h2>
          <div style={{ maxWidth: '240px' }}>
            <div style={fieldStyle}>
              <label>Efectivo inicial en caja (€)</label>
              <input type="number" step="0.01" min="0" placeholder="0.00" required
                value={form.fondo_apertura} onChange={e => set('fondo_apertura', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── TPVs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* TPV1 */}
          <div className="card" style={{ borderColor: 'rgba(15,188,179,0.25)' }}>
            <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '0.9rem' }}>
              TPV 1
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={fieldStyle}><label>Ventas efectivo (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.tpv1_efectivo} onChange={e => set('tpv1_efectivo', e.target.value)} /></div>
              <div style={fieldStyle}><label>Ventas tarjeta (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.tpv1_tarjeta} onChange={e => set('tpv1_tarjeta', e.target.value)} /></div>
              <div style={{ background: 'rgba(15,188,179,0.07)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Courier New' }}>
                Total TPV1: <strong style={{ color: 'var(--teal)' }}>{fmt(tpv1Ef + tpv1Tar)}</strong>
              </div>
            </div>
          </div>

          {/* TPV2 */}
          <div className="card" style={{ borderColor: 'rgba(245,166,35,0.25)' }}>
            <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '0.9rem' }}>
              TPV 2
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={fieldStyle}><label>Ventas efectivo (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.tpv2_efectivo} onChange={e => set('tpv2_efectivo', e.target.value)} /></div>
              <div style={fieldStyle}><label>Ventas tarjeta (€)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.tpv2_tarjeta} onChange={e => set('tpv2_tarjeta', e.target.value)} /></div>
              <div style={{ background: 'rgba(245,166,35,0.07)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontFamily: 'Courier New' }}>
                Total TPV2: <strong style={{ color: 'var(--gold)' }}>{fmt(tpv2Ef + tpv2Tar)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pagos proveedores ── */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(231,76,60,0.2)' }}>
          <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--accent-soft)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
            Pagos a proveedores en efectivo
          </h2>
          {pagos.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.2)',
              borderRadius: '6px', padding: '0.45rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
              <span>{p.concepto}</span>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(p.importe)}</span>
                <button type="button" onClick={() => setPagos(ps => ps.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="text" placeholder="Concepto" value={nuevoPago.concepto}
              onChange={e => setNuevoPago(n => ({ ...n, concepto: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPago())}
              style={{ flex: 1 }} />
            <input type="number" step="0.01" min="0" placeholder="€" value={nuevoPago.importe}
              onChange={e => setNuevoPago(n => ({ ...n, importe: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPago())}
              style={{ width: '110px' }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addPago}>+ Añadir</button>
          </div>
        </div>

        {/* ── Retirada ── */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(233,69,96,0.25)' }}>
          <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--accent-soft)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
            Retirada de efectivo
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem', alignItems: 'end' }}>
            <div style={fieldStyle}>
              <label>Importe a retirar (€)</label>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                value={form.retirada_efectivo} onChange={e => set('retirada_efectivo', e.target.value)} />
            </div>
            <div style={{ background: 'rgba(15,188,179,0.08)', border: '1px solid rgba(15,188,179,0.25)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fondo para mañana</div>
              <div style={{ fontSize: '1.5rem', fontFamily: 'Courier New', fontWeight: 'bold', color: fondoSiguiente >= 0 ? 'var(--teal)' : 'var(--accent)' }}>
                {fmt(fondoSiguiente)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Notas ── */}
        <div className="card" style={{ marginBottom: '1.2rem' }}>
          <label>Notas (opcional)</label>
          <textarea rows={2} placeholder="Observaciones…" value={form.notas} onChange={e => set('notas', e.target.value)} style={{ resize: 'vertical' }} />
        </div>

        {/* ── Resumen final ── */}
        <div style={{ background: 'rgba(15,188,179,0.06)', border: '1px solid rgba(15,188,179,0.2)', borderRadius: '10px', padding: '1.2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ventas efectivo</div>
              <div style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(totalEfVentas)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ventas tarjeta</div>
              <div style={{ fontFamily: 'Courier New', color: 'var(--teal)' }}>{fmt(totalTarjeta)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total ventas</div>
              <div style={{ fontFamily: 'Courier New', fontWeight: 'bold', color: 'var(--gold)' }}>{fmt(totalVentas)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fondo apertura</div>
              <div style={{ fontFamily: 'Courier New' }}>{fmt(fondoApertura)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>− Pagos prov.</div>
              <div style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(totalPagos)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Efectivo en caja</div>
              <div style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(efectivoEnCaja)}</div>
            </div>
          </div>
          <hr className="divider" style={{ margin: '0.6rem 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fondo día siguiente</div>
              <div style={{ fontFamily: 'Courier New', fontSize: '1.6rem', fontWeight: 'bold', color: fondoSiguiente >= 0 ? 'var(--teal)' : 'var(--accent)' }}>
                {fmt(fondoSiguiente)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Retirada</div>
              <div style={{ fontFamily: 'Courier New', fontSize: '1.1rem', color: 'var(--accent-soft)' }}>{fmt(retirada)}</div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ff8a80', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '180px', justifyContent: 'center' }}>
            {loading ? 'Guardando…' : '✓ Guardar cierre'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/')}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}

export default function CierrePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Cargando…</div>}>
      <CierreForm />
    </Suspense>
  )
}
