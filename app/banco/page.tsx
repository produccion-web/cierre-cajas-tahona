'use client'
import { useEffect, useState } from 'react'
import { supabase, IngresoBanco } from '@/lib/supabase'

function fmt(n: number) { return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) }
function today() { return new Date().toISOString().split('T')[0] }
function fmtDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function BancoPage() {
  const [ingresos, setIngresos] = useState<IngresoBanco[]>([])
  const [totalRetirado, setTotalRetirado] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fecha: today(), importe: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    // Total retirado en todos los cierres
    const { data: cierres } = await supabase
      .from('cierres_caja')
      .select('retirada_efectivo')
    const totalRet = (cierres || []).reduce((s, c) => s + (c.retirada_efectivo || 0), 0)
    setTotalRetirado(totalRet)

    // Ingresos en banco registrados
    const { data: ing } = await supabase
      .from('ingresos_banco')
      .select('*')
      .order('fecha', { ascending: false })
    setIngresos(ing || [])
    setLoading(false)
  }

  const totalIngresado = ingresos.reduce((s, i) => s + i.importe, 0)
  const pendiente = totalRetirado - totalIngresado

  async function guardarIngreso(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const imp = parseFloat(form.importe)
    if (!imp || imp <= 0) { setError('El importe es obligatorio'); return }
    if (imp > pendiente + 0.001) { setError(`No puedes ingresar más de lo pendiente (${fmt(pendiente)})`); return }
    setSaving(true)
    const { error: err } = await supabase.from('ingresos_banco').insert({
      fecha: form.fecha,
      importe: imp,
      notas: form.notas || null,
    })
    if (err) { setError('Error al guardar: ' + err.message); setSaving(false); return }
    setForm({ fecha: today(), importe: '', notas: '' })
    setShowForm(false)
    await loadData()
    setSaving(false)
  }

  async function deleteIngreso(id: string) {
    if (!confirm('¿Eliminar este ingreso?')) return
    await supabase.from('ingresos_banco').delete().eq('id', id)
    setIngresos(i => i.filter(x => x.id !== id))
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.8rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Gestión</p>
        <h1 style={{ fontSize: '1.8rem' }}>Ingresos en banco</h1>
      </div>

      {/* Resumen saldo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--accent-soft)' }}>{fmt(totalRetirado)}</div>
          <div className="stat-label">Total retirado</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--teal)' }}>{fmt(totalIngresado)}</div>
          <div className="stat-label">Ya ingresado</div>
        </div>
        <div className="stat-box" style={{
          background: pendiente > 0 ? 'rgba(245,166,35,0.08)' : 'rgba(46,204,113,0.08)',
          border: `1px solid ${pendiente > 0 ? 'rgba(245,166,35,0.3)' : 'rgba(46,204,113,0.3)'}`,
        }}>
          <div className="stat-value" style={{ color: pendiente > 0 ? 'var(--gold)' : 'var(--success)', fontSize: '1.8rem' }}>
            {fmt(pendiente)}
          </div>
          <div className="stat-label">{pendiente > 0 ? 'Pendiente de ingresar' : '✓ Todo ingresado'}</div>
        </div>
      </div>

      {/* Botón nuevo ingreso */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Historial de ingresos</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(true); setError('') }}
          disabled={pendiente <= 0}
        >
          + Registrar ingreso en banco
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: '1.2rem', borderColor: 'rgba(15,188,179,0.35)' }}>
          <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--teal)', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Nuevo ingreso en banco
          </h2>
          <form onSubmit={guardarIngreso} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div>
                <label>Importe (€)</label>
                <input
                  type="number" step="0.01" min="0.01"
                  placeholder={fmt(pendiente)}
                  value={form.importe}
                  onChange={e => setForm(f => ({ ...f, importe: e.target.value }))}
                  style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                  autoFocus
                />
              </div>
              <div>
                <label>Notas (opcional)</label>
                <input type="text" placeholder="Ej: ingreso Caixabank" value={form.notas}
                  onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-teal btn-sm" disabled={saving}>
                  {saving ? '…' : '✓ Guardar'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
            {/* Botón rápido importe pendiente */}
            <div style={{ marginTop: '0.6rem' }}>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setForm(f => ({ ...f, importe: pendiente.toFixed(2) }))}>
                Ingresar todo lo pendiente ({fmt(pendiente)})
              </button>
            </div>
            {error && (
              <div style={{ marginTop: '0.6rem', color: '#ff8a80', fontSize: '0.88rem',
                background: 'rgba(231,76,60,0.12)', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                {error}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Lista de ingresos */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>Cargando…</p>
      ) : ingresos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay ingresos registrados aún</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ingresos.map(i => (
            <div key={i.id} className="card-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fecha</div>
                  <div style={{ fontSize: '0.9rem' }}>{fmtDate(i.fecha)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Importe</div>
                  <div style={{ fontFamily: 'Courier New', fontWeight: 'bold', color: 'var(--teal)', fontSize: '1rem' }}>{fmt(i.importe)}</div>
                </div>
                {i.notas && (
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Notas</div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{i.notas}</div>
                  </div>
                )}
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteIngreso(i.id!)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
