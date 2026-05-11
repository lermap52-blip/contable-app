'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabase'

const coloresAvatar = [
  '#185FA5', '#3B6D11', '#A32D2D', '#854F0B',
  '#7C3AED', '#0F6E56', '#B8456A', '#1D6A7A',
  '#4A4A4A', '#C65C00',
]

export default function Configuracion() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [avatarColor, setAvatarColor] = useState('#185FA5')
  const [avatarImg, setAvatarImg] = useState(null)
  const [appNombre, setAppNombre] = useState('Audify')
  const [logoImg, setLogoImg] = useState(null)
  const [modoFrontera, setModoFrontera] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  const [cerUploaded, setCerUploaded] = useState(false)
  const [keyUploaded, setKeyUploaded] = useState(false)
  const [cerDrag, setCerDrag] = useState(false)
  const [keyDrag, setKeyDrag] = useState(false)
  const [vencimientoEfirma, setVencimientoEfirma] = useState('')
  const [rfcExtraido, setRfcExtraido] = useState('')
  const [password, setPassword] = useState('')

  const avatarRef = useRef()
  const logoRef = useRef()
  const cerRef = useRef()
  const keyRef = useRef()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email || '')
        setNombre(data.user.user_metadata?.nombre || data.user.email?.split('@')[0] || '')
        setAvatarColor(data.user.user_metadata?.avatarColor || '#185FA5')
        setAppNombre(data.user.user_metadata?.appNombre || 'Audify')
        setModoFrontera(data.user.user_metadata?.modoFrontera || false)
      }
    })
    const saved = localStorage.getItem('config_app')
    if (saved) {
      const c = JSON.parse(saved)
      if (c.avatarColor) setAvatarColor(c.avatarColor)
      if (c.appNombre) setAppNombre(c.appNombre)
      if (c.modoFrontera !== undefined) setModoFrontera(c.modoFrontera)
      if (c.darkMode !== undefined) setDarkMode(c.darkMode)
      if (c.nombre) setNombre(c.nombre)
      if (c.vencimientoEfirma) setVencimientoEfirma(c.vencimientoEfirma)
      if (c.rfcExtraido) setRfcExtraido(c.rfcExtraido)
      if (c.cerUploaded) setCerUploaded(c.cerUploaded)
      if (c.keyUploaded) setKeyUploaded(c.keyUploaded)
    }
    const dm = localStorage.getItem('dark_mode')
    if (dm === 'true') setDarkMode(true)
  }, [])

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
        if (rfc) setRfcExtraido(rfc)
        if (vence) setVencimientoEfirma(vence)
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

  const handleAvatarImg = (files) => {
    const file = files[0]
    if (!file) return
    setAvatarImg(URL.createObjectURL(file))
  }

  const handleLogoImg = (files) => {
    const file = files[0]
    if (!file) return
    setLogoImg(URL.createObjectURL(file))
  }

  const toggleDarkMode = (valor) => {
    setDarkMode(valor)
    localStorage.setItem('dark_mode', String(valor))
    window.dispatchEvent(new CustomEvent('config_actualizada', { detail: { darkMode: valor } }))
  }

  const guardar = async () => {
    setGuardando(true)
    const config = { nombre, avatarColor, appNombre, modoFrontera, darkMode, vencimientoEfirma, rfcExtraido, cerUploaded, keyUploaded }
    localStorage.setItem('config_app', JSON.stringify(config))
    localStorage.setItem('dark_mode', String(darkMode))
    await supabase.auth.updateUser({ data: { nombre, avatarColor, appNombre, modoFrontera } })
    window.dispatchEvent(new CustomEvent('config_actualizada', { detail: { ...config } }))
    setGuardando(false)
    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  const inicial = nombre ? nombre.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()
  const diasVencimiento = vencimientoEfirma ? Math.ceil((new Date(vencimientoEfirma) - new Date()) / (1000*60*60*24)) : null
  const alertaEfirma = diasVencimiento !== null && diasVencimiento <= 30

  // Colores adaptados al dark mode
  const bg = darkMode ? '#1c1c1e' : '#f3f4f6'
  const cardBg = darkMode ? '#2c2c2e' : 'white'
  const cardBorder = darkMode ? '#3a3a3c' : '#e5e7eb'
  const textPrimary = darkMode ? '#f1f5f9' : '#1f2937'
  const textSecondary = darkMode ? '#9ca3af' : '#6b7280'
  const inputBg = darkMode ? '#3a3a3c' : '#f9fafb'
  const inputBorder = darkMode ? '#48484a' : '#e5e7eb'
  const inputColor = darkMode ? '#f1f5f9' : '#1f2937'
  const secLabel = darkMode ? '#666' : '#9ca3af'

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:bg,minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:textPrimary,marginBottom:2}}>Configuracion</div>
      <div style={{fontSize:13,color:textSecondary,marginBottom:24}}>Personaliza tu perfil y la apariencia de Audify</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:900}}>

        {/* Perfil */}
        <div style={{background:cardBg,borderRadius:12,border:`0.5px solid ${cardBorder}`,padding:24}}>
          <div style={{fontSize:11,fontWeight:500,color:secLabel,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>Perfil de usuario</div>

          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
            <div style={{position:'relative'}}>
              {avatarImg ? (
                <img src={avatarImg} alt="avatar" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover',border:`3px solid ${avatarColor}`}} />
              ) : (
                <div style={{width:72,height:72,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:500,color:'white',border:`3px solid ${avatarColor}`}}>
                  {inicial}
                </div>
              )}
              <button onClick={() => avatarRef.current.click()}
                style={{position:'absolute',bottom:0,right:0,width:22,height:22,borderRadius:'50%',background:cardBg,border:`0.5px solid ${cardBorder}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:12,color:textPrimary}}>
                ✎
              </button>
              <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => handleAvatarImg(e.target.files)} />
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:textPrimary,marginBottom:2}}>{nombre || 'Tu nombre'}</div>
              <div style={{fontSize:12,color:textSecondary}}>{email}</div>
              {avatarImg && <button onClick={() => setAvatarImg(null)} style={{fontSize:11,color:'#f87171',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:4}}>Quitar foto</button>}
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,color:textSecondary,marginBottom:8}}>Color del avatar</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {coloresAvatar.map(c => (
                <button key={c} onClick={() => setAvatarColor(c)}
                  style={{width:28,height:28,borderRadius:'50%',background:c,border:`2px solid ${avatarColor===c?'#f1f5f9':'transparent'}`,cursor:'pointer',outline:'none',padding:0,transform:avatarColor===c?'scale(1.15)':'scale(1)',transition:'transform 0.15s'}}>
                </button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,color:textSecondary,marginBottom:4}}>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre completo"
              style={{width:'100%',padding:'9px 12px',border:`0.5px solid ${inputBorder}`,borderRadius:8,fontSize:13,color:inputColor,outline:'none',background:inputBg,boxSizing:'border-box'}} />
          </div>

          <div>
            <label style={{display:'block',fontSize:12,color:textSecondary,marginBottom:4}}>Correo electronico</label>
            <input value={email} readOnly
              style={{width:'100%',padding:'9px 12px',border:`0.5px solid ${inputBorder}`,borderRadius:8,fontSize:13,color:textSecondary,outline:'none',background:darkMode?'#1c1c1e':'#f3f4f6',boxSizing:'border-box'}} />
            <div style={{fontSize:11,color:secLabel,marginTop:4}}>El correo no se puede cambiar desde aqui</div>
          </div>
        </div>

        {/* App */}
        <div style={{background:cardBg,borderRadius:12,border:`0.5px solid ${cardBorder}`,padding:24}}>
          <div style={{fontSize:11,fontWeight:500,color:secLabel,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>Configuracion de la app</div>

          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,color:textSecondary,marginBottom:8}}>Logotipo</label>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {logoImg ? (
                <img src={logoImg} alt="logo" style={{width:48,height:48,borderRadius:8,objectFit:'contain',border:`0.5px solid ${cardBorder}`,background:inputBg}} />
              ) : (
                <div style={{width:48,height:48,borderRadius:8,background:'#1e2a4a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'white'}}>
                  A
                </div>
              )}
              <div>
                <button onClick={() => logoRef.current.click()}
                  style={{fontSize:12,padding:'6px 14px',background:inputBg,border:`0.5px solid ${inputBorder}`,borderRadius:7,cursor:'pointer',color:textPrimary,display:'block',marginBottom:4}}>
                  {logoImg ? 'Cambiar logo' : 'Subir logo'}
                </button>
                {logoImg && <button onClick={() => setLogoImg(null)} style={{fontSize:11,color:'#f87171',background:'none',border:'none',cursor:'pointer',padding:0}}>Quitar</button>}
                <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => handleLogoImg(e.target.files)} />
              </div>
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,color:textSecondary,marginBottom:4}}>Nombre de la app</label>
            <input value={appNombre} onChange={e => setAppNombre(e.target.value)} placeholder="Nombre de tu plataforma"
              style={{width:'100%',padding:'9px 12px',border:`0.5px solid ${inputBorder}`,borderRadius:8,fontSize:13,color:inputColor,outline:'none',background:inputBg,boxSizing:'border-box'}} />
          </div>

          {/* Modo Frontera */}
          <div style={{background:inputBg,borderRadius:10,padding:'14px 16px',border:`0.5px solid ${cardBorder}`,marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:textPrimary,marginBottom:2}}>Modo Frontera</div>
                <div style={{fontSize:11,color:textSecondary}}>Aplica IVA al 8% para zona fronteriza norte</div>
              </div>
              <button onClick={() => setModoFrontera(!modoFrontera)}
                style={{width:44,height:24,borderRadius:12,background:modoFrontera?'#1e2a4a':'#48484a',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:modoFrontera?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}></div>
              </button>
            </div>
            {modoFrontera && (
              <div style={{marginTop:10,fontSize:11,color:'#60a5fa',background:'rgba(96,165,250,0.1)',borderRadius:7,padding:'6px 10px'}}>
                Modo Frontera activo · IVA 8% aplicado automaticamente
              </div>
            )}
          </div>

          {/* Dark Mode */}
          <div style={{background:inputBg,borderRadius:10,padding:'14px 16px',border:`0.5px solid ${darkMode?'#60a5fa44':cardBorder}`}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:textPrimary,marginBottom:2}}>Modo Oscuro</div>
                <div style={{fontSize:11,color:textSecondary}}>Cambia la apariencia a tema oscuro gris carbón</div>
              </div>
              <button onClick={() => toggleDarkMode(!darkMode)}
                style={{width:44,height:24,borderRadius:12,background:darkMode?'#1e2a4a':'#48484a',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:darkMode?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}></div>
              </button>
            </div>
            {darkMode && (
              <div style={{marginTop:10,fontSize:11,color:'#60a5fa',background:'rgba(96,165,250,0.1)',borderRadius:7,padding:'6px 10px'}}>
                Modo Oscuro activo · Tema gris carbón aplicado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* e.firma */}
      <div style={{background:cardBg,borderRadius:12,border:`0.5px solid ${cardBorder}`,padding:24,maxWidth:900,marginTop:16}}>
        <div style={{fontSize:11,fontWeight:500,color:secLabel,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>
          e.firma — Perfil principal (Titular del despacho)
        </div>

        {alertaEfirma && (
          <div style={{background:darkMode?'rgba(251,191,36,0.1)':'#fffbeb',border:'0.5px solid #fde68a',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:16}}>⚠️</span>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:'#92400e'}}>
                {diasVencimiento <= 0 ? 'e.firma vencida' : `e.firma vence en ${diasVencimiento} dias`}
              </div>
              <div style={{fontSize:11,color:'#b45309'}}>Renueva tu e.firma en el SAT antes de que expire</div>
            </div>
          </div>
        )}

        {cerUploaded && (
          <div style={{background:darkMode?'rgba(59,107,17,0.15)':'#EAF3DE',border:'0.5px solid #3B6D11',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            <div>
              <div style={{fontSize:10,color:'#4ade80',fontWeight:500,marginBottom:2}}>RFC extraido</div>
              <div style={{fontSize:13,fontWeight:600,color:textPrimary,fontFamily:'monospace'}}>{rfcExtraido || '—'}</div>
            </div>
            <div>
              <div style={{fontSize:10,color:'#4ade80',fontWeight:500,marginBottom:2}}>Vencimiento</div>
              <div style={{fontSize:13,fontWeight:600,color:alertaEfirma?'#fbbf24':textPrimary}}>{vencimientoEfirma || '—'}</div>
            </div>
            <div>
              <div style={{fontSize:10,color:'#4ade80',fontWeight:500,marginBottom:2}}>Archivos</div>
              <div style={{fontSize:13,fontWeight:600,color:textPrimary}}>{cerUploaded?'✅':''} .cer {keyUploaded?'✅':''} .key</div>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          <input ref={cerRef} type="file" accept=".cer" style={{display:'none'}} onChange={e => handleCer(e.target.files)} />
          <div
            onClick={() => cerRef.current.click()}
            onDragOver={e => { e.preventDefault(); setCerDrag(true) }}
            onDragLeave={() => setCerDrag(false)}
            onDrop={e => { e.preventDefault(); setCerDrag(false); handleCer(e.dataTransfer.files) }}
            style={{border:`1.5px ${cerUploaded?'solid':'dashed'} ${cerDrag?'#60a5fa':cerUploaded?'#3B6D11':cardBorder}`,borderRadius:8,padding:14,textAlign:'center',cursor:'pointer',background:cerUploaded?(darkMode?'rgba(59,107,17,0.15)':'#EAF3DE'):cerDrag?(darkMode?'rgba(96,165,250,0.1)':'#E6F1FB'):cardBg,transition:'all 0.15s'}}>
            <div style={{fontSize:18,marginBottom:4}}>{cerUploaded?'✅':'📄'}</div>
            <div style={{fontSize:12,fontWeight:500,color:cerUploaded?'#4ade80':textPrimary}}>{cerUploaded?'Certificado .cer cargado':'Archivo .cer'}</div>
            <div style={{fontSize:10,color:textSecondary,marginTop:2}}>{cerUploaded?'Da clic para reemplazar':'Da clic o arrastra aqui'}</div>
          </div>

          <input ref={keyRef} type="file" accept=".key" style={{display:'none'}} onChange={e => handleKey(e.target.files)} />
          <div
            onClick={() => keyRef.current.click()}
            onDragOver={e => { e.preventDefault(); setKeyDrag(true) }}
            onDragLeave={() => setKeyDrag(false)}
            onDrop={e => { e.preventDefault(); setKeyDrag(false); handleKey(e.dataTransfer.files) }}
            style={{border:`1.5px ${keyUploaded?'solid':'dashed'} ${keyDrag?'#60a5fa':keyUploaded?'#3B6D11':cardBorder}`,borderRadius:8,padding:14,textAlign:'center',cursor:'pointer',background:keyUploaded?(darkMode?'rgba(59,107,17,0.15)':'#EAF3DE'):keyDrag?(darkMode?'rgba(96,165,250,0.1)':'#E6F1FB'):cardBg,transition:'all 0.15s'}}>
            <div style={{fontSize:18,marginBottom:4}}>{keyUploaded?'✅':'🔑'}</div>
            <div style={{fontSize:12,fontWeight:500,color:keyUploaded?'#4ade80':textPrimary}}>{keyUploaded?'Clave .key cargada':'Archivo .key'}</div>
            <div style={{fontSize:10,color:textSecondary,marginTop:2}}>{keyUploaded?'Da clic para reemplazar':'Da clic o arrastra aqui'}</div>
          </div>
        </div>

        <div style={{marginBottom:4}}>
          <label style={{display:'block',fontSize:12,color:textSecondary,marginBottom:4}}>Contrasena de la e.firma</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••"
            style={{width:'100%',padding:'9px 12px',border:`0.5px solid ${inputBorder}`,borderRadius:8,fontSize:13,color:inputColor,outline:'none',background:inputBg,boxSizing:'border-box',maxWidth:300}} />
        </div>
        <div style={{fontSize:10,color:textSecondary,marginTop:8,display:'flex',alignItems:'center',gap:4}}>
          🔒 Los archivos de e.firma se almacenan cifrados. La contrasena nunca se guarda en texto plano.
        </div>
      </div>

      {/* Boton guardar */}
      <div style={{maxWidth:900,marginTop:16,display:'flex',alignItems:'center',gap:12}}>
        <button onClick={guardar} disabled={guardando}
          style={{padding:'11px 28px',background:'#1e2a4a',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer'}}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {exito && <span style={{fontSize:13,color:'#4ade80'}}>✅ Cambios guardados correctamente</span>}
      </div>

      {/* Preview */}
      <div style={{maxWidth:900,marginTop:16,background:cardBg,borderRadius:12,border:`0.5px solid ${cardBorder}`,padding:20}}>
        <div style={{fontSize:11,fontWeight:500,color:secLabel,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Vista previa</div>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px',background:inputBg,borderRadius:10,width:'fit-content',marginBottom:8}}>
          <div style={{width:32,height:32,minWidth:32,borderRadius:8,background:'#1e2a4a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'white',fontWeight:700}}>
            A
          </div>
          <span style={{fontSize:15,fontWeight:600,color:textPrimary}}>{appNombre}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px',background:inputBg,borderRadius:10,width:'fit-content'}}>
          {avatarImg ? (
            <img src={avatarImg} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover'}} alt="avatar" />
          ) : (
            <div style={{width:36,height:36,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:500,color:'white'}}>
              {inicial}
            </div>
          )}
          <div>
            <div style={{fontSize:13,fontWeight:500,color:textPrimary}}>{nombre || 'Tu nombre'}</div>
            <div style={{fontSize:11,color:textSecondary}}>{email}</div>
          </div>
        </div>
      </div>
    </div>
  )
}