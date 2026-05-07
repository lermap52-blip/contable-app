'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contrasena incorrectos')
   else window.location.replace('/')
    setLoading(false)
  }

  return (
    <main style={{minHeight:'100vh',background:'#f9fafb',display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px'}}>
      <div style={{background:'white',borderRadius:16,border:'1px solid #e5e7eb',padding:32,maxWidth:400,width:'100%'}}>
        <h1 style={{fontSize:24,fontWeight:'bold',color:'#1f2937',marginBottom:4}}>Iniciar sesion</h1>
        <p style={{fontSize:14,color:'#6b7280',marginBottom:24}}>Accede a tu plataforma contable</p>
        {error && <div style={{background:'#fef2f2',color:'#dc2626',fontSize:14,borderRadius:12,padding:'12px 16px',marginBottom:16}}>{error}</div>}
        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:14,fontWeight:500,color:'#374151',marginBottom:4}}>Correo electronico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <div style={{marginBottom:8}}>
          <label style={{display:'block',fontSize:14,fontWeight:500,color:'#374151',marginBottom:4}}>Contrasena</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contrasena" style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 16px',fontSize:14,boxSizing:'border-box'}} />
        </div>
        <div style={{textAlign:'right',marginBottom:24}}>
          <a href="/auth/recuperar" style={{fontSize:12,color:'#3b82f6'}}>Olvidaste tu contrasena?</a>
        </div>
        <button onClick={handleLogin} disabled={loading} style={{width:'100%',background:'#2563eb',color:'white',fontWeight:500,borderRadius:12,padding:'12px',fontSize:14,border:'none',cursor:'pointer'}}>
          {loading ? 'Entrando...' : 'Iniciar sesion'}
        </button>
        <p style={{textAlign:'center',fontSize:14,color:'#6b7280',marginTop:16}}>
          No tienes cuenta? <a href="/auth/registro" style={{color:'#3b82f6'}}>Registrate</a>
        </p>
      </div>
    </main>
  )
}