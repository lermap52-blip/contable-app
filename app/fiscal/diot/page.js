'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Download, Filter, AlertTriangle } from 'lucide-react'

const TIPO_TERCERO = '04'
const TIPO_OPERACION = '85'

function esRFCValido(rfc) {
  if (!rfc) return false
  if (rfc === 'XAXX010101000') return false
  if (rfc === 'XEXX010101000') return false
  return rfc.length >= 12
}

function generarLayoutTxt(proveedores) {
  return proveedores
    .filter(p => p.incluir && esRFCValido(p.rfc))
    .map(p => {
      const base16 = p.base16 || 0
      const base8 = p.base8 || 0
      const iva16 = Math.round(base16 * 0.16)
      const iva8 = Math.round(base8 * 0.08)
      const ivaRetenido = p.ivaRetenido || 0
      return [
        TIPO_TERCERO,
        p.rfc,
        TIPO_OPERACION,
        base16,
        base8,
        0, // tasa 0%
        0, // exento
        0, // importaciones exentas
        iva16 + iva8,
        ivaRetenido,
        ivaRetenido,
        0, 0, 0, 0, 0, 0
      ].join('|')
    })
    .join('\n')
}

export default function DIOT() {
  const { clienteActivo, empresaId, regimenesActivos } = useCliente()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const esResico = regimenesActivos.includes('resico') && !regimenesActivos.some(r => ['actividad','arrendamiento','plataformas','intereses','dividendos','general_pm','resico_pm'].includes(r))

  useEffect(() => {
    if (empresaId) cargarEgresos()
  }, [empresaId, clienteActivo, mes, anio])

  const cargarEgresos = async () => {
    setLoading(true)
    const primerDia = new Date(anio, mes, 1).toISOString().split('T')[0]
    const ultimoDia = new Date(anio, mes + 1, 0).toISOString().split('T')[0]

    let query = supabase
      .from('movimientos')
      .select('*, contactos(*)')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'egreso')
      .gte('fecha_operacion', primerDia)
      .lte('fecha_operacion', ultimoDia)

    if (clienteActivo) query = query.eq('cliente_id', clienteActivo.id)
    else query = query.is('cliente_id', null)

    const { data: movs } = await query

    if (movs) {
      const mapa = {}
      movs.forEach(m => {
        const rfc = m.contactos?.rfc || 'XAXX010101000'
        const nombre = m.contactos?.nombre || 'Sin identificar'
        if (!mapa[rfc]) {
          mapa[rfc] = { rfc, nombre, base16: 0, base8: 0, ivaRetenido: 0, facturas: 0, incluir: esRFCValido(rfc) }
        }
        const monto = Number(m.monto) || 0
        if (m.forma_pago === '8%' || m.notas?.includes('frontera')) {
          mapa[rfc].base8 += monto
        } else {
          mapa[rfc].base16 += monto
        }
        mapa[rfc].facturas += 1
      })
      setProveedores(Object.values(mapa))
    }
    setLoading(false)
  }

  const toggleIncluir = (rfc) => {
    setProveedores(prev => prev.map(p => p.rfc === rfc ? { ...p, incluir: !p.incluir } : p))
  }

  const exportarTxt = () => {
    const contenido = generarLayoutTxt(proveedores)
    const blob = new Blob([contenido], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DIOT_${anio}_${String(mes + 1).padStart(2, '0')}_${clienteActivo?.rfc || 'DESPACHO'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalBase16 = proveedores.filter(p => p.incluir).reduce((a, p) => a + p.base16, 0)
  const totalBase8 = proveedores.filter(p => p.incluir).reduce((a, p) => a + p.base8, 0)
  const totalRetenido = proveedores.filter(p => p.incluir).reduce((a, p) => a + p.ivaRetenido, 0)
  const incluidos = proveedores.filter(p => p.incluir && esRFCValido(p.rfc)).length
  const excluidos = proveedores.filter(p => !p.incluir || !esRFCValido(p.rfc)).length

  const fmt = (n) => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }

  if (esResico) {
    return (
      <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...card, maxWidth: 480, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>DIOT no requerida</div>
          <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
            Los contribuyentes del <strong>Régimen Simplificado de Confianza (RESICO PF)</strong> están exentos de presentar la DIOT por facilidad administrativa de la RMF.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>DIOT · Declaración de Operaciones con Terceros</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {clienteActivo ? clienteActivo.nombre : 'Mi Despacho'} · {MESES[mes]} {anio}
        </div>
      </div>

      {/* Selector mes */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select value={mes} onChange={e => setMes(Number(e.target.value))}
              style={{ padding: '7px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', background: '#f9fafb', outline: 'none', cursor: 'pointer' }}>
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))}
              style={{ padding: '7px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', background: '#f9fafb', outline: 'none', cursor: 'pointer' }}>
              {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{incluidos} incluidos</span>
            {excluidos > 0 && <span style={{ background: '#fffbeb', color: '#854F0B', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{excluidos} excluidos</span>}
            <button onClick={exportarTxt}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
              <Download size={14} /> Exportar Layout SAT (.txt)
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Base IVA 16%</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#185FA5' }}>{fmt(totalBase16)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Tasa general</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Base IVA 8%</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#6d28d9' }}>{fmt(totalBase8)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Zona fronteriza</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>IVA retenido</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#854F0B' }}>{fmt(totalRetenido)}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Retenciones</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Proveedores</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: '#0f172a' }}>{incluidos}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>En reporte final</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Proveedores clasificados · {MESES[mes]} {anio}
          </div>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Desmarca los gastos no deducibles para excluirlos</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando egresos del mes...</div>
        ) : proveedores.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No hay egresos registrados para {MESES[mes]} {anio}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['RFC Proveedor','Nombre','Tipo tercero','Tipo operación','Base IVA 16%','Base IVA 8%','IVA retenido','Facturas','Incluir DIOT'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p, i) => {
                  const valido = esRFCValido(p.rfc)
                  const esFronterizo = p.base8 > 0
                  return (
                    <tr key={i} style={{ opacity: !p.incluir ? 0.45 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{p.rfc}</span>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{p.nombre}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{p.facturas} factura{p.facturas !== 1 ? 's' : ''}</div>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {valido
                          ? <span style={{ background: '#E6F1FB', color: '#185FA5', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>04 · Nacional</span>
                          : <span style={{ background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Sin RFC</span>}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>85 · Otros</span>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>
                        {p.base16 > 0 ? fmt(p.base16) : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>
                        {p.base8 > 0
                          ? <span style={{ color: '#6d28d9', fontWeight: 500 }}>{fmt(p.base8)}</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>
                        {p.ivaRetenido > 0 ? fmt(p.ivaRetenido) : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{p.facturas}</span>
                      </td>

                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={p.incluir && valido}
                          disabled={!valido}
                          onChange={() => toggleIncluir(p.rfc)}
                          style={{ width: 15, height: 15, cursor: valido ? 'pointer' : 'not-allowed', accentColor: '#1e2a4a' }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Preview layout */}
        {proveedores.filter(p => p.incluir && esRFCValido(p.rfc)).length > 0 && (
          <div style={{ margin: 16, background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '0.5px solid #e5e7eb' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Preview · Layout SAT (.txt) — {incluidos} registros
            </div>
            <code style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace', lineHeight: 1.8, display: 'block', whiteSpace: 'pre', overflowX: 'auto' }}>
              {generarLayoutTxt(proveedores)}
            </code>
          </div>
        )}

        <div style={{ padding: '14px 18px', borderTop: '0.5px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={exportarTxt}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
            <Download size={14} /> Exportar Layout SAT (.txt)
          </button>
        </div>
      </div>
    </div>
  )
}