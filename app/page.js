'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useCliente } from './ClienteContext'

function diasParaVencer(fecha) {
  if (!fecha) return null
  const hoy = new Date()
  const vence = new Date(fecha)
  return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
}

export default function Dashboard() {
  const { clienteActivo, empresaId, esModoMaestro } = useCliente()
  const [ingresos, setIngresos] = useState(0)
  const [egresos, setEgresos] = useState(0)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [hora, setHora] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setHora('Buenos días')
    else if (h < 19) setHora('Buenas tardes')
    else setHora('Buenas noches')
    cargarDatos()
  }, [clienteActivo, empresaId])

  const cargarDatos = async () => {
    setLoading(true)
    if (!empresaId) { setLoading(false); return }

    const filtro = esModoMaestro
      ? { empresa_id: empresaId, cliente_id: null }
      : { empresa_id: empresaId, cliente_id: clienteActivo?.id }

    const mes = new Date()
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString()
    const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).toISOString()

    const [{ data: ingData }, { data: egData }, { data: clientesData }] = await Promise.all([
      supabase.from('movimientos').select('monto').eq('empresa_id', empresaId).eq('tipo', 'ingreso').gte('fecha_operacion', inicio).lte('fecha_operacion', fin),
      supabase.from('movimientos').select('monto').eq('empresa_id', empresaId).eq('tipo', 'egreso').gte('fecha_operacion', inicio).lte('fecha_operacion', fin),
      supabase.from('contactos').select('*').eq('empresa_id', empresaId).eq('tipo', 'cliente').order('nombre', { ascending: true }),
    ])

    const totalIng = (ingData || []).reduce((s, r) => s + (r.monto || 0), 0)
    const totalEg = (egData || []).reduce((s, r) => s + (r.monto || 0), 0)

    setIngresos(totalIng)
    setEgresos(totalEg)
    setClientes(clientesData || [])
    setLoading(false)
  }

  const fmt = (n) => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const iva = ingresos * 0.16
  const tramos = [
    { hasta: 25000, tasa: 0.0100 },
    { hasta: 50000, tasa: 0.0110 },
    { hasta: 83333.33, tasa: 0.0150 },
    { hasta: 208333.33, tasa: 0.0200 },
    { hasta: 3500000, tasa: 0.0250 },
  ]
  const tramo = tramos.find(t => ingresos <= t.hasta) || tramos[tramos.length - 1]
  const isr = ingresos * tramo.tasa

  const mes = new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  // Clientes con alerta de e.firma
  const alertasEfirma = clientes.filter(c => {
    if (!c.vencimiento_efirma) return false
    const dias = diasParaVencer(c.vencimiento_efirma)
    return dias !== null && dias <= 30
  }).sort((a, b) => diasParaVencer(a.vencimiento_efirma) - diasParaVencer(b.vencimiento_efirma))

  const nombre = clienteActivo?.nombre?.split(' ')[0] || 'Contador'

  return (
    <div style={{ padding: 28, fontFamily: 'system-ui,sans-serif', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>
          {hora}, {nombre} 👋
        </div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          Resumen fiscal · {mes.charAt(0).toUpperCase() + mes.slice(1)}
        </div>
      </div>

      {/* Alertas e.firma */}
      {alertasEfirma.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alertasEfirma.map(c => {
            const dias = diasParaVencer(c.vencimiento_efirma)
            const vencida = dias !== null && dias <= 0
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', borderRadius: 10, marginBottom: 8,
                background: vencida ? '#FCEBEB' : '#fffbeb',
                border: `0.5px solid ${vencida ? '#fecaca' : '#fde68a'}`,
              }}>
                <span style={{ fontSize: 18 }}>{vencida ? '🔴' : '⚠️'}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: vencida ? '#A32D2D' : '#92400e' }}>
                    {c.nombre}
                  </span>
                  <span style={{ fontSize: 12, color: vencida ? '#A32D2D' : '#92400e', marginLeft: 8 }}>
                    {vencida
                      ? `e.firma vencida el ${c.vencimiento_efirma}`
                      : `e.firma vence en ${dias} día${dias !== 1 ? 's' : ''} · ${c.vencimiento_efirma}`}
                  </span>
                </div>
                <a href="/clientes" style={{ fontSize: 11, color: '#185FA5', textDecoration: 'none', fontWeight: 500 }}>
                  Ver →
                </a>
              </div>
            )
          })}
        </div>
      )}

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Ingresos del mes', valor: fmt(ingresos), color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Egresos del mes', valor: fmt(egresos), color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
          { label: 'IVA estimado', valor: fmt(iva), color: '#185FA5', bg: '#eff6ff', border: '#bfdbfe' },
          { label: `ISR RESICO (${(tramo.tasa * 100).toFixed(2)}%)`, valor: fmt(isr), color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, border: `0.5px solid ${card.border}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: card.color }}>{loading ? '...' : card.valor}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Próximos pagos */}
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>Próximos pagos SAT</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Obligaciones del mes</div>
          {[
            { label: 'Declaración mensual IVA/ISR', fecha: `17 de ${new Date().toLocaleString('es-MX', { month: 'long' })}`, color: '#185FA5', dias: 17 - new Date().getDate() },
            { label: 'DIOT', fecha: `17 de ${new Date().toLocaleString('es-MX', { month: 'long' })}`, color: '#185FA5', dias: 17 - new Date().getDate() },
            { label: 'IMSS cuotas', fecha: `17 de ${new Date().toLocaleString('es-MX', { month: 'long' })}`, color: '#854F0B', dias: 17 - new Date().getDate() },
          ].map(p => (
            <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 400 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{p.fecha}</div>
              </div>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500,
                background: p.dias < 0 ? '#FCEBEB' : p.dias <= 5 ? '#fffbeb' : '#eff6ff',
                color: p.dias < 0 ? '#A32D2D' : p.dias <= 5 ? '#92400e' : '#185FA5'
              }}>
                {p.dias < 0 ? 'Vencido' : p.dias === 0 ? 'Hoy' : `${p.dias} días`}
              </span>
            </div>
          ))}
        </div>

        {/* Clientes con e.firma */}
        <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937', marginBottom: 4 }}>Estado e.firma clientes</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Vigencia de certificados</div>
          {loading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Cargando...</div>
          ) : clientes.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              No hay clientes registrados
            </div>
          ) : (
            clientes.slice(0, 6).map(c => {
              const dias = diasParaVencer(c.vencimiento_efirma)
              const vencida = dias !== null && dias <= 0
              const porVencer = dias !== null && dias > 0 && dias <= 30
              const vigente = dias !== null && dias > 30
              const sinEfirma = !c.vencimiento_efirma

              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: vencida ? '#A32D2D' : porVencer ? '#d97706' : vigente ? '#16a34a' : '#9ca3af' }}></div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.nombre.split(' ').slice(0, 3).join(' ')}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{c.rfc}</div>
                  </div>
                  <div style={{ fontSize: 11, textAlign: 'right', flexShrink: 0 }}>
                    {sinEfirma && <span style={{ color: '#9ca3af' }}>Sin e.firma</span>}
                    {vencida && <span style={{ color: '#A32D2D', fontWeight: 500 }}>Vencida</span>}
                    {porVencer && <span style={{ color: '#d97706', fontWeight: 500 }}>{dias} días</span>}
                    {vigente && <span style={{ color: '#16a34a' }}>{dias} días</span>}
                  </div>
                </div>
              )
            })
          )}
          {clientes.length > 6 && (
            <a href="/clientes" style={{ display: 'block', fontSize: 11, color: '#185FA5', textDecoration: 'none', marginTop: 10, textAlign: 'center' }}>
              Ver todos ({clientes.length}) →
            </a>
          )}
        </div>

      </div>
    </div>
  )
}