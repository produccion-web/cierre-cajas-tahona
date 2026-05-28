'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, TPV, Turno, PagoProveedor } from '@/lib/supabase'

function fmt(n: number) {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function today() {
  return new Date().toISOString().split('T')[0]
}

interface FormState {
  tpv: TPV
  fecha: string
  turno: Turno
  efectivo_contado: string
  datafono1_importe: string
  datafono2_importe: string
  notas: string
  cerrado_por: string
}

function CierreForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [form, setForm] = useState<FormState>({
    tpv: (params.get('tpv') as TPV) || 'TPV1',
    fecha: today(),
    turno: 'completo',
    efectivo_contado: '',
    datafono1_importe: '',
    datafono2_importe: '',
    notas: '',
    cerrado_por: '',
  })
  const [pagos, setPagos] = useState<Omit<PagoProveedor, 'id' | 'cierre_id' | 'created_at'>[]>([])
  const [nuevoPago, setNuevoPago] = useState({ concepto: '', importe: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalPagos = pagos.reduce((s, p) => s + p.importe, 0)
  const efectivo = parseFloat(form.efectivo_contado) || 0
  const df1 = parseFloat(form.datafono1_importe) || 0
  const df2 = parseFloat(form.datafono2_importe) || 0
  const efectivoNeto = efectivo - totalPagos
  const totalDatafono = df1 + df2
  const totalGeneral = efectivoNeto + totalDatafono

  function set(key: keyof FormState, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function addPago() {
    if (!nuevoPago.concepto.trim()) { setError('El concepto del pago es obligatorio'); return }
    const imp = parseFloat(nuevoPago.importe)
    if (!imp || imp <= 0) { setError('El importe debe ser mayor que 0'); return }
    setPagos(p => [...p, {
      tpv: form.tpv,
      fecha: form.fecha,
      concepto: nuevoPago.concepto.trim(),
      importe: imp,
    }])
    setNuevoPago({ concepto: '', importe: '' })
    setError('')
  }

  function removePago(i: number) {
    setPagos(p => p.filter((_, idx) => idx !== i))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.efectivo_contado) { setError('Introduce el efectivo contado'); return }

    setLoading(true)
    try {
      const { data: cierre, error: err1 } = await supabase
        .from('cierres_caja')
        .insert({
          tpv: form.tpv,
          fecha: form.fecha,
          turno: form.turno,
          efectivo_contado: efectivo,
          pagos_proveedor: totalPagos,
          datafono1_importe: df1,
          datafono2_importe: df2,
          notas: form.notas || null,
          cerrado_por: form.cerrado_por || null,
        })
        .select()
        .single()

      if (err1) throw err1

      if (pagos.length > 0 && cierre) {
        const { error: err2 } = await supabase
          .from('pagos_proveedor')
          .insert(pagos.map(p => ({ ...p, cierre_id: cierre.id })))
        if (err2) throw err2
      }

      router.push('/?success=1')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError(`Ya existe un cierre para ${form.tpv} en turno ${form.turno} el ${form.fecha}`)
      } else {
        setError('Error al guardar: ' + msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Registro
        </p>
        <h1 style={{ fontSize: '1.8rem' }}>Nuevo cierre de caja</h1>
      </div>

      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Columna izquierda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="card">
              <h2 style={{ marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Datos del cierre
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label>TPV</label>
                  <select value={form.tpv} onChange={e => set('tpv', e.target.value)}>
                    <option value="TPV1">TPV1</option>
                    <option value="TPV2">TPV2</option>
                  </select>
                </div>
                <div>
                  <label>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
                <div>
                  <label>Turno</label>
                  <select value={form.turno} onChange={e => set('turno', e.target.value as Turno)}>
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="completo">Completo</option>
                  </select>
                </div>
                <div>
                  <label>Cerrado por (opcional)</label>
                  <input type="text" placeholder="Nombre del empleado" value={form.cerrado_por}
                    onChange={e => set('cerrado_por', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Datáfonos
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                Introduce el importe total de cada datáfono (compartidos entre cajas)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label>Datáfono 1 (€)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.datafono1_importe} onChange={e => set('datafono1_importe', e.target.value)} />
                </div>
                <div>
                  <label>Datáfono 2 (€)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.datafono2_importe} onChange={e => set('datafono2_importe', e.target.value)} />
                </div>
                <div style={{ background: 'rgba(15,188,179,0.07)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontFamily: 'Courier New', fontSize: '0.9rem' }}>
                  Total datáfonos: <strong style={{ color: 'var(--teal)' }}>{fmt(totalDatafono)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="card">
              <h2 style={{ marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Efectivo
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label>Efectivo contado en caja (€)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" required
                    value={form.efectivo_contado} onChange={e => set('efectivo_contado', e.target.value)} />
                </div>
                {totalPagos > 0 && (
                  <div style={{ background: 'rgba(231,76,60,0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontFamily: 'Courier New', fontSize: '0.9rem', border: '1px solid rgba(231,76,60,0.2)' }}>
                    − Pagos proveedor: <strong style={{ color: 'var(--accent)' }}>{fmt(totalPagos)}</strong>
                  </div>
                )}
                <div style={{ background: 'rgba(46,204,113,0.07)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontFamily: 'Courier New', fontSize: '0.9rem' }}>
                  Efectivo neto: <strong style={{ color: 'var(--success)' }}>{fmt(efectivoNeto)}</strong>
                </div>
              </div>
            </div>

            {/* Pagos a proveedores */}
            <div className="card">
              <h2 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Pagos a proveedores en efectivo
              </h2>

              {pagos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.2)',
                  borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                  <span>{p.concepto}</span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(p.importe)}</span>
                    <button type="button" onClick={() => removePago(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <input type="text" placeholder="Concepto del pago"
                    value={nuevoPago.concepto} onChange={e => setNuevoPago(n => ({ ...n, concepto: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPago())} />
                </div>
                <div style={{ width: '110px' }}>
                  <input type="number" step="0.01" min="0" placeholder="€"
                    value={nuevoPago.importe} onChange={e => setNuevoPago(n => ({ ...n, importe: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPago())} />
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addPago}
                  style={{ whiteSpace: 'nowrap' }}>+ Añadir</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <label>Notas (opcional)</label>
          <textarea rows={2} placeholder="Observaciones del cierre…"
            value={form.notas} onChange={e => set('notas', e.target.value)}
            style={{ resize: 'vertical' }} />
        </div>

        {/* Resumen total */}
        <div className="total-row" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Efectivo contado</div>
            <div style={{ fontFamily: 'Courier New', color: 'var(--text)' }}>{fmt(efectivo)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>− Pagos proveedor</div>
            <div style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(totalPagos)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>+ Datáfonos</div>
            <div style={{ fontFamily: 'Courier New', color: 'var(--teal)' }}>{fmt(totalDatafono)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>= Total caja</div>
            <div style={{ fontFamily: 'Courier New', fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--gold)' }}>{fmt(totalGeneral)}</div>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)',
            borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ff8a80', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '180px' }}>
            {loading ? 'Guardando…' : '✓ Guardar cierre'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/')}>
            Cancelar
          </button>
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
