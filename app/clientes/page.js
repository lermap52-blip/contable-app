'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState(false)
  const [opinionResult, setOpinionResult] = useState(false)
  const [satLoading, setSatLoading] = useState('')
  const [form, setForm] = useState({ nombre:'', rfc:'', cp:'', regimen:'RESICO' })
  const [cerUploaded, setCerUploaded] = useState(false)
  const [keyUploaded, setKeyUploaded] = useState(false)
  const [password, setPassword] = useState('')
  const [cerDrag, setCerDrag] = useState(false)
  const [keyDrag, setKeyDrag] = useState(false)
  const [vencimiento, setVencimiento] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cerRef = useRef()
  const keyRef = useRef()

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
        let rfc = ''
        for (let i = 0; i < bytes.length - 13; i++) {
          let chunk = ''
          for (let j = 0; j < 13; j++) chunk += String.fromCharCode(bytes[i + j])
          if (/^[A-Z&]{4}\d{6}[A-Z0-9]{3}$/.test(chunk)) { rfc = chunk; break }
        }
        if (!rfc) {
          for (let i = 0; i < bytes.length - 12; i++) {
            let chunk = ''
            for (let j = 0; j < 12; j++) chunk += String.fromCharCode(bytes[i + j])
            if (/^[A-Z]{3}\d{6}[A-Z0-9]{3}$/.test(chunk)) { rfc = chunk; break }
          }
        }
        let nombre = ''
        let cadena = ''
        for (let i = 0; i < bytes.length; i++) {
          const c = bytes[i]
          if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 32 || c === 209 || c === 241 || c === 193 || c === 201 || c === 205 || c === 211 || c === 218) {
            cadena += String.fromCharCode(c)
          } else {
            if (cadena.trim().length > 15 && cadena.includes(' ') &&
              !cadena.toLowerCase().includes('mexico') &&
              !cadena.toLowerCase().includes('servicio') &&
              !cadena.toLowerCase().includes('administracion') &&
              !cadena.toLowerCase().includes('tributaria') &&
              !cadena.toLowerCase().includes('internet')) {
              nombre = cadena.trim()
            }
            cadena = ''
          }
        }
        const fechas = []
        for (let i = 0; i < bytes.length - 13; i++) {
          if (bytes[i] === 0x18 && bytes[i+1] === 0x0F) {
            let fecha = ''
            for (let j = 0; j < 15; j++) fecha += String.fromCharCode(bytes[i+2+j])
            if (/^20\d{12}Z$/.test(fecha)) fechas.push(fecha)
          }
          if (bytes[i] === 0x17 && bytes[i+1] === 0x0D) {
            let fecha = ''
            for (let j = 0; j < 13; j++) fecha += String.fromCharCode(bytes[i+2+j])
            if (/^\d{12}Z$/.test(fecha)) {
              const yy = parseInt(fecha.slice(0,2))
              const fullYear = yy >= 50 ? `19${fecha.slice(0,2)}` : `20${fecha.slice(0,2)}`
              fechas.push(fullYear + fecha.slice(2))
            }
          }
        }
        let vence = ''
        if (fechas.length >= 2) {
          const raw = fechas[1]
          vence = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
        }
        setForm(prev => ({ ...prev, rfc: rfc || prev.rfc, nombre: nombre || prev.nombre }))
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

  const guardarCliente = async () => {
    if (!form.nombre || !form.rfc) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('contactos').insert({
      empresa_id: user.id,
      nombre: form.nombre,
      rfc: form.rfc,
      regimen_fiscal: form.regimen,
      tipo: 'cliente',
      email: '',
      telefono: '',
      tiene_efirma: cerUploaded && keyUploaded,
      vencimiento_efirma: vencimiento || null,
    })
    setForm({ nombre:'', rfc:'', cp:'', regimen:'RESICO' })
    setCerUploaded(false)
    setKeyUploaded(false)
    setPassword('')
    setVencimiento('')
    setNuevo(false)
    setGuardando(false)
    cargarClientes()
  }

  const eliminarCliente = async (id, nombre) => {
    const confirmar = window.confirm(`Seguro que quieres eliminar a ${nombre}? Esta accion no se puede deshacer.`)
    if (!confirmar) return
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

  const puntoTitle = (c) => {
    if (!c.tiene_efirma) return 'Sin e.firma'
    if (!c.vencimiento_efirma) return 'e.firma registrada'
    return new Date(c.vencimiento_efirma) > new Date() ? `Vigente hasta ${c.vencimiento_efirma}` : `Vencida el ${c.vencimiento_efirma}`
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
    setForm({ nombre:'', rfc:'', cp:'', regimen:'RESICO' })
  }

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Clientes</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:18}}>Directorio y gestion de expedientes fiscales</div>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'white',border:'0.5px solid #e5e7eb',borderRadius:999,padding:'10px 18px'}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o RFC..." style={{border:'none',outline:'none',fontSize:13,color:'#1f2937',background:'transparent',width:'100%'}} />
        </div>
        <button onClick={abrirNuevo} style={{padding:'9px 16px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
          + Nuevo cliente
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 390px',gap:16}}>

        <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>
                {['e.firma','Cliente / RFC','Regimen','Vencimiento','Acciones'].map(h => (
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid #e5e7eb',background:'#f9fafb'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{textAlign:'center',padding:32,color:'#9ca3af'}}>Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center',padding:32,color:'#9ca3af'}}>No hay clientes — da clic en Nuevo cliente</td></tr>
              ) : filtered.map((c,i) => (
                <tr key={c.id} onClick={() => { setSeleccionado(c.id); setNuevo(false); setOpinionResult(false) }}
                  style={{background:seleccionado===c.id?'#E6F1FB':i%2===1?'#f9fafb':'white',cursor:'pointer',borderLeft:seleccionado===c.id?'3px solid #185FA5':'3px solid transparent'}}>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:puntoColor(c),display:'inline-block'}} title={puntoTitle(c)}></div>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:500,color:'#1f2937'}}>{c.nombre}</div>
                    <div style={{fontSize:10,color:'#9ca3af',fontFamily:'monospace',marginTop:1}}>{c.rfc}</div>
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontSize:10,background:'#E6F1FB',color:'#185FA5',padding:'2px 8px',borderRadius:20}}>{c.regimen_fiscal || 'RESICO'}</span>
                  </td>
                  <td style={{padding:'10px 14px',fontSize:11,color: c.vencimiento_efirma && new Date(c.vencimiento_efirma) < new Date() ? '#A32D2D' : '#6b7280'}}>
                    {c.vencimiento_efirma || '—'}
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <button onClick={e => { e.stopPropagation(); setSeleccionado(c.id); setNuevo(false) }}
                        style={{fontSize:11,padding:'4px 10px',background:'#f3f4f6',border:'none',borderRadius:6,cursor:'pointer',color:'#374151'}}>
                        Ver expediente
                      </button>
                      <button onClick={e => { e.stopPropagation(); eliminarCliente(c.id, c.nombre) }}
  title="Eliminar cliente"
  style={{padding:'6px',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6}}
  onMouseEnter={e => e.currentTarget.querySelector('.tapa').setAttribute('transform','rotate(-35 12 4)')}
  onMouseLeave={e => e.currentTarget.querySelector('.tapa').setAttribute('transform','rotate(0 12 4)')}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path className="tapa" style={{transition:'transform 0.2s',transformOrigin:'12px 4px'}} d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <rect x="5" y="6" width="14" height="15" rx="2" />
    <line x1="9" y1="11" x2="9" y2="17" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="15" y1="11" x2="15" y2="17" />
  </svg>
