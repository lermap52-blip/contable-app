'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from './supabase'
import "./globals.css"

const menuItems = [
  { section: 'Principal', items: [
    { label: 'Dashboard', href: '/' },
  ]},
  { section: 'Finanzas', items: [
    { label: 'Ingresos', href: '/ingresos' },
    { label: 'Egresos', href: '/egresos' },
    { label: 'Facturas', href: '/facturas' },
  ]},
  { section: 'Directorio', items: [
    { label: 'Clientes', href: '/clientes' },
    { label: 'Impuestos', href: '/impuestos' },
  ]},
  { section: 'Archivos', items: [
    { label: 'Documentos fiscales', href: '/documentos-fiscales' },
  ]},
]

const authRoutes = ['/auth/login', '/auth/registro', '/auth/recuperar', '/auth/nueva-password']

const resico = [
  { hasta: 25000, tasa: 0.0100, label: 'hasta $25,000' },
  { hasta: 50000, tasa: 0.0110, label: 'hasta $50,000' },
  { hasta: 83333.33, tasa: 0.0150, label: 'hasta $83,333' },
  { hasta: 208333.33, tasa: 0.0200, label: 'hasta $208,333' },
  { hasta: 3500000, tasa: 0.0250, label: 'hasta $3,500,000' },
]

function getTramo(m) {
  for (let t of resico) { if (m <= t.hasta) return t }
  return resico[resico.length - 1]
}

