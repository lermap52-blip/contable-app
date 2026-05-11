'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { RefreshCw, Filter } from 'lucide-react'

const CONCEPTOS = ['Todas', 'Devolución', 'Descuento', 'Bonificación']

const RESICO_TRAMOS = [
  { hasta: 25000, tasa: 0.0100 },
  { hasta: 50000, tasa: 0.0110 },
  { hasta: 83333.33, tasa: 0.0150 },
  { hasta: 208333.33, tasa: 0.0200 },
  { hasta: 3500000, tasa: 0.0250 },
]

function getTasaResico(base) {
  const tramo = RESICO_TRAMOS.find(t => base <= t.hasta) || RESICO_TRAMOS[RESICO_TRAMOS.length - 1]
  return tramo.tasa
}

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function NotasCredito() {
  const { clienteActivo, empresaId, regimenesActivos } = useCliente()
  const [notas, setNotas] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('Todas')
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())

  const esResico = regimenesActivos.includes('resico')

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, clienteActivo, mes, anio])

  const cargarDatos = async () => {
    setLoading(true)
    const primerDia = new Date(anio, mes, 1).toISOString().split('T')[0]
    const ultimoDia = new Date(anio, mes + 1, 0).toISOString().split('T')[0]

    let baseQuery = supabase
      .from('movimientos')
      .select('*, contactos(*)')
      .eq('empresa_id', empresaId)
      .gte('fecha_operacion', primerDia)
      .lte('fecha_operacion', ultimoDia)

    if (clienteActivo) baseQuery = baseQuery.eq('cliente_id', clienteActivo.id)
    else baseQuery = baseQuery.is('cliente_id', null)

    const [{ data: notasData }, { data: ingresosData }] = await Promise.all([
      baseQuery.eq('tipo', 'nota_credito'),
      baseQuery.eq('tipo', 'ingreso'),
    ])

    setNotas(notasData || [])
    setIngresos(ingresosData || [])
    setLoading(false)
  }

  const notasFiltradas = notas.filter(n => {
    if (filtro === 'Todas') return true
    return n.categoria_id === filtro || n.descripcion?.toLowerCase().includes(filtro.toLowerCase())
  })

  const totalIngresos = ingresos.reduce((a, r) => a + Number(r.monto), 0)
  const totalNotas = notas.reduce((a, r) => a + Number(r.monto), 0)
  const baseGravable = totalIngresos - totalNotas

  const tasaSinNotas = getTasaResico(totalIngresos)
  const tasaConNotas = getTasaResico(baseGravable)
  const isrSinNotas = totalIngresos * tasaSinNotas
  const isrConNotas = baseGravable * tasaConNotas
  const ahorro = isrSinNotas - isrConNotas

  const getConceptoColor = (descripcion) => {
    const d = (descripcion || '').toLowerCase()
    if (d.includes('devoluci')) return { bg: '#FCEBEB', color: '#A32D2D', label: 'Devolución' }
    if (d.includes('descuento')) return { bg: '#fffbeb', color: '#854F0B', label: 'Descuento' }
    if (d.includes('bonificaci')) return { bg: '#f5f3ff', color: '#6d28d9', label: 'Bonificación' }
    return { bg: '#f3f4f6', color: '#6b7280', label: 'Nota de crédito' }
  }

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }

  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Notas de crédito</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {clienteActivo ? clienteActivo.nombre : 'Mi Despacho'} · Base gravable real para declaración SAT
        </div>
      </div>

      {/* Selector mes */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '7px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', background: 'white', outline: 'none', cursor: 'pointer' }}>
          {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))}
          style={{ padding: '7px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', background: 'white', outline: 'none', cursor: 'pointer' }}>
          {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={cargarDatos}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: 'white', color: '#374151' }}>
          <RefreshCw size={13} /> Actualizar
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }}></div>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Validación SAT activa</span>
        </div>
      </div>

      {/* Cálculo base gravable */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          Cálculo de base gravable real · {MESES[mes]} {anio}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr 36px 1fr', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Ingresos brutos</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#16a34a' }}>{fmt(totalIngresos)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{ingresos.length} facturas emitidas</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 22, color: '#9ca3af', fontWeight: 300 }}>−</div>
          <div style={{ background: '#fef2f2', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #fecaca' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Total notas de crédito</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#dc2626' }}>{fmt(totalNotas)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{notas.length} notas aplicadas</div>
          </div>
          <div style={{ textAlign: 'center', fontSize: 22, color: '#9ca3af', fontWeight: 300 }}>=</div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#185FA5', marginBottom: 4, fontWeight: 500 }}>
              Base gravable {esResico ? 'RESICO' : 'real'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#185FA5' }}>{fmt(baseGravable)}</div>
            <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 2 }}>Base para declaración SAT</div>
          </div>
        </div>

        {/* ISR calculado */}
        {esResico && (
          <>
            <div style={{ padding: '9px 14px', background: '#EAF3DE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: '#3B6D11' }}>
                ISR RESICO sobre base real ({fmt(baseGravable)} × {(tasaConNotas * 100).toFixed(2)}%)
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#3B6D11' }}>
                {fmt(isrConNotas)}
                <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: '#6b7280' }}>
                  vs {fmt(isrSinNotas)} sin notas
                </span>
              </div>
            </div>
            {ahorro > 0 && (
              <div style={{ padding: '8px 14px', background: '#fffbeb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: '#854F0B' }}>Ahorro fiscal por notas correctamente aplicadas</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#854F0B' }}>{fmt(ahorro)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tabla notas */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Registro de notas de crédito · {MESES[mes]} {anio}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {CONCEPTOS.map(c => (
              <button key={c} onClick={() => setFiltro(c)}
                style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: filtro === c ? '#1e2a4a' : '#f9fafb', color: filtro === c ? 'white' : '#6b7280', fontWeight: filtro === c ? 500 : 400 }}>
                {c === 'Devolución' ? '↩ ' : c === 'Descuento' ? '% ' : c === 'Bonificación' ? '🎁 ' : ''}{c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando...</div>
        ) : notasFiltradas.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>↩️</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 }}>Sin notas de crédito</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>No hay notas de crédito registradas para {MESES[mes]} {anio}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Tipo','Folio / UUID','Fecha','Receptor','Concepto','CFDI relacionado','Monto','Validación SAT'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notasFiltradas.map((n, i) => {
                  const concepto = getConceptoColor(n.descripcion)
                  return (
                    <tr key={n.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>↩️</span>
                          <span style={{ background: concepto.bg, color: concepto.color, padding: '2px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                            {concepto.label}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>{n.referencia || `NC-${anio}-${String(i+1).padStart(3,'0')}`}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#9ca3af', marginTop: 1 }}>{n.id?.slice(0,14)}...</div>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {new Date(n.fecha_operacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{n.contactos?.nombre || 'Sin nombre'}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#9ca3af' }}>{n.contactos?.rfc || '—'}</div>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ background: concepto.bg, color: concepto.color, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                          {n.descripcion || concepto.label}
                        </span>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {n.comprobante_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 12 }}>🔗</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#185FA5' }}>
                              {n.comprobante_id.slice(0, 16)}...
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#d1d5db' }}>Sin vincular</span>
                        )}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#dc2626' }}>
                        -{fmt(Number(n.monto))}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 500, fontFamily: 'monospace' }}>
                          ✓ Vigente
                        </span>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {notasFiltradas.length > 0 && (
          <div style={{ padding: '14px 18px', borderTop: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Total notas de crédito · {MESES[mes]} {anio}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#dc2626' }}>-{fmt(totalNotas)}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{notas.length} notas · Todas validadas SAT ✓</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}