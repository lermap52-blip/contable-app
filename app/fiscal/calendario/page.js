'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Plus, Info } from 'lucide-react'

const DIAS_GRACIA = {
  '1': 2, '2': 2,
  '3': 4, '4': 4,
  '5': 0, '6': 0,
  '7': 6, '8': 6,
  '9': 8, '0': 8,
}

function getDiasGracia(rfc) {
  if (!rfc || rfc.length < 6) return 0
  const digito = rfc[5]
  return DIAS_GRACIA[digito] ?? 0
}

function getFechaVencimiento(mes, anio, diasGracia) {
  const fecha = new Date(anio, mes, 17 + diasGracia)
  return fecha
}

function diasRestantes(fecha) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
}

function fmtFecha(fecha) {
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export default function CalendarioFiscal() {
  const { clienteActivo, empresaId, regimenesActivos, diasParaVencimiento } = useCliente()
  const [declaraciones, setDeclaraciones] = useState({})
  const [recordatorios, setRecordatorios] = useState([])
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevaNota, setNuevaNota] = useState('')
  const [empleados, setEmpleados] = useState(0)
  const anio = new Date().getFullYear()
  const mesActual = new Date().getMonth()

  const rfc = clienteActivo?.rfc || ''
  const digito = rfc[5] || '—'
  const diasGracia = getDiasGracia(rfc)
  const diaLimite = 17 + diasGracia

  const esResico = regimenesActivos.includes('resico') &&
    !regimenesActivos.some(r => ['actividad','arrendamiento','plataformas','intereses','dividendos','general_pm','resico_pm','fines_no_lucrativos','agapes'].includes(r))

  const tieneNomina = regimenesActivos.includes('sueldos') || empleados > 0

  // e.firma
  const fechaEfirma = clienteActivo?.vencimiento_efirma
  const diasEfirma = fechaEfirma ? diasParaVencimiento(fechaEfirma) : null

  useEffect(() => {
    if (empresaId) {
      cargarDeclaraciones()
      cargarEmpleados()
    }
    const saved = localStorage.getItem(`recordatorios_${clienteActivo?.id || 'despacho'}`)
    if (saved) setRecordatorios(JSON.parse(saved))
  }, [empresaId, clienteActivo])

  const cargarDeclaraciones = async () => {
    let query = supabase.from('declaraciones').select('*').eq('empresa_id', empresaId).eq('anio', anio)
    if (clienteActivo) query = query.eq('cliente_id', clienteActivo.id)
    else query = query.is('cliente_id', null)
    const { data } = await query
    if (data) {
      const map = {}
      data.forEach(d => { map[d.mes] = d })
      setDeclaraciones(map)
    }
  }

  const cargarEmpleados = async () => {
    const { count } = await supabase
      .from('contactos')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('tipo', 'empleado')
    setEmpleados(count || 0)
  }

  const agregarRecordatorio = () => {
    if (!nuevaFecha || !nuevaNota.trim()) return
    const nuevo = { id: Date.now(), fecha: nuevaFecha, nota: nuevaNota.trim() }
    const actualizados = [...recordatorios, nuevo].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    setRecordatorios(actualizados)
    localStorage.setItem(`recordatorios_${clienteActivo?.id || 'despacho'}`, JSON.stringify(actualizados))
    setNuevaFecha('')
    setNuevaNota('')
  }

  const eliminarRecordatorio = (id) => {
    const actualizados = recordatorios.filter(r => r.id !== id)
    setRecordatorios(actualizados)
    localStorage.setItem(`recordatorios_${clienteActivo?.id || 'despacho'}`, JSON.stringify(actualizados))
  }

  // Generar eventos del timeline
  const generarEventos = () => {
    const eventos = []

    for (let m = 0; m <= 11; m++) {
      const fechaVence = getFechaVencimiento(m + 1, anio, diasGracia)
      const declarado = declaraciones[m]?.acuse_nombre
      const dias = diasRestantes(fechaVence)
      const pasado = dias < 0
      const esMesActual = m === mesActual

      // Declaración mensual
      eventos.push({
        id: `decl-${m}`,
        mes: m,
        fecha: fechaVence,
        tipo: 'declaracion',
        titulo: 'Declaración mensual ISR / IVA',
        subtitulo: declarado
          ? `Presentada · Folio ${declaraciones[m]?.folio}`
          : pasado ? `Venció hace ${Math.abs(dias)} días` : `${MESES[m]} ${anio}`,
        cumplido: !!declarado,
        urgente: !declarado && dias >= 0 && dias <= 7,
        vencido: !declarado && dias < 0,
        esMesActual,
      })

      // DIOT — solo si no es RESICO
      if (!esResico) {
        eventos.push({
          id: `diot-${m}`,
          mes: m,
          fecha: fechaVence,
          tipo: 'diot',
          titulo: 'DIOT mensual',
          subtitulo: `Operaciones con terceros · ${MESES[m]} ${anio}`,
          cumplido: false,
          urgente: !pasado && dias <= 7,
          vencido: pasado,
          esMesActual,
        })
      }

      // Nómina — solo si tiene empleados
      if (tieneNomina) {
        const fechaNom = new Date(anio, m + 1, 17)
        const diasNom = diasRestantes(fechaNom)
        eventos.push({
          id: `nom-${m}`,
          mes: m,
          fecha: fechaNom,
          tipo: 'nomina',
          titulo: 'Pago cuotas IMSS / nómina',
          subtitulo: `Cuotas patronales · ${MESES[m]} ${anio}`,
          cumplido: false,
          urgente: diasNom >= 0 && diasNom <= 7,
          vencido: diasNom < 0,
          esMesActual,
        })
      }
    }

    // e.firma
    if (fechaEfirma) {
      eventos.push({
        id: 'efirma',
        mes: new Date(fechaEfirma).getMonth(),
        fecha: new Date(fechaEfirma),
        tipo: 'efirma',
        titulo: 'Vencimiento e.firma',
        subtitulo: `Renueva antes de esta fecha para poder timbrar CFDIs`,
        cumplido: false,
        urgente: diasEfirma !== null && diasEfirma <= 30 && diasEfirma >= 0,
        vencido: diasEfirma !== null && diasEfirma < 0,
        critico: true,
      })
    }

    // Recordatorios
    recordatorios.forEach(r => {
      const fecha = new Date(r.fecha + 'T00:00:00')
      eventos.push({
        id: `rec-${r.id}`,
        mes: fecha.getMonth(),
        fecha,
        tipo: 'recordatorio',
        titulo: r.nota,
        subtitulo: 'Recordatorio manual',
        cumplido: false,
        urgente: false,
        vencido: false,
        recordatorioId: r.id,
      })
    })

    return eventos.sort((a, b) => a.fecha - b.fecha)
  }

  const eventos = generarEventos()

  // Próximo vencimiento
  const proximoEvento = eventos.find(e => !e.cumplido && diasRestantes(e.fecha) >= 0)
  const diasProximo = proximoEvento ? diasRestantes(proximoEvento.fecha) : null

  const colorDot = (e) => {
    if (e.cumplido) return '#3B6D11'
    if (e.tipo === 'recordatorio') return '#6d28d9'
    if (e.tipo === 'efirma') return '#A32D2D'
    if (e.vencido) return '#A32D2D'
    if (e.urgente) return '#854F0B'
    return '#9ca3af'
  }

  const colorDias = (dias) => {
    if (dias < 0) return '#A32D2D'
    if (dias <= 7) return '#854F0B'
    if (dias <= 15) return '#185FA5'
    return '#3B6D11'
  }

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }

  // Agrupar por mes
  const mesesConEventos = []
  for (let m = 0; m <= 11; m++) {
    const evs = eventos.filter(e => e.mes === m)
    if (evs.length > 0) mesesConEventos.push({ mes: m, eventos: evs })
  }

  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Calendario fiscal</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {clienteActivo ? clienteActivo.nombre : 'Mi Despacho'} · RFC: {rfc || '—'} · Dígito {digito} → día {diaLimite}
        </div>
      </div>

      {/* Widget próximo vencimiento */}
      {proximoEvento && (
        <div style={{ background: 'linear-gradient(135deg,#1e2a4a,#253560)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Próximo vencimiento</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'white', marginBottom: 3 }}>{fmtFecha(proximoEvento.fecha)} · {proximoEvento.titulo}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>RFC: {rfc} · Dígito {digito} → día {diaLimite}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 500, color: diasProximo <= 7 ? '#fbbf24' : '#4ade80' }}>{diasProximo}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>días restantes</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>

        {/* Timeline */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#0f172a', marginBottom: 2 }}>Timeline fiscal · {anio}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Obligaciones ordenadas por fecha de vencimiento</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ background: '#E6F1FB', color: '#185FA5', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                Dígito {digito} → día {diaLimite}
              </span>
            </div>
          </div>

          {mesesConEventos.map(({ mes: m, eventos: evs }) => (
            <div key={m}>
              {/* Separador mes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 12px', fontSize: 12, fontWeight: 500, color: m === mesActual ? '#185FA5' : '#9ca3af' }}>
                <div style={{ height: 1, flex: 1, background: '#f3f4f6' }}></div>
                {MESES[m]} {anio} {m === mesActual && '· Mes actual'}
                <div style={{ height: 1, flex: 1, background: '#f3f4f6' }}></div>
              </div>

              {evs.map((e, ei) => {
                const dias = diasRestantes(e.fecha)
                const dot = colorDot(e)
                return (
                  <div key={e.id} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
                      <div style={{ width: 11, height: 11, borderRadius: '50%', background: dot, border: '2px solid white', boxShadow: `0 0 0 1.5px ${dot}`, flexShrink: 0 }}></div>
                      {ei < evs.length - 1 && <div style={{ width: 1.5, flex: 1, background: '#f3f4f6', marginTop: 3 }}></div>}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtFecha(e.fecha)}</span>
                        {!e.cumplido && dias >= 0 && dias <= 30 && (
                          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 500, background: colorDias(dias) === '#A32D2D' ? '#FCEBEB' : colorDias(dias) === '#854F0B' ? '#fffbeb' : '#E6F1FB', color: colorDias(dias) }}>
                            {dias === 0 ? 'Hoy' : `${dias}d`}
                          </span>
                        )}
                        {e.tipo === 'recordatorio' && (
                          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#f5f3ff', color: '#6d28d9' }}>Recordatorio</span>
                        )}
                        {e.tipo === 'efirma' && (
                          <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#FCEBEB', color: '#A32D2D' }}>e.firma</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: e.cumplido ? '#9ca3af' : e.vencido ? '#A32D2D' : '#0f172a', textDecoration: e.cumplido ? 'line-through' : 'none', marginBottom: 2 }}>
                        {e.cumplido ? '✅ ' : ''}{e.titulo}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {e.subtitulo}
                        {e.tipo === 'recordatorio' && (
                          <button onClick={() => eliminarRecordatorio(e.recordatorioId)}
                            style={{ fontSize: 10, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Leyenda */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Tipos de evento</div>
            {[
              { color: '#3B6D11', label: 'Cumplido' },
              { color: '#854F0B', label: 'Próximo · urgente' },
              { color: '#A32D2D', label: 'Vencido o crítico' },
              { color: '#6d28d9', label: 'Recordatorio manual' },
              { color: '#9ca3af', label: 'Futuro · pendiente' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }}></div>
                {item.label}
              </div>
            ))}
          </div>

          {/* Días de gracia */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Días de gracia por RFC</div>
            {[
              { digitos: '1 y 2', dias: '+2 días → día 19' },
              { digitos: '3 y 4', dias: '+4 días → día 21' },
              { digitos: '5 y 6', dias: 'sin gracia → día 17' },
              { digitos: '7 y 8', dias: '+6 días → día 23' },
              { digitos: '9 y 0', dias: '+8 días → día 25' },
            ].map(item => (
              <div key={item.digitos} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                <span style={{ color: '#6b7280' }}>Dígito {item.digitos}</span>
                <span style={{ fontFamily: 'monospace', color: item.digitos === '5 y 6' ? '#185FA5' : '#374151', fontWeight: item.digitos === '5 y 6' ? 500 : 400 }}>{item.dias}</span>
              </div>
            ))}
          </div>

          {/* Agregar recordatorio */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Agregar recordatorio</div>
            <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, color: '#374151', background: '#f9fafb', marginBottom: 8, outline: 'none', boxSizing: 'border-box' }} />
            <input type="text" value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
              placeholder="Ej: Cita en el SAT Matamoros..."
              onKeyDown={e => e.key === 'Enter' && agregarRecordatorio()}
              style={{ width: '100%', padding: '7px 10px', border: '0.5px solid #e5e7eb', borderRadius: 7, fontSize: 12, color: '#374151', background: '#f9fafb', marginBottom: 8, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={agregarRecordatorio}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
              <Plus size={13} /> Agregar recordatorio
            </button>
          </div>

          {/* Nómina */}
          {!tieneNomina && (
            <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Info size={15} color="#854F0B" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#854F0B', marginBottom: 3 }}>Sin registro patronal</div>
                <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>Este cliente no tiene trabajadores registrados. No aplican fechas de nómina ni cuotas IMSS.</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}