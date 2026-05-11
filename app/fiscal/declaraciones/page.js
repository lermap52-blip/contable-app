'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Download, Upload } from 'lucide-react'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function diasParaVencer(mes, anio) {
  const limite = new Date(anio, mes, 17)
  const hoy = new Date()
  return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
}

export default function Declaraciones() {
  const { clienteActivo, empresaId } = useCliente()
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [datos, setDatos] = useState({})
  const [notas, setNotas] = useState({})
  const [loading, setLoading] = useState(true)

  const mesActual = new Date().getMonth()

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, clienteActivo, anio])

  const cargarDatos = async () => {
    setLoading(true)
    let query = supabase
      .from('declaraciones')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('anio', anio)

    if (clienteActivo) query = query.eq('cliente_id', clienteActivo.id)
    else query = query.is('cliente_id', null)

    const { data } = await query
    if (data) {
      const map = {}
      const notasMap = {}
      data.forEach(d => {
        map[d.mes] = d
        notasMap[d.mes] = d.notas || ''
      })
      setDatos(map)
      setNotas(notasMap)
    }
    setLoading(false)
  }

  const guardarNota = async (mes, valor) => {
    setNotas(prev => ({ ...prev, [mes]: valor }))
    const d = datos[mes]
    if (d?.id) {
      await supabase.from('declaraciones').update({ notas: valor }).eq('id', d.id)
    }
  }

  const handleSubirAcuse = async (mes) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const folio = `DCL-${anio}-${String(mes+1).padStart(3,'0')}-${Math.floor(1000+Math.random()*9000)}`
      const fecha = new Date().toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      const d = datos[mes]
      if (d?.id) {
        const { data: updated } = await supabase.from('declaraciones')
          .update({ acuse_nombre: file.name, folio, fecha_presentacion: fecha })
          .eq('id', d.id)
          .select()
          .single()
        if (updated) setDatos(prev => ({ ...prev, [mes]: updated }))
      } else {
        const { data: nuevo } = await supabase.from('declaraciones')
          .insert({
            empresa_id: empresaId,
            cliente_id: clienteActivo?.id || null,
            anio,
            mes,
            folio,
            fecha_presentacion: fecha,
            acuse_nombre: file.name,
            notas: notas[mes] || ''
          })
          .select()
          .single()
        if (nuevo) setDatos(prev => ({ ...prev, [mes]: nuevo }))
      }
    }
    input.click()
  }

  const handleSubirLinea = async (mes) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const d = datos[mes]
      if (d?.id) {
        const { data: updated } = await supabase.from('declaraciones')
          .update({ linea_nombre: file.name })
          .eq('id', d.id)
          .select()
          .single()
        if (updated) setDatos(prev => ({ ...prev, [mes]: updated }))
      } else {
        const { data: nuevo } = await supabase.from('declaraciones')
          .insert({
            empresa_id: empresaId,
            cliente_id: clienteActivo?.id || null,
            anio,
            mes,
            linea_nombre: file.name,
            notas: notas[mes] || ''
          })
          .select()
          .single()
        if (nuevo) setDatos(prev => ({ ...prev, [mes]: nuevo }))
      }
    }
    input.click()
  }

  const getEstatus = (mes) => {
    const d = datos[mes]
    if (d?.acuse_nombre) return 'presentada'
    if (mes > mesActual) return 'sin_iniciar'
    const dias = diasParaVencer(mes + 1, anio)
    if (dias < 0) return 'vencida'
    return 'pendiente'
  }

  const presentadas = Object.values(datos).filter(d => d?.acuse_nombre).length
  const pendientes = MESES.slice(0, mesActual + 1).filter((_, i) => !datos[i]?.acuse_nombre && diasParaVencer(i + 1, anio) >= 0).length
  const vencidas = MESES.slice(0, mesActual + 1).filter((_, i) => !datos[i]?.acuse_nombre && diasParaVencer(i + 1, anio) < 0).length

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 20 }

  const badge = (tipo) => {
    const estilos = {
      presentada:  { background: '#EAF3DE', color: '#3B6D11' },
      pendiente:   { background: '#fffbeb', color: '#854F0B' },
      vencida:     { background: '#FCEBEB', color: '#A32D2D' },
      sin_iniciar: { background: '#f3f4f6', color: '#9ca3af', border: '0.5px solid #e5e7eb' },
    }
    const labels = {
      presentada: '✓ Presentada',
      pendiente:  '⏱ Pendiente',
      vencida:    '⚠ Vencida',
      sin_iniciar:'— Sin iniciar',
    }
    return (
      <span style={{ ...estilos[tipo], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, display: 'inline-block' }}>
        {labels[tipo]}
      </span>
    )
  }

  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Declaraciones mensuales</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          Bitácora de cumplimiento · {clienteActivo ? clienteActivo.nombre : 'Mi Despacho'}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setAnio(a => a - 1)}
              style={{ padding: '5px 12px', border: '0.5px solid #e5e7eb', borderRadius: 7, background: '#f9fafb', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
              ← {anio - 1}
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>Ejercicio {anio}</span>
            <button onClick={() => setAnio(a => a + 1)}
              style={{ padding: '5px 12px', border: '0.5px solid #e5e7eb', borderRadius: 7, background: '#f9fafb', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
              {anio + 1} →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{presentadas} presentadas</span>
            <span style={{ background: '#fffbeb', color: '#854F0B', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{pendientes} pendientes</span>
            {vencidas > 0 && <span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{vencidas} vencidas</span>}
          </div>
        </div>

        <div style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Progreso del ejercicio</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 4 }}>
          {MESES_CORTO.map((m, i) => {
            const est = getEstatus(i)
            const color = est === 'presentada' ? '#EAF3DE' : est === 'pendiente' ? '#fffbeb' : est === 'vencida' ? '#FCEBEB' : '#f3f4f6'
            const border = est === 'presentada' ? '#C0DD97' : est === 'pendiente' ? '#fde68a' : est === 'vencida' ? '#fecaca' : '#e5e7eb'
            const textColor = est === 'presentada' ? '#3B6D11' : est === 'pendiente' ? '#854F0B' : est === 'vencida' ? '#A32D2D' : '#9ca3af'
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ height: 20, borderRadius: 4, background: color, border: `0.5px solid ${border}`, marginBottom: 3 }}></div>
                <div style={{ fontSize: 9, color: textColor }}>{m}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f3f4f6' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Registro mensual · {anio}
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Cargando...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Mes','Estatus','Folio SAT','Fecha presentación','Acuse PDF','Línea de captura','Notas'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 14px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MESES.map((mes, i) => {
                  const est = getEstatus(i)
                  const d = datos[i] || {}
                  const dias = diasParaVencer(i + 1, anio)
                  const dotColor = est === 'presentada' ? '#3B6D11' : est === 'pendiente' ? '#854F0B' : est === 'vencida' ? '#A32D2D' : '#d1d5db'

                  return (
                    <tr key={i}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>

                      <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }}></div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{mes} {anio}</div>
                            {est === 'pendiente' && <div style={{ fontSize: 10, color: '#854F0B', marginTop: 1 }}>{dias > 0 ? `Vence en ${dias} días` : 'Vence hoy'}</div>}
                            {est === 'vencida' && <div style={{ fontSize: 10, color: '#A32D2D', marginTop: 1 }}>Venció hace {Math.abs(dias)} días</div>}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f3f4f6' }}>{badge(est)}</td>

                      <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {d.folio
                          ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{d.folio}</span>
                          : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                      </td>

                      <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, color: '#6b7280' }}>
                        {d.fecha_presentacion || <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>

                      <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {d.acuse_nombre ? (
                          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #C0DD97', color: '#3B6D11', background: 'transparent' }}>
                            <Download size={12} /> {d.acuse_nombre.slice(0, 15)}...
                          </button>
                        ) : est !== 'sin_iniciar' ? (
                          <button onClick={() => handleSubirAcuse(i)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1.5px dashed #d1d5db', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>
                            <Upload size={12} /> Subir acuse
                          </button>
                        ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                      </td>

                      <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {d.linea_nombre ? (
                          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #C0DD97', color: '#3B6D11', background: 'transparent' }}>
                            <Download size={12} /> {d.linea_nombre.slice(0, 15)}...
                          </button>
                        ) : est !== 'sin_iniciar' ? (
                          <button onClick={() => handleSubirLinea(i)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontSize: 11, border: '1.5px dashed #d1d5db', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>
                            <Upload size={12} /> Subir línea
                          </button>
                        ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                      </td>

                      <td style={{ padding: '12px 14px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {est !== 'sin_iniciar' ? (
                          <input
                            value={notas[i] || ''}
                            onChange={e => setNotas(prev => ({ ...prev, [i]: e.target.value }))}
                            onBlur={e => guardarNota(i, e.target.value)}
                            placeholder="Agregar nota..."
                            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', width: 120, outline: 'none' }}
                          />
                        ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}