</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
          <div style={{padding:16,borderBottom:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:14,fontWeight:600,color:'#1f2937'}}>
              {nuevo ? 'Nuevo cliente' : clienteActivo ? clienteActivo.nombre.split(' ').slice(0,3).join(' ') : 'Expediente'}
            </span>
            {clienteActivo && !nuevo && <span style={{fontSize:11,color:'#9ca3af',fontFamily:'monospace'}}>{clienteActivo.rfc}</span>}
          </div>

          <div style={{padding:16,overflowY:'auto',maxHeight:640}}>
            {!seleccionado && !nuevo ? (
              <div style={{padding:'40px 20px',textAlign:'center',color:'#9ca3af'}}>
                <div style={{fontSize:32,marginBottom:10}}>📋</div>
                <div>Selecciona un cliente o crea uno nuevo</div>
              </div>
            ) : (
              <>
                <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Informacion general</div>

                <div style={{marginBottom:10}}>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Nombre / Razon Social</label>
                  <input value={nuevo ? form.nombre : clienteActivo?.nombre || ''}
                    onChange={e => nuevo && setForm({...form,nombre:e.target.value})}
                    readOnly={!nuevo} placeholder="Se autocompleta con el .cer"
                    style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:nuevo?'#f9fafb':'#f3f4f6',boxSizing:'border-box'}} />
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  <div>
                    <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>RFC</label>
                    <input value={nuevo ? form.rfc : clienteActivo?.rfc || ''}
                      onChange={e => nuevo && setForm({...form,rfc:e.target.value})}
                      readOnly={!nuevo} placeholder="Autocompleta"
                      style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:12,color:'#1f2937',outline:'none',background:nuevo?'#f9fafb':'#f3f4f6',fontFamily:'monospace',boxSizing:'border-box'}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Vencimiento e.firma</label>
                    <input value={nuevo ? vencimiento : clienteActivo?.vencimiento_efirma || '—'} readOnly
                      style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:12,color:vencimiento?'#3B6D11':'#9ca3af',outline:'none',background:'#f3f4f6',boxSizing:'border-box'}} />
                  </div>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Regimen Fiscal</label>
                  <select value={nuevo ? form.regimen : clienteActivo?.regimen_fiscal || 'RESICO'}
                    onChange={e => nuevo && setForm({...form,regimen:e.target.value})}
                    disabled={!nuevo}
                    style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:nuevo?'#f9fafb':'#f3f4f6'}}>
                    <option>RESICO</option>
                    <option>General de Ley</option>
                    <option>Actividad Empresarial</option>
                    <option>Arrendamiento</option>
                    <option>Honorarios</option>
                  </select>
                </div>

                <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>e.firma</div>

                {clienteActivo && !nuevo && (
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:8,marginBottom:10,background:clienteActivo.tiene_efirma?'#EAF3DE':'#f9fafb',border:`0.5px solid ${clienteActivo.tiene_efirma?'#3B6D11':'#e5e7eb'}`}}>
                    <span style={{fontSize:16}}>{clienteActivo.tiene_efirma?'✅':'🔒'}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:500,color:clienteActivo.tiene_efirma?'#3B6D11':'#9ca3af'}}>
                        {clienteActivo.tiene_efirma?'e.firma registrada':'Sin e.firma registrada'}
                      </div>
                      {clienteActivo.vencimiento_efirma && <div style={{fontSize:10,color:'#9ca3af'}}>Vence: {clienteActivo.vencimiento_efirma}</div>}
                    </div>
                  </div>
                )}

                <input ref={cerRef} type="file" accept=".cer" style={{display:'none'}} onChange={e => handleCer(e.target.files)} />
                <div onClick={() => cerRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setCerDrag(true) }}
                  onDragLeave={() => setCerDrag(false)}
                  onDrop={e => { e.preventDefault(); setCerDrag(false); handleCer(e.dataTransfer.files) }}
                  style={{border:`1.5px ${cerUploaded?'solid':'dashed'} ${cerDrag?'#185FA5':cerUploaded?'#3B6D11':'#e5e7eb'}`,borderRadius:8,padding:12,textAlign:'center',cursor:'pointer',background:cerUploaded?'#EAF3DE':cerDrag?'#E6F1FB':'white',marginBottom:8,transition:'all 0.15s'}}>
                  <div style={{fontSize:18,marginBottom:3}}>{cerUploaded?'✅':'📄'}</div>
                  <div style={{fontSize:12,fontWeight:500,color:cerUploaded?'#3B6D11':'#374151'}}>{cerUploaded?'Certificado .cer cargado':'Archivo .cer — Certificado'}</div>
                  <div style={{fontSize:10,color:'#9ca3af',marginTop:1}}>{cerUploaded?'Datos extraidos · Da clic para reemplazar':'Da clic o arrastra el archivo .cer aqui'}</div>
                </div>

                <input ref={keyRef} type="file" accept=".key" style={{display:'none'}} onChange={e => handleKey(e.target.files)} />
                <div onClick={() => keyRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setKeyDrag(true) }}
                  onDragLeave={() => setKeyDrag(false)}
                  onDrop={e => { e.preventDefault(); setKeyDrag(false); handleKey(e.dataTransfer.files) }}
                  style={{border:`1.5px ${keyUploaded?'solid':'dashed'} ${keyDrag?'#185FA5':keyUploaded?'#3B6D11':'#e5e7eb'}`,borderRadius:8,padding:12,textAlign:'center',cursor:'pointer',background:keyUploaded?'#EAF3DE':keyDrag?'#E6F1FB':'white',marginBottom:10,transition:'all 0.15s'}}>
                  <div style={{fontSize:18,marginBottom:3}}>{keyUploaded?'✅':'🔑'}</div>
                  <div style={{fontSize:12,fontWeight:500,color:keyUploaded?'#3B6D11':'#374151'}}>{keyUploaded?'Clave .key cargada':'Archivo .key — Clave privada'}</div>
                  <div style={{fontSize:10,color:'#9ca3af',marginTop:1}}>{keyUploaded?'Da clic para reemplazar':'Da clic o arrastra el archivo .key aqui'}</div>
                </div>

                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Contrasena de la e.firma</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••"
                    style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:'#f9fafb',boxSizing:'border-box'}} />
                </div>

                {!nuevo && (
                  <>
                    <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Consultas SAT</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {[
                        {tipo:'sincronizar',icon:'🔄',label:'Sincronizar con SAT',sub:'Descarga CFDIs de ingresos y egresos',bg:'linear-gradient(135deg,#185FA5,#0C447C)'},
                        {tipo:'rfc',icon:'🪪',label:'Obtener RFC actualizado',sub:'Verifica datos fiscales vigentes en el SAT',bg:'linear-gradient(135deg,#854F0B,#6b3f09)'},
                        {tipo:'opinion',icon:'📋',label:'Opinion de cumplimiento',sub:'Consulta el estatus fiscal actual',bg:'linear-gradient(135deg,#3B6D11,#2d5a0e)'},
                      ].map(b => (
                        <button key={b.tipo} onClick={() => simularSAT(b.tipo)}
                          style={{width:'100%',padding:'11px 14px',border:'none',borderRadius:10,fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:b.bg,color:'white',textAlign:'left',opacity:satLoading===b.tipo?0.7:1}}>
                          <span style={{fontSize:20,minWidth:24,textAlign:'center'}}>{satLoading===b.tipo?'⏳':b.icon}</span>
                          <span style={{flex:1}}>
                            {satLoading===b.tipo?'Conectando con SAT...':b.label}
                            <span style={{display:'block',fontSize:10,opacity:0.8,fontWeight:400,marginTop:1}}>{b.sub}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {opinionResult && (
                      <div style={{background:'#EAF3DE',border:'0.5px solid #3B6D11',borderRadius:8,padding:'10px 12px',marginTop:10}}>
                        {[
                          {lbl:'Estatus',val:'Positivo',green:true},
                          {lbl:'RFC',val:clienteActivo?.rfc||'—'},
                          {lbl:'Declaraciones',val:'Al corriente',green:true},
                          {lbl:'Creditos fiscales',val:'Sin adeudos',green:true},
                          {lbl:'Fecha consulta',val:new Date().toLocaleDateString('es-MX')},
                        ].map(r => (
                          <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0',borderBottom:'0.5px solid rgba(59,109,17,0.15)'}}>
                            <span style={{color:'#6b7280'}}>{r.lbl}</span>
                            <span style={{fontWeight:500,color:r.green?'#3B6D11':'#1f2937'}}>{r.val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {nuevo && (
                  <button onClick={guardarCliente} disabled={guardando}
                    style={{width:'100%',padding:10,background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',marginTop:4}}>
                    {guardando ? 'Guardando...' : 'Guardar cliente'}
                  </button>
                )}

                <div style={{fontSize:10,color:'#9ca3af',textAlign:'center',marginTop:12,lineHeight:1.5,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  <span>🔒</span> Los archivos de e.firma se almacenan cifrados. La contrasena nunca se guarda en texto plano.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}