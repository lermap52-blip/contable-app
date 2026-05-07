'use client'
import { useState } from 'react'
import { supabase } from '../../supabase'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const handleRecuperar = async () => {
    setError('')
    if (!email) { setError('Escribe tu correo'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/auth/nueva-password'
    })
    if (error) setError('Hubo un error. Intenta de nuevo.')
    else setExito(true)
    setLoading(false)
  }

  if (exito) return (
    <main style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:16,border:'1px solid #e5e7eb',padding:32,maxWidth:400,width:'100%',textAlign:'center'}}>
        <h2 style={{fontSize:20,fontWeight:'bold',color:'#1f2937',marginBottom:8}}>Revisa tu correo</h2>
        <p style={{fontSize:14,color:'#6b7280'}}>Te enviamos un enlace a {email}</p>
        <a href="/auth/login" style={{marginTop:16,display:'inline-block',color:'#3b82f6',fontSize:14}}>Volver a iniciar sesion</a>
      </div>
    </main>
  )

  return (
    <main style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px'}}>
      <div style={{background:'white',borderRadius:16,border:'1px solid #e5e7eb',padding:32,maxWidth:400,width:'100%'}}>
        <h1 style={{fontSize:24,fontWeight:'bold',color:'#1f2937',marginBottom:4}}>Recuperar contrasena</h1>
        <p style={{fontSize:14,color:'#6b7280',marginBottom:24}}>Te enviaremos un enlace a tu correo</p>
        {error && <div style={{background:'#fef2f2',color:'#dc2626',fontSize:14,borderRadius:12,padding:'12px 16px',marginBottom:16}}>{error}</div>}
        <div style={{marginBottom:24}}>
          <label style={{display:'block',fontSize:14,fontWeight:500,color:'#374151',marginBottom:4}}>Correo electronico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <button onClick={handleRecuperar} disabled={loading} style={{width:'100%',background:'#2563eb',color:'white',fontWeight:500,borderRadius:12,padding:'12px',fontSize:14,border:'none',cursor:'pointer'}}>
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
        <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginTop:16}}>
          <a href="/auth/login" style={{color:'#3b82f6'}}>Volver a iniciar sesion</a>
        </p>
      </div>
    </main>
  )
}