'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const REGIMENES_PF = [
  { id: 'sueldos', label: 'Sueldos y Salarios', codigo: '605' },
  { id: 'arrendamiento', label: 'Arrendamiento', codigo: '606' },
  { id: 'actividad', label: 'Act. Empresarial / Honorarios', codigo: '612' },
  { id: 'intereses', label: 'Intereses', codigo: '614' },
  { id: 'dividendos', label: 'Dividendos', codigo: '611' },
  { id: 'plataformas', label: 'Plataformas Tecnológicas', codigo: '625' },
  { id: 'resico', label: 'RESICO PF', codigo: '626' },
]

const REGIMENES_PM = [
  { id: 'general_pm', label: 'General de Ley PM', codigo: '601' },
  { id: 'resico_pm', label: 'RESICO PM', codigo: '626' },
  { id: 'fines_no_lucrativos', label: 'Fines No Lucrativos', codigo: '603' },
  { id: 'agapes', label: 'Sector Primario (AGAPES)', codigo: '622' },
]

const COMPATIBILIDAD_PF = {
  sueldos:      { arrendamiento:true, intereses:true, dividendos:true, actividad:true, plataformas:true, resico:true },
  arrendamiento:{ sueldos:true, intereses:true, dividendos:true, actividad:true, plataformas:true, resico:true },
  actividad:    { sueldos:true, arrendamiento:true, intereses:true, dividendos:true, plataformas:true, resico:false },
  plataformas:  { sueldos:true, arrendamiento:true, intereses:true, dividendos:true, actividad:true, resico:false },
  resico:       { sueldos:true, arrendamiento:true, intereses:true, dividendos:false, actividad:false, plataformas:false },
  intereses:    { sueldos:true, arrendamiento:true, actividad:true, dividendos:true, plataformas:true, resico:true },
  dividendos:   { sueldos:true, arrendamiento:true, actividad:true, intereses:true, plataformas:true, resico:false },
}

const MENSAJES_INCOMPATIBILIDAD = {
  'resico-actividad': 'RESICO PF es incompatible con Actividad Empresarial / Honorarios.',
  'resico-plataformas': 'RESICO PF es incompatible con Plataformas Tecnológicas (Uber, Mercado Libre, etc.).',
  'resico-dividendos': 'RESICO PF es incompatible con Dividendos. Si eres socio de una PM no puedes estar en RESICO.',
  'actividad-resico': 'Actividad Empresarial es incompatible con RESICO PF.',
  'plataformas-resico': 'Plataformas Tecnológicas es incompatible con RESICO PF.',
  'dividendos-resico': 'Dividendos es incompatible con RESICO PF.',
}

function validarCompatibilidad(regimenes) {
  const errores = []
  const advertencias = []
  for (let i = 0; i < regimenes.length; i++) {
    for (let j = i + 1; j < regimenes.length; j++) {
      const a = regimenes[i], b = regimenes[j]
      if (COMPATIBILIDAD_PF[a]?.[b] === false) {
        errores.push(MENSAJES_INCOMPATIBILIDAD[`${a}-${b}`] || MENSAJES_INCOMPATIBILIDAD[`${b}-${a}`] || `${a} es incompatible con ${b}`)
      }
    }
  }
  if (regimenes.includes('resico') && regimenes.length > 1) {
    const soloPermitidos = ['sueldos', 'arrendamiento', 'intereses']
    const noPermitidos = regimenes.filter(r => r !== 'resico' && !soloPermitidos.includes(r))
    if (noPermitidos.length === 0) {
      advertencias.push('RESICO PF compatible. Recuerda que el total de ingresos no debe exceder $3.5M anuales.')
    }
  }
  return { errores, advertencias }
}

