'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Turno } from '@/lib/supabase'

function fmt(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) }
function today() { return new Date().toISOString().split('T')[0] }
function n(s: string) { return parseFloat(s) || 0 }

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: '1rem', borderColor: color + '44' }}>
      <h2 style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color, textTransform: 'uppercase', marginBottom: '1rem' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ marginBottom: 0 }}>{label}</label>
      {children}
    </div>
  )
}

function NumInput({ value, onChange, placeholder = '0.00' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number" step="any" min="0"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault() }}
      onWheel={e => (e.target as HTMLInputElement).blur()}
      style={{ appearance: 'textfield', MozAppearance: 'textfield', WebkitAppearance: 'none' } as React.CSSProperties}
    />
  )
}

function CierreForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    fecha: today(), turno: 'completo' as Turno,
    cerrado_por: '', notas: '',
    fondo_apertura: '',
    tpv1_efectivo: '', tpv1_tarjeta: '',
    tpv2_efectivo: '', tpv2_tarjeta: '',
    datafono1_cierre: '', datafono2_cierre: '',
    efectivo_contado: '',
    cobros_albaran_efectivo: '',
    retirada_efectivo: '',
  })
  const [fondoOrigen, setFondoOrigen] = useState('')
  const [pagos, setPagos] = useState<{ concepto: string; importe: number }[]>([])
  const [nuevoPago, setNuevoPago] = useState({ concepto: '', importe: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function cargarFondo() {
      const { data } = await supabase
        .from('cierres_caja')
        .select('fecha, fondo_siguiente_dia')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data && data.fondo_siguiente_dia != null) {
        setForm(f => ({ ...f, fondo_apertura: data.fondo_siguiente_dia.toString() }))
        setFondoOrigen(`Arrastrado del cierre del ${new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`)
      }
    }
    cargarFondo()
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const fondoApertura  = n(form.fondo_apertura)
  const tpv1Ef = n(form.tpv1_efectivo);  const tpv1Tar = n(form.tpv1_tarjeta)
  const tpv2Ef = n(form.tpv2_efectivo);  const tpv2Tar = n(form.tpv2_tarjeta)
  const df1    = n(form.datafono1_cierre); const df2 = n(form.datafono2_cierre)
  const efContado      = n(form.efectivo_contado)
  const cobrosAlbaran  = n(form.cobros_albaran_efectivo)
  const totalPagos     = pagos.reduce((s, p) => s + p.importe, 0)
  const retirada       = n(form.retirada_efectivo)

  const totalEfVentas  = tpv1Ef + tpv2Ef
  const totalTarVentas = tpv1Tar + tpv2Tar
  const totalVentas    = totalEfVentas + totalTarVentas
  const totalDatafono  = df1 + df2
  const efEsperado     = fondoApertura + totalEfVentas + cobrosAlbaran - totalPagos
  const fondoSiguiente = efContado - retirada

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
    if (form.efectivo_contado === '') { setError('El efectivo contado es obligatorio.'); return }
    if (form.retirada_efectivo === '') { setError('El importe de la retirada es obligatorio. Introduce 0 si no hay retirada.'); return }
    setLoading(true)
    try {
      const { data: cierre, error: err1 } = await supabase
        .from('cierres_caja')
        .insert({
          fecha: form.fecha, turno: form.turno,
          fondo_apertura: fondoApertura,
          tpv1_efectivo: tpv1Ef, tpv1_tarjeta: tpv1Tar,
          tpv2_efectivo: tpv2Ef, tpv2_tarjeta: tpv2Tar,
          datafono1_cierre: df1, datafono2_cierre: df2,
          efectivo_contado: efContado,
          cobros_albaran_efectivo: cobrosAlbaran,
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
      setError(msg.includes('unique') || msg.includes('duplicate')
        ? `Ya existe un cierre para el turno "${form.turno}" el ${form.fecha}`
        : 'Error al guardar: ' + msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.8rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Registro</p>
        <h1 style={{ fontSize: '1.8rem' }}>Nuevo cierre de caja</h1>
      </div>

      <form onSubmit={submit} onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault() }}>

        {/* Datos generales */}
        <Section title="Datos generales" color="var(--text-muted)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px,1fr))', gap: '0.9rem' }}>
            <Field label="Fecha"><input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} /></Field>
            <Field label="Turno">
              <select value={form.turno} onChange={e => set('turno', e.target.value as Turno)}>
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="completo">Día completo</option>
              </select>
            </Field>
            <Field label="Cerrado por"><input type="text" placeholder="Empleado" value={form.cerrado_por} onChange={e => set('cerrado_por', e.target.value)} /></Field>
          </div>
        </Section>

        {/* Fondo apertura */}
        <Section title="Fondo de apertura" color="var(--gold)">
          <div style={{ maxWidth: '280px' }}>
            <Field label="Efectivo inicial en caja (€)">
              <NumInput value={form.fondo_apertura} onChange={v => { set('fondo_apertura', v); setFondoOrigen('') }} />
            </Field>
            {fondoOrigen && (
              <div style={{ fontSize: '0.75rem', color: 'var(--teal)', marginTop: '0.35rem' }}>↺ {fondoOrigen}</div>
            )}
          </div>
        </Section>

        {/* TPVs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div className="card" style={{ borderColor: 'rgba(15,188,179,0.3)' }}>
            <h2 style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '1rem' }}>TPV 1 — Ventas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Field label="Ventas efectivo (€)"><NumInput value={form.tpv1_efectivo} onChange={v => set('tpv1_efectivo', v)} /></Field>
              <Field label="Ventas tarjeta (€)"><NumInput value={form.tpv1_tarjeta} onChange={v => set('tpv1_tarjeta', v)} /></Field>
              <div style={{ background: 'rgba(15,188,179,0.07)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontFamily: 'Courier New', fontSize: '0.88rem' }}>
                Total TPV1: <strong style={{ color: 'var(--teal)' }}>{fmt(tpv1Ef + tpv1Tar)}</strong>
              </div>
            </div>
          </div>
          <div className="card" style={{ borderColor: 'rgba(245,166,35,0.3)' }}>
            <h2 style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: '1rem' }}>TPV 2 — Ventas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Field label="Ventas efectivo (€)"><NumInput value={form.tpv2_efectivo} onChange={v => set('tpv2_efectivo', v)} /></Field>
              <Field label="Ventas tarjeta (€)"><NumInput value={form.tpv2_tarjeta} onChange={v => set('tpv2_tarjeta', v)} /></Field>
              <div style={{ background: 'rgba(245,166,35,0.07)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontFamily: 'Courier New', fontSize: '0.88rem' }}>
                Total TPV2: <strong style={{ color: 'var(--gold)' }}>{fmt(tpv2Ef + tpv2Tar)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Datáfonos */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(15,188,179,0.25)' }}>
          <h2 style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '1rem' }}>Cierres de datáfonos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
            <Field label="Datáfono 1 — importe cierre (€)"><NumInput value={form.datafono1_cierre} onChange={v => set('datafono1_cierre', v)} /></Field>
            <Field label="Datáfono 2 — importe cierre (€)"><NumInput value={form.datafono2_cierre} onChange={v => set('datafono2_cierre', v)} /></Field>
            <div style={{ background: 'rgba(15,188,179,0.07)', borderRadius: '6px', padding: '0.55rem 0.85rem', fontFamily: 'Courier New', fontSize: '0.9rem' }}>
              Total cierre: <strong style={{ color: 'var(--teal)' }}>{fmt(totalDatafono)}</strong>
            </div>
          </div>
        </div>

        {/* Pagos proveedores */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(231,76,60,0.2)' }}>
          <h2 style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--accent-soft)', textTransform: 'uppercase', marginBottom: '0.8rem' }}>Pagos a proveedores en efectivo</h2>
          {pagos.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.2)',
              borderRadius: '6px', padding: '0.4rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
              <span>{p.concepto}</span>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(p.importe)}</span>
                <button type="button" onClick={() => setPagos(ps => ps.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input type="text" placeholder="Concepto del pago" value={nuevoPago.concepto}
              onChange={e => setNuevoPago(n => ({ ...n, concepto: e.target.value }))}
              style={{ flex: 1 }} />
            <NumInput value={nuevoPago.importe} onChange={v => setNuevoPago(n => ({ ...n, importe: v }))} placeholder="€" />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addPago}>+ Añadir</button>
          </div>
          {totalPagos > 0 && (
            <div style={{ textAlign: 'right', marginTop: '0.5rem', fontFamily: 'Courier New', fontSize: '0.88rem', color: 'var(--accent)' }}>
              Total: {fmt(totalPagos)}
            </div>
          )}
        </div>

        {/* Albaranes */}
        <Section title="Cobros de albaranes en efectivo" color="var(--gold)">
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>Dinero cobrado en efectivo de albaranes (no registrado en TPV)</p>
          <div style={{ maxWidth: '220px' }}>
            <Field label="Importe cobrado (€)"><NumInput value={form.cobros_albaran_efectivo} onChange={v => set('cobros_albaran_efectivo', v)} /></Field>
          </div>
        </Section>

        {/* Recuento efectivo */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(46,204,113,0.3)' }}>
          <h2 style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--success)', textTransform: 'uppercase', marginBottom: '1rem' }}>Recuento de efectivo al cierre</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
            <Field label="Efectivo contado en caja (€)">
              <NumInput value={form.efectivo_contado} onChange={v => set('efectivo_contado', v)} />
            </Field>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Efectivo esperado</div>
              <div style={{ fontFamily: 'Courier New', fontSize: '1rem', color: 'var(--text-muted)', padding: '0.55rem 0.85rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {fmt(efEsperado)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                {fmt(fondoApertura)} + {fmt(totalEfVentas)}{cobrosAlbaran > 0 ? ` + ${fmt(cobrosAlbaran)}` : ''} − {fmt(totalPagos)}
              </div>
            </div>
          </div>
        </div>

        {/* Retirada */}
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'rgba(233,69,96,0.25)' }}>
          <h2 style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color: 'var(--accent-soft)', textTransform: 'uppercase', marginBottom: '1rem' }}>Retirada de efectivo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'end' }}>
            <Field label="Importe a retirar (€)"><NumInput value={form.retirada_efectivo} onChange={v => set('retirada_efectivo', v)} /></Field>
            <div style={{ background: 'rgba(15,188,179,0.08)', border: '1px solid rgba(15,188,179,0.25)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fondo para mañana</div>
              <div style={{ fontSize: '1.5rem', fontFamily: 'Courier New', fontWeight: 'bold', color: fondoSiguiente >= 0 ? 'var(--teal)' : 'var(--accent)' }}>
                {fmt(fondoSiguiente)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {fmt(efContado)} contado − {fmt(retirada)} retirada
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="card" style={{ marginBottom: '1.2rem' }}>
          <label>Notas (opcional)</label>
          <textarea rows={2} placeholder="Observaciones…" value={form.notas} onChange={e => set('notas', e.target.value)} style={{ resize: 'vertical' }} />
        </div>

        {/* Resumen */}
        <div style={{ background: 'rgba(15,188,179,0.05)', border: '1px solid rgba(15,188,179,0.2)', borderRadius: '10px', padding: '1.2rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.8rem' }}>Resumen del cierre</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '0.75rem' }}>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ventas efectivo</div><div style={{ fontFamily: 'Courier New', color: 'var(--success)' }}>{fmt(totalEfVentas)}</div></div>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ventas tarjeta</div><div style={{ fontFamily: 'Courier New', color: 'var(--teal)' }}>{fmt(totalTarVentas)}</div></div>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total ventas</div><div style={{ fontFamily: 'Courier New', color: 'var(--gold)', fontWeight: 'bold' }}>{fmt(totalVentas)}</div></div>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pagos prov.</div><div style={{ fontFamily: 'Courier New', color: 'var(--accent)' }}>{fmt(totalPagos)}</div></div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.6rem 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Efectivo contado</div><div style={{ fontFamily: 'Courier New', color: 'var(--success)', fontSize: '1.1rem' }}>{fmt(efContado)}</div></div>
            <div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fondo mañana</div><div style={{ fontFamily: 'Courier New', fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--teal)' }}>{fmt(fondoSiguiente)}</div></div>
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
