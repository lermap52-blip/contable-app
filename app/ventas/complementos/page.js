'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'

const FORMAS_PAGO = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '99': 'Por definir',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

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

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ComplementosPago() {
  const { clienteActivo, empresaId, regimenesActivos } = useCliente()
  const [complementos, setComplementos] = useState([])
  const [facturasPPDSinREP, setFacturasPPDSinREP] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('Todos')
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())

  const esResico = regimenesActivos.includes('resico')

  const mesAnterior = mes === 0 ? 11 : mes - 1
  const anioAnterior = mes === 0 ? anio - 1 : anio
  const diaLimite = new Date(anio, mes, 5)
  const diasParaLimite = Math.ceil((diaLimite - new Date()) / (1000 * 60 * 60 * 24))

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, clienteActivo, mes, anio])

  const cargarDatos = async () => {
    setLoading(true)
    const primerDia = new Date(anio, mes, 1).toISOString().split('T')[0]
    const ultimoDia = new Date(anio, mes + 1, 0).toISOString().split('T')[0]
    const primerDiaAnt = new Date(anioAnterior, mesAnterior, 1).toISOString().split('T')[0]
    const ultimoDiaAnt = new Date(anioAnterior, mesAnterior + 1, 0).toISOString().split('T')[0]

    let baseQuery = supabase
      .from('movimientos')
      .select('*, contactos(*)')
      .eq('empresa_id', empresaId)

    if (clienteActivo) baseQuery = baseQuery.eq('cliente_id', clienteActivo.id)
    else baseQuery = baseQuery.is('cliente_id', null)

    const [{ data: compData }, { data: ppd }] = await Promise.all([
      baseQuery
        .eq('tipo', 'complemento_pago')
        .gte('fecha_operacion', primerDia)
        .lte('fecha_operacion', ultimoDia),
      baseQuery
        .eq('tipo', 'ingreso')
        .eq('forma_pago', 'PPD')
        .is('comprobante_id', null)
        .gte('fecha_operacion', primerDiaAnt)
        .lte('fecha_operacion', ultimoDiaAnt),
    ])

    setComplementos(compData || [])
    setFacturasPPDSinREP(ppd || [])
    setLoading(false)
  }

  const complementosFiltrados = complementos.filter(c => {
    if (filtro === 'Todos') return true
    if (filtro === 'Efectivo') return c.forma_pago === '01'
    if (filtro === 'PUE') return c.notas?.includes('PUE')
    if (filtro === 'PPD') return c.notas?.includes('PPD')
    return true
  })

  const totalPUE = complementos.filter(c => c.notas?.includes('PUE')).reduce((a, c) => a + Number(c.monto), 0)
  const totalPPDconREP = complementos.filter(c => c.notas?.includes('PPD')).reduce((a, c) => a + Number(c.monto), 0)
  const totalPPDsinREP = facturasPPDSinREP.reduce((a, f) => a + Number(f.monto), 0)
  const baseReal = totalPUE + totalPPDconREP

  const pagosEfectivoMayores = complementos.filter(c => c.forma_pago === '01' && Number(c.monto) > 2000)

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }

  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
          Complementos de pago · REP
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {clienteActivo ? clienteActivo.nombre : 'Mi Despacho'} · Efectivamente cobrado · {MESES[mes]} {anio}
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
      </div>

      {/* Alerta efectivo >$2,000 */}
      {pagosEfectivoMayores.length > 0 && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #fecaca', borderRadius: 10, padding: '14px 16px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={18} color="#A32D2D" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', marginBottom: 2 }}>
              {pagosEfectivoMayores.length} pago{pagosEfectivoMayores.length !== 1 ? 's' : ''} en efectivo mayor{pagosEfectivoMayores.length !== 1 ? 'es' : ''} a $2,000 detectado{pagosEfectivoMayores.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: '#7f1d1d' }}>
              Estos pagos podrían no ser deducibles ni acreditables. Art. 27 fracc. III LISR. Verifica y documenta o solicita al cliente cambio de forma de pago.
            </div>
          </div>
        </div>
      )}

      {/* Alerta PPD sin REP */}
      {facturasPPDSinREP.length > 0 && (
        <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#854F0B" />
              <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>
                {facturasPPDSinREP.length} factura{facturasPPDSinREP.length !== 1 ? 's' : ''} PPD de {MESES[mesAnterior]} sin complemento de pago
              </div>
            </div>
            <span style={{ background: '#fffbeb', border: '0.5px solid #fde68a', color: '#854F0B', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
              Vence {diaLimite.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} · {diasParaLimite > 0 ? `${diasParaLimite} días` : 'Vencido'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {facturasPPDSinREP.map((f, i) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'white', borderRadius: 7, border: '0.5px solid #fde68a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>💵</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>
                      {f.referencia || `FAC-${anioAnterior}-${String(i+1).padStart(3,'0')}`} · {f.contactos?.nombre || 'Sin nombre'}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>
                      Emitida {fmtFecha(f.fecha_operacion)} · PPD · Saldo: {fmt(f.monto)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#854F0B' }}>{fmt(f.monto)}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>Sin cobrar</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen efectivamente cobrado */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          Efectivamente cobrado · {MESES[mes]} {anio} {esResico ? '· Base RESICO' : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Cobrado PUE</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#16a34a' }}>{fmt(totalPUE)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Pago en una exhibición</div>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Cobrado PPD (REP)</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#185FA5' }}>{fmt(totalPPDconREP)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Con complemento emitido</div>
          </div>
          <div style={{ background: '#fffbeb', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #fde68a' }}>
            <div style={{ fontSize: 11, color: '#854F0B', marginBottom: 4 }}>PPD sin REP</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#854F0B' }}>{fmt(totalPPDsinREP)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>No suma a declaración</div>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#185FA5', marginBottom: 4, fontWeight: 500 }}>
              Base {esResico ? 'RESICO' : 'gravable'} real
            </div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#185FA5' }}>{fmt(baseReal)}</div>
            <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 2 }}>PUE + PPD con REP</div>
          </div>
        </div>
        {esResico && baseReal > 0 && (
          <div style={{ marginTop: 12, padding: '9px 14px', background: '#EAF3DE', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#3B6D11' }}>
              ISR RESICO estimado ({fmt(baseReal)} × {(getTasaResico(baseReal) * 100).toFixed(2)}%)
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#3B6D11' }}>
              {fmt(baseReal * getTasaResico(baseReal))}
            </div>
          </div>
        )}
      </div>

      {/* Tabla complementos */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Complementos emitidos · {MESES[mes]} {anio}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Todos','PUE','PPD','Efectivo'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: filtro === f ? '#1e2a4a' : '#f9fafb', color: filtro === f ? 'white' : '#6b7280', fontWeight: filtro === f ? 500 : 400 }}>
                {f === 'Efectivo' ? '⚠ ' : ''}{f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando...</div>
        ) : complementosFiltrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💵</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 }}>Sin complementos de pago</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>No hay complementos registrados para {MESES[mes]} {anio}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['','Folio REP','Fecha cobro','Cliente','Factura origen','Forma de pago','Saldo anterior','Monto pagado','Saldo insoluto','Estatus'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Saldo anterior' || h === 'Monto pagado' || h === 'Saldo insoluto' ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complementosFiltrados.map((c, i) => {
                  const esEfectivo = c.forma_pago === '01'
                  const montoNum = Number(c.monto)
                  const alertaEfectivo = esEfectivo && montoNum > 2000
                  const saldoAnterior = Number(c.notas?.match(/saldo_ant:(\d+)/)?.[1] || 0)
                  const saldoInsoluto = saldoAnterior - montoNum

                  return (
                    <tr key={c.id} style={{ background: alertaEfectivo ? '#fff5f5' : 'white' }}
                      onMouseEnter={e => e.currentTarget.style.background = alertaEfectivo ? '#fff0f0' : '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = alertaEfectivo ? '#fff5f5' : 'white'}>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ fontSize: 18 }}>💵</span>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>
                          {c.referencia || `REP-${anio}-${String(i+1).padStart(3,'0')}`}
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#9ca3af', marginTop: 1 }}>
                          {c.id?.slice(0, 12)}...
                        </div>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {fmtFecha(c.fecha_operacion)}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{c.contactos?.nombre || 'Sin nombre'}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#9ca3af' }}>{c.contactos?.rfc || '—'}</div>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {c.comprobante_id ? (
                          <a href={`/ingresos?id=${c.comprobante_id}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                            <span style={{ fontSize: 12 }}>🔗</span>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#185FA5', textDecoration: 'underline' }}>
                              {c.comprobante_id.slice(0, 16)}...
                            </span>
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: '#d1d5db' }}>Sin vincular</span>
                        )}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {alertaEfectivo ? (
                          <span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ⚠ 01 · Efectivo
                          </span>
                        ) : (
                          <span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                            {c.forma_pago || '03'} · {FORMAS_PAGO[c.forma_pago] || 'Transferencia'}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                        {saldoAnterior > 0 ? fmt(saldoAnterior) : <span style={{ color: '#d1d5db' }}>PUE</span>}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 500, color: '#16a34a' }}>
                        {fmt(montoNum)}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: saldoInsoluto > 0 ? '#854F0B' : '#16a34a' }}>
                        {saldoAnterior > 0 ? fmt(Math.max(0, saldoInsoluto)) : fmt(0)}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {alertaEfectivo ? (
                          <span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>⚠ Revisar</span>
                        ) : saldoInsoluto <= 0 ? (
                          <span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>✓ Liquidado</span>
                        ) : (
                          <span style={{ background: '#fffbeb', color: '#854F0B', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>Parcial</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {complementosFiltrados.length > 0 && (
          <div style={{ padding: '14px 18px', borderTop: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              {complementosFiltrados.length} complemento{complementosFiltrados.length !== 1 ? 's' : ''} · Base efectivamente cobrada: {fmt(baseReal)}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Total cobrado del mes</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: '#16a34a' }}>{fmt(complementosFiltrados.reduce((a, c) => a + Number(c.monto), 0))}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}