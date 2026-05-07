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
  const [appNombre, setAppNombre] = useState('ContableApp')
  const [logoImg, setLogoImg] = useState(null)
  const [modoFrontera, setModoFrontera] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const avatarRef = useRef()
  const logoRef = useRef()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email || '')
        setNombre(data.user.user_metadata?.nombre || data.user.email?.split('@')[0] || '')
        setAvatarColor(data.user.user_metadata?.avatarColor || '#185FA5')
        setAppNombre(data.user.user_metadata?.appNombre || 'ContableApp')
        setModoFrontera(data.user.user_metadata?.modoFrontera || false)
      }
    })
    const saved = localStorage.getItem('config_app')
    if (saved) {
      const c = JSON.parse(saved)
      if (c.avatarColor) setAvatarColor(c.avatarColor)
      if (c.appNombre) setAppNombre(c.appNombre)
      if (c.modoFrontera !== undefined) setModoFrontera(c.modoFrontera)
      if (c.nombre) setNombre(c.nombre)
    }
  }, [])

  const handleAvatarImg = (files) => {
    const file = files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarImg(url)
  }

  const handleLogoImg = (files) => {
    const file = files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setLogoImg(url)
  }

  const guardar = async () => {
    setGuardando(true)
    const config = { nombre, avatarColor, appNombre, modoFrontera }
    localStorage.setItem('config_app', JSON.stringify(config))
    await supabase.auth.updateUser({ data: { nombre, avatarColor, appNombre, modoFrontera } })
    window.dispatchEvent(new CustomEvent('config_actualizada', { detail: config }))
    setGuardando(false)
    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  const inicial = nombre ? nombre.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Configuracion</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:24}}>Personaliza tu perfil y la apariencia de la app</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:860}}>

        {/* Perfil */}
        <div style={{background:'white',borderRadius:12,border:'0.5px solid #e5e7eb',padding:24}}>
          <div style={{fontSize:11,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>Perfil de usuario</div>

          {/* Avatar */}
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
                style={{position:'absolute',bottom:0,right:0,width:22,height:22,borderRadius:'50%',background:'white',border:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:12}}>
                ✎
              </button>
              <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => handleAvatarImg(e.target.files)} />
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:'#1f2937',marginBottom:2}}>{nombre || 'Tu nombre'}</div>
              <div style={{fontSize:12,color:'#9ca3af'}}>{email}</div>
              <button onClick={() => { setAvatarImg(null) }} style={{fontSize:11,color:'#A32D2D',background:'none',border:'none',cursor:'pointer',padding:0,marginTop:4}}>
                {avatarImg ? 'Quitar foto' : ''}
              </button>
            </div>
          </div>

          {/* Color avatar */}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:8}}>Color del avatar</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {coloresAvatar.map(c => (
                <button key={c} onClick={() => setAvatarColor(c)}
                  style={{width:28,height:28,borderRadius:'50%',background:c,border:`2px solid ${avatarColor===c?'#1f2937':'transparent'}`,cursor:'pointer',outline:'none',padding:0,transform:avatarColor===c?'scale(1.15)':'scale(1)',transition:'transform 0.15s'}}>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre completo"
              style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:'#f9fafb',boxSizing:'border-box'}} />
          </div>

          {/* Email */}
          <div style={{marginBottom:4}}>
            <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Correo electronico</label>
            <input value={email} readOnly
              style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#9ca3af',outline:'none',background:'#f3f4f6',boxSizing:'border-box'}} />
            <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>El correo no se puede cambiar desde aqui</div>
          </div>
        </div>

        {/* App */}
        <div style={{background:'white',borderRadius:12,border:'0.5px solid #e5e7eb',padding:24}}>
          <div style={{fontSize:11,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>Configuracion de la app</div>

          {/* Logo */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:8}}>Logotipo</label>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {logoImg ? (
                <img src={logoImg} alt="logo" style={{width:48,height:48,borderRadius:8,objectFit:'contain',border:'0.5px solid #e5e7eb',background:'#f9fafb'}} />
              ) : (
                <div style={{width:48,height:48,borderRadius:8,background:'#185FA5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'white'}}>
                  {appNombre.charAt(0)}
                </div>
              )}
              <div>
                <button onClick={() => logoRef.current.click()}
                  style={{fontSize:12,padding:'6px 14px',background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:7,cursor:'pointer',color:'#374151',display:'block',marginBottom:4}}>
                  {logoImg ? 'Cambiar logo' : 'Subir logo'}
                </button>
                {logoImg && <button onClick={() => setLogoImg(null)} style={{fontSize:11,color:'#A32D2D',background:'none',border:'none',cursor:'pointer',padding:0}}>Quitar</button>}
                <input ref={logoRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => handleLogoImg(e.target.files)} />
              </div>
            </div>
          </div>

          {/* Nombre app */}
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>Nombre de la app</label>
            <input value={appNombre} onChange={e => setAppNombre(e.target.value)} placeholder="Nombre de tu plataforma"
              style={{width:'100%',padding:'9px 12px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:'#f9fafb',boxSizing:'border-box'}} />
            <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Aparece en la barra lateral y en los documentos</div>
          </div>

          {/* Modo frontera */}
          <div style={{background:'#f9fafb',borderRadius:10,padding:'14px 16px',border:'0.5px solid #e5e7eb'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:13,fontWeight:500,color:'#1f2937',marginBottom:2}}>Modo Frontera</div>
                <div style={{fontSize:11,color:'#6b7280'}}>Aplica IVA al 8% en lugar del 16% para zona fronteriza norte</div>
              </div>
              <button onClick={() => setModoFrontera(!modoFrontera)}
                style={{width:44,height:24,borderRadius:12,background:modoFrontera?'#185FA5':'#e5e7eb',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s',flexShrink:0}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'white',position:'absolute',top:3,left:modoFrontera?23:3,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}></div>
              </button>
            </div>
            {modoFrontera && (
              <div style={{marginTop:10,fontSize:11,color:'#185FA5',background:'#E6F1FB',borderRadius:7,padding:'6px 10px'}}>
                Modo Frontera activo · IVA 8% aplicado automaticamente en calculos y facturas
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Boton guardar */}
      <div style={{maxWidth:860,marginTop:16,display:'flex',alignItems:'center',gap:12}}>
        <button onClick={guardar} disabled={guardando}
          style={{padding:'11px 28px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer'}}>
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {exito && (
          <span style={{fontSize:13,color:'#3B6D11',display:'flex',alignItems:'center',gap:6}}>
            ✅ Cambios guardados correctamente
          </span>
        )}
      </div>

      {/* Preview */}
      <div style={{maxWidth:860,marginTop:16,background:'white',borderRadius:12,border:'0.5px solid #e5e7eb',padding:20}}>
        <div style={{fontSize:11,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Vista previa del sidebar</div>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px',background:'#f9fafb',borderRadius:10,width:'fit-content'}}>
          <div style={{width:32,height:32,minWidth:32,borderRadius:8,background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'white',fontWeight:700,overflow:'hidden'}}>
            {logoImg ? <img src={logoImg} style={{width:32,height:32,objectFit:'contain'}} /> : appNombre.charAt(0)}
          </div>
          <span style={{fontSize:15,fontWeight:600,color:'#1f2937'}}>{appNombre}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px',marginTop:8,background:'#f9fafb',borderRadius:10,width:'fit-content'}}>
          {avatarImg ? (
            <img src={avatarImg} style={{width:36,height:36,borderRadius:'50%',objectFit:'cover'}} />
          ) : (
            <div style={{width:36,height:36,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:500,color:'white'}}>
              {inicial}
            </div>
          )}
          <div>
            <div style={{fontSize:13,fontWeight:500,color:'#1f2937'}}>{nombre || 'Tu nombre'}</div>
            <div style={{fontSize:11,color:'#6b7280'}}>{email}</div>
          </div>
        </div>
      </div>
    </div>
  )
}