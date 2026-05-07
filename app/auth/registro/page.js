'use client'
import { useState } from 'react'
import { supabase } from '../../supabase'

export default function Registro() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const handleRegistro = async () => {
    setError('')
    if (password !== confirmar) { setError('Las contrasenas no coinciden'); return }
    if (password.length < 8) { setError('Minimo 8 caracteres'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError('Error al crear cuenta')
    else setExito(true)
    setLoading(false)
  }

  if (exito) return (
    <main style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:16,border:'1px solid #e5e7eb',padding:32,maxWidth:400,width:'100%',textAlign:'center'}}>
        <h2 style={{fontSize:20,fontWeight:'bold',color:'#1f2937',marginBottom:8}}>Revisa tu correo</h2>
        <a href="/auth/login" style={{marginTop:16,display:'inline-block',color:'#3b82f6',fontSize:14}}>Ir a iniciar sesion</a>
      </div>
    </main>
  )

  return (
    <main style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px'}}>
      <div style={{background:'white',borderRadius:16,border:'1px solid #e5e7eb',padding:32,maxWidth:400,width:'100%'}}>
        <h1 style={{fontSize:24,fontWeight:'bold',color:'#1f2937',marginBottom:4}}>Crear cuenta</h1>
        <p style={{fontSize:14,color:'#6b7280',marginBottom:24}}>Empieza a controlar tus finanzas hoy</p>
        {error && <div style={{background:'#fef2f2',color:'#dc2626',fontSize:14,borderRadius:12,padding:'12px 16px',marginBottom:16}}>{error}</div>}
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:14,fontWeight:500,color:'#374151',marginBottom:4}}>Correo</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:14,fontWeight:500,color:'#374151',marginBottom:4}}>Contrasena</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 8 caracteres" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <div style={{marginBottom:24}}>
          <label style={{display:'block',fontSize:14,fontWeight:500,color:'#374151',marginBottom:4}}>Confirmar contrasena</label>
          <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repite tu contrasena" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <button onClick={handleRegistro} disabled={loading} style={{width:'100%',background:'#2563eb',color:'white',fontWeight:500,borderRadius:12,padding:'12px',fontSize:14,border:'none',cursor:'pointer'}}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginTop:16}}>
          Ya tienes cuenta? <a href="/auth/login" style={{color:'#3b82f6'}}>Inicia sesion</a>
        </p>
      </div>
    </main>
  )
}