function fmtN(n) { return '$'+n.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

function CalculadoraFlotante() {
  const [open, setOpen] = useState(false)
  const [ingreso, setIngreso] = useState('')
  const [ivaRate, setIvaRate] = useState(0.16)
  const [ivaLbl, setIvaLbl] = useState('16%')

  const ivasOpts = [
    {label:'16%',rate:0.16},{label:'8%',rate:0.08},{label:'4%',rate:0.04},{label:'0%',rate:0},{label:'Ex.',rate:-1}
  ]

  const ing = parseFloat(ingreso) || 0
  const iva = ivaRate === -1 ? 0 : ing * ivaRate
  const tramo = getTramo(ing)
  const isr = ing * tramo.tasa
  const total = iva + isr

  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:1000}}>
      {open && (
        <div style={{position:'absolute',bottom:64,right:0,width:300,background:'white',border:'0.5px solid #e5e7eb',borderRadius:16,boxShadow:'0 4px 24px rgba(0,0,0,0.10)',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'0.5px solid #e5e7eb'}}>
            <span style={{fontSize:14,fontWeight:500,color:'#1f2937'}}>Calculadora de impuestos</span>
            <button onClick={() => setOpen(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#9ca3af',lineHeight:1}}>x</button>
          </div>
          <div style={{padding:16,maxHeight:420,overflowY:'auto'}}>
            <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Ingresos</div>
            <div style={{position:'relative',marginBottom:16}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#9ca3af'}}>$</span>
              <input type="number" value={ingreso} onChange={e => setIngreso(e.target.value)} placeholder="0.00"
                style={{width:'100%',padding:'9px 10px 9px 24px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:17,fontWeight:500,color:'#1f2937',outline:'none',boxSizing:'border-box'}} />
            </div>
            <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Tasa de IVA</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginBottom:14}}>
              {ivasOpts.map(o => (
                <button key={o.label} onClick={() => { setIvaRate(o.rate); setIvaLbl(o.label) }}
                  style={{padding:'6px 4px',border:'none',borderRadius:8,fontSize:11,fontWeight:500,cursor:'pointer',background:ivaRate===o.rate?'#E6F1FB':'#f9fafb',color:ivaRate===o.rate?'#185FA5':'#374151'}}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Regimen</div>
            <div style={{background:'#EAF3DE',border:'0.5px solid #3B6D11',borderRadius:8,padding:'8px 12px',fontSize:12,fontWeight:500,color:'#3B6D11',marginBottom:14}}>
              RESICO · Persona fisica · SAT {new Date().getFullYear()}
            </div>
            <div style={{borderTop:'0.5px solid #f3f4f6',paddingTop:12}}>
              {[
                {lbl:'Base',v:fmtN(ing)},
                {lbl:ivaRate===-1?'IVA (Exento)':`IVA (${ivaLbl})`,v:fmtN(iva),blue:true},
                {lbl:`ISR ${(tramo.tasa*100).toFixed(2)}% (${tramo.label})`,v:fmtN(isr),red:true},
                {lbl:'IVA al SAT',v:fmtN(iva),red:true},
              ].map(r => (
                <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'0.5px solid #f9fafb',fontSize:12}}>
                  <span style={{color:'#6b7280'}}>{r.lbl}</span>
                  <span style={{fontWeight:500,color:r.red?'#A32D2D':r.blue?'#185FA5':'#1f2937'}}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,padding:'10px 12px',background:'#f9fafb',borderRadius:10}}>
              <span style={{fontSize:12,color:'#6b7280'}}>Total impuestos al SAT</span>
              <span style={{fontSize:20,fontWeight:600,color:'#A32D2D'}}>{fmtN(total)}</span>
            </div>
            <div style={{fontSize:10,color:'#9ca3af',marginTop:10,lineHeight:1.5}}>Estimacion con tabla RESICO {new Date().getFullYear()}.</div>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        style={{width:52,height:52,borderRadius:'50%',background:'#185FA5',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.15)',fontSize:22}}>
        🧮
      </button>
    </div>
  )
}

function Sidebar({ user, collapsed, setCollapsed }) {
  const pathname = usePathname()
  const [config, setConfig] = useState({})

  useEffect(() => {
    const saved = localStorage.getItem('config_app')
    if (saved) setConfig(JSON.parse(saved))
    const handler = (e) => setConfig(e.detail)
    window.addEventListener('config_actualizada', handler)
    return () => window.removeEventListener('config_actualizada', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const nombre = config.nombre || user?.email?.split('@')[0] || 'Usuario'
  const avatarColor = config.avatarColor || '#185FA5'
  const appNombre = config.appNombre || 'ContableApp'
  const initials = nombre.charAt(0).toUpperCase()

  return (
    <aside style={{width:collapsed?56:240,minWidth:collapsed?56:240,background:'white',borderRight:'0.5px solid #e5e7eb',display:'flex',flexDirection:'column',transition:'width 0.25s,min-width 0.25s',overflow:'hidden',position:'sticky',top:0,height:'100vh'}}>

      {/* Logo */}
      <div style={{padding:'16px 12px',borderBottom:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:32,height:32,minWidth:32,borderRadius:8,background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'white',fontWeight:700}}>
          {appNombre.charAt(0)}
        </div>
        {!collapsed && <span style={{fontSize:15,fontWeight:600,color:'#1f2937',whiteSpace:'nowrap'}}>{appNombre}</span>}
      </div>

      {/* Perfil */}
      <div style={{padding:'12px',borderBottom:'0.5px solid #e5e7eb'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,overflow:'hidden'}}>
          <div style={{width:36,height:36,minWidth:36,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:500,color:'white'}}>
            {initials}
          </div>
          {!collapsed && (
            <div style={{overflow:'hidden'}}>
              <div style={{fontSize:13,fontWeight:500,color:'#1f2937',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombre}</div>
              <div style={{fontSize:11,color:'#6b7280',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.email || ''}</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:'10px 8px',overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
        {menuItems.map(group => (
          <div key={group.section}>
            {!collapsed && <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',padding:'8px 8px 4px'}}>{group.section}</div>}
            {group.items.map(item => (
              <a key={item.label} href={item.href}
                style={{display:'flex',alignItems:'center',gap:10,padding:collapsed?'8px':'8px 10px',borderRadius:8,cursor:'pointer',textDecoration:'none',background:pathname===item.href?'#E6F1FB':'transparent',justifyContent:collapsed?'center':'flex-start',marginBottom:2}}>
                <div style={{width:20,height:20,minWidth:20,borderRadius:6,background:pathname===item.href?avatarColor:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:pathname===item.href?'white':'#6b7280',fontWeight:700}}>
                  {item.label.charAt(0)}
                </div>
                {!collapsed && <span style={{fontSize:13,color:pathname===item.href?avatarColor:'#6b7280',fontWeight:pathname===item.href?500:400,whiteSpace:'nowrap'}}>{item.label}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{padding:'10px 8px',borderTop:'0.5px solid #e5e7eb',display:'flex',flexDirection:'column',gap:2}}>
        <a href="/configuracion" style={{display:'flex',alignItems:'center',gap:10,padding:collapsed?'8px':'8px 10px',borderRadius:8,cursor:'pointer',textDecoration:'none',justifyContent:collapsed?'center':'flex-start',background:pathname==='/configuracion'?'#E6F1FB':'transparent'}}>
          <div style={{width:20,height:20,minWidth:20,borderRadius:6,background:pathname==='/configuracion'?avatarColor:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:pathname==='/configuracion'?'white':'#6b7280',fontWeight:700}}>C</div>
          {!collapsed && <span style={{fontSize:13,color:pathname==='/configuracion'?avatarColor:'#6b7280',fontWeight:pathname==='/configuracion'?500:400}}>Configuracion</span>}
        </a>
        <button onClick={handleLogout} style={{display:'flex',alignItems:'center',gap:10,padding:collapsed?'8px':'8px 10px',borderRadius:8,cursor:'pointer',background:'none',border:'none',justifyContent:collapsed?'center':'flex-start',width:'100%'}}>
          <div style={{width:20,height:20,minWidth:20,borderRadius:6,background:'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#A32D2D',fontWeight:700}}>X</div>
          {!collapsed && <span style={{fontSize:13,color:'#A32D2D'}}>Cerrar sesion</span>}
        </button>
      </div>

      {/* Toggle */}
      <button onClick={() => setCollapsed(!collapsed)}
        style={{position:'absolute',top:20,right:-12,width:24,height:24,borderRadius:'50%',background:'white',border:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:12,color:'#6b7280',zIndex:10}}>
        {collapsed ? '>' : '<'}
      </button>
    </aside>
  )
}

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const isAuthPage = authRoutes.includes(pathname)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  if (isAuthPage) {
    return (
      <html lang="es">
        <body style={{margin:0,fontFamily:'system-ui,sans-serif'}}>{children}</body>
      </html>
    )
  }

  return (
    <html lang="es">
      <body style={{margin:0,fontFamily:'system-ui,sans-serif',display:'flex',minHeight:'100vh',background:'#f3f4f6'}}>
        <Sidebar user={user} collapsed={collapsed} setCollapsed={setCollapsed} />
        <main style={{flex:1,overflowY:'auto',position:'relative'}}>
          {children}
          <CalculadoraFlotante />
        </main>
      </body>
    </html>
  )
}