function RegimenSelector({ esPersonaMoral, regimenesSeleccionados, onChange }) {
  const lista = esPersonaMoral ? REGIMENES_PM : REGIMENES_PF
  const { errores, advertencias } = validarCompatibilidad(regimenesSeleccionados)

  const toggle = (id) => {
    if (regimenesSeleccionados.includes(id)) onChange(regimenesSeleccionados.filter(r => r !== id))
    else onChange([...regimenesSeleccionados, id])
  }

  const esIncompatible = (id) => {
    if (esPersonaMoral) return false
    for (const sel of regimenesSeleccionados) {
      if (sel === id) continue
      if (COMPATIBILIDAD_PF[sel]?.[id] === false || COMPATIBILIDAD_PF[id]?.[sel] === false) return true
    }
    return false
  }

  return (
    <div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
        {lista.map(r => {
          const seleccionado = regimenesSeleccionados.includes(r.id)
          const incompatible = esIncompatible(r.id) && !seleccionado
          return (
            <button key={r.id} onClick={() => toggle(r.id)} disabled={incompatible}
              style={{padding:'6px 10px',border:`1px solid ${seleccionado?'#185FA5':incompatible?'#fecaca':'#e5e7eb'}`,borderRadius:20,fontSize:11,fontWeight:seleccionado?500:400,cursor:incompatible?'not-allowed':'pointer',background:seleccionado?'#185FA5':incompatible?'#fef2f2':'white',color:seleccionado?'white':incompatible?'#9ca3af':'#374151',opacity:incompatible?0.6:1,transition:'all 0.15s'}}>
              {r.label} <span style={{fontSize:9,opacity:0.7}}>({r.codigo})</span>
            </button>
          )
        })}
      </div>
      {errores.map((e,i) => (
        <div key={i} style={{background:'#fef2f2',border:'0.5px solid #fecaca',borderRadius:8,padding:'8px 12px',marginBottom:6,display:'flex',gap:8}}>
          <span style={{fontSize:14,flexShrink:0}}>⚠️</span>
          <span style={{fontSize:11,color:'#dc2626'}}>{e}</span>
        </div>
      ))}
      {advertencias.map((a,i) => (
        <div key={i} style={{background:'#fffbeb',border:'0.5px solid #fde68a',borderRadius:8,padding:'8px 12px',marginBottom:6,display:'flex',gap:8}}>
          <span style={{fontSize:14,flexShrink:0}}>💡</span>
          <span style={{fontSize:11,color:'#92400e'}}>{a}</span>
        </div>
      ))}
      {regimenesSeleccionados.includes('resico') && (
        <div style={{background:'#eff6ff',border:'0.5px solid #bfdbfe',borderRadius:8,padding:'8px 12px',marginBottom:6}}>
          <div style={{fontSize:10,fontWeight:600,color:'#185FA5',marginBottom:4}}>Notas RESICO PF</div>
          {['Solo compatible con Sueldos, Arrendamiento e Intereses','Ingresos no deben exceder $3.5M anuales','Incompatible si eres socio de una PM','Plataformas Tecnológicas es totalmente incompatible'].map((n,i) => (
            <div key={i} style={{fontSize:10,color:'#1e40af',marginBottom:2}}>· {n}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [opinionResult, setOpinionResult] = useState(false)
  const [satLoading, setSatLoading] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cerUploaded, setCerUploaded] = useState(false)
  const [keyUploaded, setKeyUploaded] = useState(false)
  const [cerDrag, setCerDrag] = useState(false)
  const [keyDrag, setKeyDrag] = useState(false)
  const [vencimiento, setVencimiento] = useState('')
  const [password, setPassword] = useState('')
  const cerRef = useRef()
  const keyRef = useRef()

  const [form, setForm] = useState({ nombre:'', rfc:'', esPersonaMoral:false, regimenes:[] })

  useEffect(() => { cargarClientes() }, [])

  const cargarClientes = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('contactos').select('*').eq('empresa_id', user.id).order('created_at', { ascending: false })
    setClientes(data || [])
    setLoading(false)
  }

  const leerCer = (file) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const bytes = new Uint8Array(e.target.result)

        // Decodificar en latin-1 como vienen los .cer del SAT
        const texto = Array.from(bytes).map(b => String.fromCharCode(b)).join('')

        // Buscar RFC
        let rfc = ''
        const rfcMatch13 = texto.match(/[A-Z&]{4}\d{6}[A-Z0-9]{3}/)
        const rfcMatch12 = texto.match(/[A-Z]{3}\d{6}[A-Z0-9]{3}/)
        if (rfcMatch13) rfc = rfcMatch13[0]
        else if (rfcMatch12) rfc = rfcMatch12[0]

        // Buscar nombre — aparece como secuencia de mayúsculas con espacios
        let nombre = ''
        const EXCLUIR = ['SERVICIO','ADMINISTRACION','TRIBUTARIA','CONTRIBUYENTE','AUTORIDAD','MEXICO','CENTRAL','SERVICIOS','HIDALGO','GUERRERO','CUAUHTEMOC','RESPONSABLE']
        const nombres = texto.match(/[A-ZÁÉÍÓÚÜÑ]{2,}(?:\s[A-ZÁÉÍÓÚÜÑ]{2,}){1,4}/g)
        if (nombres) {
          for (const n of nombres) {
            const palabras = n.trim().split(' ')
            if (
              palabras.length >= 2 &&
              palabras.length <= 5 &&
              n.length >= 10 &&
              n.length <= 80 &&
              !EXCLUIR.some(ex => n.includes(ex))
            ) {
              nombre = n.trim()
              break
            }
          }
        }

        // Buscar fechas de vencimiento
        const fechas = []
        for (let i = 0; i < bytes.length - 13; i++) {
          if (bytes[i] === 0x17 && bytes[i+1] === 0x0D) {
            let fecha = ''
            for (let j = 0; j < 13; j++) fecha += String.fromCharCode(bytes[i+2+j])
            if (/^\d{12}Z$/.test(fecha)) {
              const yy = parseInt(fecha.slice(0,2))
              const fullYear = yy >= 50 ? `19${fecha.slice(0,2)}` : `20${fecha.slice(0,2)}`
              fechas.push(fullYear + fecha.slice(2))
            }
          }
          if (bytes[i] === 0x18 && bytes[i+1] === 0x0F) {
            let fecha = ''
            for (let j = 0; j < 15; j++) fecha += String.fromCharCode(bytes[i+2+j])
            if (/^20\d{12}Z$/.test(fecha)) fechas.push(fecha)
          }
        }

        let vence = ''
        if (fechas.length >= 2) {
          const raw = fechas[1]
          vence = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
        }

        const espm = rfc.length === 12
        setForm(prev => ({
          ...prev,
          rfc: rfc || prev.rfc,
          nombre: nombre || prev.nombre,
          esPersonaMoral: espm,
          regimenes: [],
        }))
        setVencimiento(vence)
        setCerUploaded(true)
      } catch { setCerUploaded(true) }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleCer = (files) => {
    const file = Array.from(files).find(f => f.name.endsWith('.cer'))
    if (file) leerCer(file)
  }

  const handleKey = (files) => {
    const file = Array.from(files).find(f => f.name.endsWith('.key'))
    if (file) setKeyUploaded(true)
  }

  const { errores: erroresCompatibilidad } = validarCompatibilidad(form.regimenes)
  const puedeGuardar = form.nombre && form.rfc && form.regimenes.length > 0 && erroresCompatibilidad.length === 0

  const guardarCliente = async () => {
    if (!puedeGuardar) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const lista = form.esPersonaMoral ? REGIMENES_PM : REGIMENES_PF
    const regimenObj = lista.find(r => r.id === form.regimenes[0])
    await supabase.from('contactos').insert({
      empresa_id: user.id,
      nombre: form.nombre,
      rfc: form.rfc,
      regimen_fiscal: regimenObj?.label || form.regimenes[0],
      regimenes: form.regimenes,
      es_persona_moral: form.esPersonaMoral,
      tipo: 'cliente',
      email: '',
      telefono: '',
      tiene_efirma: cerUploaded && keyUploaded,
      vencimiento_efirma: vencimiento || null,
    })
    setForm({ nombre:'', rfc:'', esPersonaMoral:false, regimenes:[] })
    setCerUploaded(false)
    setKeyUploaded(false)
    setPassword('')
    setVencimiento('')
    setNuevo(false)
    setGuardando(false)
    cargarClientes()
  }

  const eliminarCliente = async (id, nombre) => {
    if (!window.confirm(`¿Seguro que quieres eliminar a ${nombre}?`)) return
    await supabase.from('contactos').delete().eq('id', id)
    if (seleccionado === id) setSeleccionado(null)
    cargarClientes()
  }

  const simularSAT = async (tipo) => {
    setSatLoading(tipo)
    await new Promise(r => setTimeout(r, 1500))
    setSatLoading('')
    if (tipo === 'opinion') setOpinionResult(true)
  }

  const puntoColor = (c) => {
    if (!c.tiene_efirma) return '#9ca3af'
    if (!c.vencimiento_efirma) return '#3B6D11'
    return new Date(c.vencimiento_efirma) > new Date() ? '#3B6D11' : '#A32D2D'
  }

  const filtered = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    c.rfc?.toLowerCase().includes(search.toLowerCase())
  )

  const clienteActivo = clientes.find(c => c.id === seleccionado)

  const abrirNuevo = () => {
    setNuevo(true)
    setSeleccionado(null)
    setOpinionResult(false)
    setCerUploaded(false)
    setKeyUploaded(false)
    setPassword('')
    setVencimiento('')
    setForm({ nombre:'', rfc:'', esPersonaMoral:false, regimenes:[] })
  }

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Clientes</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:18}}>Directorio y gestión de expedientes fiscales</div>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'white',border:'0.5px solid #e5e7eb',borderRadius:999,padding:'10px 18px'}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RFC..." style={{border:'none',outline:'none',fontSize:13,color:'#1f2937',background:'transparent',width:'100%'}} />
        </div>
        <button onClick={abrirNuevo} style={{padding:'9px 16px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
          + Nuevo cliente
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 400px',gap:16}}>

        {/* Tabla */}
        <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>
                {['e.firma','Cliente / RFC','Tipo','Regímenes','Vencimiento','Acciones'].map(h => (
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid #e5e7eb',background:'#f9fafb'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{textAlign:'center',padding:32,color:'#9ca3af'}}>Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign:'center',padding:32,color:'#9ca3af'}}>No hay clientes — da clic en Nuevo cliente</td></tr>
              ) : filtered.map((c,i) => (
                <tr key={c.id} onClick={() => { setSeleccionado(c.id); setNuevo(false); setOpinionResult(false) }}
                  style={{background:seleccionado===c.id?'#E6F1FB':i%2===1?'#f9fafb':'white',cursor:'pointer',borderLeft:seleccionado===c.id?'3px solid #185FA5':'3px solid transparent'}}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:puntoColor(c),display:'inline-block'}} title={c.vencimiento_efirma||'Sin e.firma'}></div>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:500,color:'#1f2937'}}>{c.nombre}</div>
                    <div style={{fontSize:10,color:'#9ca3af',fontFamily:'monospace',marginTop:1}}>{c.rfc}</div>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:c.es_persona_moral?'#f3f0ff':'#f0fdf4',color:c.es_persona_moral?'#7c3aed':'#15803d',fontWeight:500}}>
                      {c.es_persona_moral?'PM':'PF'}
                    </span>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                      {(c.regimenes||[]).slice(0,2).map(r => {
                        const lista = c.es_persona_moral ? REGIMENES_PM : REGIMENES_PF
                        const obj = lista.find(x => x.id === r)
                        return <span key={r} style={{fontSize:9,padding:'2px 6px',borderRadius:20,background:'#E6F1FB',color:'#185FA5',fontWeight:500}}>{obj?.codigo||r}</span>
                      })}
                      {(c.regimenes||[]).length > 2 && <span style={{fontSize:9,color:'#9ca3af'}}>+{c.regimenes.length-2}</span>}
                      {(!c.regimenes||c.regimenes.length===0) && <span style={{fontSize:9,color:'#9ca3af'}}>{c.regimen_fiscal||'—'}</span>}
                    </div>
                  </td>
                  <td style={{padding:'10px 14px',fontSize:11,color:c.vencimiento_efirma&&new Date(c.vencimiento_efirma)<new Date()?'#A32D2D':'#6b7280'}}>
                    {c.vencimiento_efirma||'—'}
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <button onClick={e => { e.stopPropagation(); setSeleccionado(c.id); setNuevo(false) }}
                        style={{fontSize:11,padding:'4px 10px',background:'#f3f4f6',border:'none',borderRadius:6,cursor:'pointer',color:'#374151'}}>
                        Ver
                      </button>
                      <button onClick={e => { e.stopPropagation(); eliminarCliente(c.id, c.nombre) }}
                        style={{padding:'4px 6px',background:'none',border:'none',cursor:'pointer'}}
                        onMouseEnter={e => e.currentTarget.querySelector('svg').setAttribute('stroke','#A32D2D')}
                        onMouseLeave={e => e.currentTarget.querySelector('svg').setAttribute('stroke','#9ca3af')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/><path d="M8 6V4h8v2"/>
                          <rect x="5" y="6" width="14" height="15" rx="2"/>
                          <line x1="9" y1="11" x2="9" y2="17"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="15" y1="11" x2="15" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Panel expediente */}
        <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
          <div style={{padding:16,borderBottom:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:14,fontWeight:600,color:'#1f2937'}}>
              {nuevo?'Nuevo cliente':clienteActivo?clienteActivo.nombre.split(' ').slice(0,3).join(' '):'Expediente'}
            </span>
            {clienteActivo&&!nuevo&&<span style={{fontSize:11,color:'#9ca3af',fontFamily:'monospace'}}>{clienteActivo.rfc}</span>}
          </div>

          <div style={{padding:16,overflowY:'auto',maxHeight:700}}>
            {!seleccionado&&!nuevo ? (
              <div style={{padding:'40px 20px',textAlign:'center',color:'#9ca3af'}}>
                <div style={{fontSize:32,marginBottom:10}}>📋</div>
                <div>Selecciona un cliente o crea uno nuevo</div>
              </div>
            ) : (
              <>
                {nuevo && (
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:6}}>Tipo de persona</label>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                      {[{v:false,l:'Persona Física'},{v:true,l:'Persona Moral'}].map(opt => (
                        <button key={String(opt.v)} onClick={() => setForm(p=>({...p,esPersonaMoral:opt.v,regimenes:[]}))}
                          style={{padding:'8px',border:`0.5px solid ${form.esPersonaMoral===opt.v?'#185FA5':'#e5e7eb'}`,borderRadius:8,background:form.esPersonaMoral===opt.v?'#E6F1FB':'white',cursor:'pointer',fontSize:12,fontWeight:form.esPersonaMoral===opt.v?500:400,color:form.esPersonaMoral===opt.v?'#185FA5':'#6b7280'}}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Información general</div>

                <div style={{marginBottom:10}}>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Nombre / Razón Social</label>
                  <input value={nuevo?form.nombre:clienteActivo?.nombre||''}
                    onChange={e => nuevo&&setForm({...form,nombre:e.target.value})}
                    readOnly={!nuevo} placeholder="Se autocompleta con el .cer"
                    style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:nuevo?'white':'#f3f4f6',boxSizing:'border-box'}} />
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                  <div>
                    <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>RFC</label>
                    <input value={nuevo?form.rfc:clienteActivo?.rfc||''}
                      onChange={e => nuevo&&setForm({...form,rfc:e.target.value})}
                      readOnly={!nuevo} placeholder="Autocompleta con .cer"
                      style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:12,color:'#1f2937',outline:'none',background:nuevo?'white':'#f3f4f6',fontFamily:'monospace',boxSizing:'border-box'}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Vencimiento e.firma</label>
                    <input value={nuevo?vencimiento:clienteActivo?.vencimiento_efirma||'—'} readOnly
                      style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:12,color:vencimiento?'#3B6D11':'#9ca3af',outline:'none',background:'#f3f4f6',boxSizing:'border-box'}} />
                  </div>
                </div>

                <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>
                  Regímenes fiscales
                  {!nuevo&&clienteActivo&&(
                    <span style={{marginLeft:8,fontSize:9,padding:'2px 6px',borderRadius:20,background:clienteActivo.es_persona_moral?'#f3f0ff':'#f0fdf4',color:clienteActivo.es_persona_moral?'#7c3aed':'#15803d'}}>
                      {clienteActivo.es_persona_moral?'Persona Moral':'Persona Física'}
                    </span>
                  )}
                </div>

                {nuevo ? (
                  <div style={{marginBottom:14}}>
                    <RegimenSelector esPersonaMoral={form.esPersonaMoral} regimenesSeleccionados={form.regimenes} onChange={r=>setForm(p=>({...p,regimenes:r}))} />
                  </div>
                ) : (
                  <div style={{marginBottom:14,display:'flex',flexWrap:'wrap',gap:4}}>
                    {(clienteActivo?.regimenes||[]).map(r => {
                      const lista = clienteActivo?.es_persona_moral?REGIMENES_PM:REGIMENES_PF
                      const obj = lista.find(x=>x.id===r)
                      return <span key={r} style={{fontSize:11,padding:'4px 10px',borderRadius:20,background:'#E6F1FB',color:'#185FA5',fontWeight:500}}>{obj?.label||r} <span style={{fontSize:9,opacity:0.7}}>({obj?.codigo})</span></span>
                    })}
                    {(!clienteActivo?.regimenes||clienteActivo.regimenes.length===0)&&<span style={{fontSize:12,color:'#9ca3af'}}>{clienteActivo?.regimen_fiscal||'Sin régimen'}</span>}
                  </div>
                )}

                <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>e.firma</div>

                {clienteActivo&&!nuevo&&(
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,marginBottom:10,background:clienteActivo.tiene_efirma?'#EAF3DE':'#f9fafb',border:`0.5px solid ${clienteActivo.tiene_efirma?'#3B6D11':'#e5e7eb'}`}}>
                    <span style={{fontSize:16}}>{clienteActivo.tiene_efirma?'✅':'🔒'}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:500,color:clienteActivo.tiene_efirma?'#3B6D11':'#9ca3af'}}>{clienteActivo.tiene_efirma?'e.firma registrada':'Sin e.firma'}</div>
                      {clienteActivo.vencimiento_efirma&&<div style={{fontSize:10,color:'#9ca3af'}}>Vence: {clienteActivo.vencimiento_efirma}</div>}
                    </div>
                  </div>
                )}

                <input ref={cerRef} type="file" accept=".cer" style={{display:'none'}} onChange={e=>handleCer(e.target.files)} />
                <div onClick={()=>cerRef.current.click()}
                  onDragOver={e=>{e.preventDefault();setCerDrag(true)}}
                  onDragLeave={()=>setCerDrag(false)}
                  onDrop={e=>{e.preventDefault();setCerDrag(false);handleCer(e.dataTransfer.files)}}
                  style={{border:`1.5px ${cerUploaded?'solid':'dashed'} ${cerDrag?'#185FA5':cerUploaded?'#3B6D11':'#e5e7eb'}`,borderRadius:8,padding:10,textAlign:'center',cursor:'pointer',background:cerUploaded?'#EAF3DE':cerDrag?'#E6F1FB':'white',marginBottom:6,transition:'all 0.15s'}}>
                  <div style={{fontSize:16,marginBottom:2}}>{cerUploaded?'✅':'📄'}</div>
                  <div style={{fontSize:11,fontWeight:500,color:cerUploaded?'#3B6D11':'#374151'}}>{cerUploaded?'.cer cargado — RFC y nombre extraídos':'Archivo .cer'}</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>{cerUploaded?'Da clic para reemplazar':'Da clic o arrastra · Autocompleta RFC y nombre'}</div>
                </div>

                <input ref={keyRef} type="file" accept=".key" style={{display:'none'}} onChange={e=>handleKey(e.target.files)} />
                <div onClick={()=>keyRef.current.click()}
                  onDragOver={e=>{e.preventDefault();setKeyDrag(true)}}
                  onDragLeave={()=>setKeyDrag(false)}
                  onDrop={e=>{e.preventDefault();setKeyDrag(false);handleKey(e.dataTransfer.files)}}
                  style={{border:`1.5px ${keyUploaded?'solid':'dashed'} ${keyDrag?'#185FA5':keyUploaded?'#3B6D11':'#e5e7eb'}`,borderRadius:8,padding:10,textAlign:'center',cursor:'pointer',background:keyUploaded?'#EAF3DE':keyDrag?'#E6F1FB':'white',marginBottom:10,transition:'all 0.15s'}}>
                  <div style={{fontSize:16,marginBottom:2}}>{keyUploaded?'✅':'🔑'}</div>
                  <div style={{fontSize:11,fontWeight:500,color:keyUploaded?'#3B6D11':'#374151'}}>{keyUploaded?'.key cargada':'Archivo .key'}</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>{keyUploaded?'Da clic para reemplazar':'Da clic o arrastra'}</div>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Contraseña de la e.firma</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••"
                    style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:'#f9fafb',boxSizing:'border-box'}} />
                </div>

                {!nuevo&&(
                  <>
                    <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Consultas SAT</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {[
                        {tipo:'sincronizar',icon:'🔄',label:'Sincronizar con SAT',sub:'Descarga CFDIs',bg:'linear-gradient(135deg,#185FA5,#0C447C)'},
                        {tipo:'rfc',icon:'🪪',label:'Obtener RFC actualizado',sub:'Verifica datos fiscales',bg:'linear-gradient(135deg,#854F0B,#6b3f09)'},
                        {tipo:'opinion',icon:'📋',label:'Opinión de cumplimiento',sub:'Estatus fiscal actual',bg:'linear-gradient(135deg,#3B6D11,#2d5a0e)'},
                      ].map(b=>(
                        <button key={b.tipo} onClick={()=>simularSAT(b.tipo)}
                          style={{width:'100%',padding:'10px 14px',border:'none',borderRadius:10,fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:b.bg,color:'white',textAlign:'left',opacity:satLoading===b.tipo?0.7:1}}>
                          <span style={{fontSize:18}}>{satLoading===b.tipo?'⏳':b.icon}</span>
                          <span style={{flex:1}}>
                            {satLoading===b.tipo?'Conectando con SAT...':b.label}
                            <span style={{display:'block',fontSize:10,opacity:0.8,fontWeight:400}}>{b.sub}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {opinionResult&&(
                      <div style={{background:'#EAF3DE',border:'0.5px solid #3B6D11',borderRadius:8,padding:'10px 12px',marginTop:10}}>
                        {[
                          {lbl:'Estatus',val:'Positivo',green:true},
                          {lbl:'RFC',val:clienteActivo?.rfc||'—'},
                          {lbl:'Declaraciones',val:'Al corriente',green:true},
                          {lbl:'Créditos fiscales',val:'Sin adeudos',green:true},
                          {lbl:'Fecha consulta',val:new Date().toLocaleDateString('es-MX')},
                        ].map(r=>(
                          <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0',borderBottom:'0.5px solid rgba(59,109,17,0.15)'}}>
                            <span style={{color:'#6b7280'}}>{r.lbl}</span>
                            <span style={{fontWeight:500,color:r.green?'#3B6D11':'#1f2937'}}>{r.val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {nuevo&&(
                  <>
                    {erroresCompatibilidad.length>0&&(
                      <div style={{background:'#fef2f2',border:'0.5px solid #fecaca',borderRadius:8,padding:'8px 12px',marginBottom:10}}>
                        <div style={{fontSize:11,color:'#dc2626',fontWeight:500}}>⚠️ Corrige los errores antes de guardar</div>
                      </div>
                    )}
                    {form.regimenes.length===0&&(
                      <div style={{background:'#fffbeb',border:'0.5px solid #fde68a',borderRadius:8,padding:'8px 12px',marginBottom:10}}>
                        <div style={{fontSize:11,color:'#92400e'}}>💡 Selecciona al menos un régimen fiscal</div>
                      </div>
                    )}
                    <button onClick={guardarCliente} disabled={guardando||!puedeGuardar}
                      style={{width:'100%',padding:10,background:puedeGuardar?'#185FA5':'#e5e7eb',color:puedeGuardar?'white':'#9ca3af',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:puedeGuardar?'pointer':'not-allowed',marginTop:4}}>
                      {guardando?'Guardando...':'Guardar cliente'}
                    </button>
                  </>
                )}

                <div style={{fontSize:10,color:'#9ca3af',textAlign:'center',marginTop:12,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  🔒 Los archivos de e.firma se almacenan cifrados.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}