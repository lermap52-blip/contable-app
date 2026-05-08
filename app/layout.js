'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from './supabase'
import { ClienteProvider, useCliente } from './ClienteContext'
import "./globals.css"
import {
  LayoutDashboard, TrendingUp, TrendingDown, FileText,
  Users, Calculator, FolderOpen, Settings, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, AlertTriangle,
  Building2
} from 'lucide-react'

const menuItems = [
  { section: 'Principal', items: [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  ]},
  { section: 'Finanzas', items: [
    { label: 'Ingresos', href: '/ingresos', icon: TrendingUp },
    { label: 'Egresos', href: '/egresos', icon: TrendingDown },
    { label: 'Facturas', href: '/facturas', icon: FileText },
  ]},
  { section: 'Directorio', items: [
    { label: 'Clientes', href: '/clientes', icon: Users },
    { label: 'Impuestos', href: '/impuestos', icon: Calculator },
  ]},
  { section: 'Archivos', items: [
    { label: 'Documentos fiscales', href: '/documentos-fiscales', icon: FolderOpen },
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

function SelectorCliente({ collapsed }) {
  const { clientes, clienteActivo, seleccionarCliente, diasParaVencimiento } = useCliente()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const diasVenc = clienteActivo ? diasParaVencimiento(clienteActivo.vencimiento_efirma) : null
  const alertaEfirma = diasVenc !== null && diasVenc <= 30

  if (collapsed) {
    return (
      <div style={{padding:'8px',borderBottom:'0.5px solid #f3f4f6',display:'flex',justifyContent:'center'}}>
        <div
          title={clienteActivo?.nombre || 'Mi Despacho'}
          onClick={() => setOpen(!open)}
          style={{width:34,height:34,borderRadius:8,background:clienteActivo?'#185FA5':'#f0fdf4',border:`1px solid ${clienteActivo?'#bfdbfe':'#bbf7d0'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:clienteActivo?'white':'#16a34a',cursor:'pointer'}}>
          {clienteActivo ? clienteActivo.nombre.charAt(0) : '🏢'}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{padding:'8px 10px',borderBottom:'0.5px solid #f3f4f6',position:'relative'}}>
      <div style={{fontSize:9,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>Contexto activo</div>
      <button onClick={() => setOpen(!open)}
        style={{width:'100%',padding:'8px 10px',background:clienteActivo?'#eff6ff':'#f0fdf4',border:`0.5px solid ${clienteActivo?'#bfdbfe':'#bbf7d0'}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,overflow:'hidden',flex:1}}>
          {clienteActivo ? (
            <>
              <div style={{width:24,height:24,minWidth:24,borderRadius:6,background:'#185FA5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>
                {clienteActivo.nombre.charAt(0)}
              </div>
              <div style={{overflow:'hidden'}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1e3a8a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{clienteActivo.nombre.split(' ').slice(0,2).join(' ')}</div>
                <div style={{fontSize:10,color:'#93c5fd',fontFamily:'monospace'}}>{clienteActivo.rfc}</div>
              </div>
            </>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:24,height:24,minWidth:24,borderRadius:6,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Building2 size={13} color="white" />
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'#15803d'}}>Mi Despacho</div>
                <div style={{fontSize:10,color:'#4ade80'}}>Vista personal</div>
              </div>
            </div>
          )}
        </div>
        <ChevronDown size={14} color="#94a3b8" style={{flexShrink:0,transform:open?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.15s'}} />
      </button>

      {alertaEfirma && clienteActivo && (
        <div style={{marginTop:6,padding:'5px 8px',background:'#fffbeb',border:'0.5px solid #fde68a',borderRadius:6,display:'flex',alignItems:'center',gap:6}}>
          <AlertTriangle size={12} color="#d97706" />
          <span style={{fontSize:10,color:'#d97706',fontWeight:500}}>
            {diasVenc <= 0 ? 'e.firma vencida' : `e.firma vence en ${diasVenc} dias`}
          </span>
        </div>
      )}

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:10,right:10,background:'white',border:'0.5px solid #e5e7eb',borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,0.08)',zIndex:200,overflow:'hidden'}}>
          <div style={{maxHeight:220,overflowY:'auto'}}>

            {/* Opcion Mi Despacho */}
            <button onClick={() => { seleccionarCliente(null); setOpen(false) }}
              style={{width:'100%',padding:'10px 12px',background:!clienteActivo?'#f0fdf4':'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'0.5px solid #f3f4f6',display:'flex',alignItems:'center',gap:8}}
              onMouseEnter={e => { if (clienteActivo) e.currentTarget.style.background='#f9fafb' }}
              onMouseLeave={e => { if (clienteActivo) e.currentTarget.style.background='none' }}>
              <div style={{width:26,height:26,borderRadius:7,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Building2 size={14} color="white" />
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'#15803d'}}>Mi Despacho</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>Ver mi informacion personal</div>
              </div>
              {!clienteActivo && <span style={{marginLeft:'auto',fontSize:10,background:'#dcfce7',color:'#16a34a',padding:'2px 7px',borderRadius:20,fontWeight:500}}>Activo</span>}
            </button>

            {/* Separador */}
            {clientes.length > 0 && (
              <div style={{padding:'6px 12px',fontSize:9,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',background:'#fafafa'}}>
                Clientes
              </div>
            )}

            {/* Lista de clientes */}
            {clientes.map(c => {
              const dias = diasParaVencimiento(c.vencimiento_efirma)
              const alerta = dias !== null && dias <= 30
              const isActive = clienteActivo?.id === c.id
              return (
                <button key={c.id} onClick={() => { seleccionarCliente(c); setOpen(false) }}
                  style={{width:'100%',padding:'9px 12px',background:isActive?'#eff6ff':'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'0.5px solid #f3f4f6',display:'flex',alignItems:'center',gap:8}}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background='#f9fafb' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background=isActive?'#eff6ff':'none' }}>
                  <div style={{width:26,height:26,minWidth:26,borderRadius:7,background:'#185FA5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white'}}>
                    {c.nombre.charAt(0)}
                  </div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:12,fontWeight:500,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.nombre.split(' ').slice(0,3).join(' ')}</div>
                    <div style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>{c.rfc}</div>
                  </div>
                  {alerta && <AlertTriangle size={12} color="#d97706" style={{flexShrink:0}} />}
                  {isActive && <span style={{marginLeft:4,fontSize:10,background:'#dbeafe',color:'#1d4ed8',padding:'2px 7px',borderRadius:20,fontWeight:500,flexShrink:0}}>Activo</span>}
                </button>
              )
            })}

            {clientes.length === 0 && (
              <div style={{padding:'12px',fontSize:12,color:'#94a3b8',textAlign:'center'}}>No hay clientes registrados</div>
            )}
          </div>

          <a href="/clientes" onClick={() => setOpen(false)}
            style={{display:'block',padding:'8px 12px',fontSize:11,color:'#185FA5',textDecoration:'none',borderTop:'0.5px solid #f3f4f6',textAlign:'center',background:'#f9fafb'}}
            onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background='#f9fafb'}>
            + Agregar nuevo cliente
          </a>
        </div>
      )}
    </div>
  )
}

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
            <button onClick={() => setOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',lineHeight:1,display:'flex',alignItems:'center'}}>
              <ChevronRight size={18} />
            </button>
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
  const { clienteActivo } = useCliente()
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

  // Color de acento cambia cuando hay cliente activo
  const accentColor = clienteActivo ? '#1d4ed8' : avatarColor
  const sidebarBg = clienteActivo ? '#f8faff' : 'white'

  return (
    <aside style={{
      width: collapsed ? 64 : 240,
      minWidth: collapsed ? 64 : 240,
      background: sidebarBg,
      borderRight: `0.5px solid ${clienteActivo?'#bfdbfe':'#e5e7eb'}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease, min-width 0.25s ease, background 0.3s ease',
      overflow: 'hidden',
      position: 'sticky',
      top: 0,
      height: '100vh',
      boxShadow: clienteActivo ? '1px 0 8px rgba(29,78,216,0.08)' : '1px 0 8px rgba(0,0,0,0.04)',
    }}>

      {/* Logo */}
      <div style={{padding:'16px 12px',borderBottom:`0.5px solid ${clienteActivo?'#dbeafe':'#f3f4f6'}`,display:'flex',alignItems:'center',justifyContent:collapsed?'center':'space-between',gap:10,minHeight:60}}>
        {!collapsed && (
          <div style={{display:'flex',alignItems:'center',gap:10,overflow:'hidden'}}>
            <div style={{width:30,height:30,minWidth:30,borderRadius:8,background:accentColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'white',fontWeight:700,transition:'background 0.3s'}}>
              {appNombre.charAt(0)}
            </div>
            <span style={{fontSize:15,fontWeight:600,color:'#1f2937',whiteSpace:'nowrap'}}>{appNombre}</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:6,color:'#6b7280',flexShrink:0,transition:'background 0.15s'}}
          onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background='#f9fafb'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Perfil */}
      <div style={{padding:collapsed?'12px 8px':'12px 14px',borderBottom:`0.5px solid ${clienteActivo?'#dbeafe':'#f3f4f6'}`,display:'flex',alignItems:'center',gap:10,overflow:'hidden',justifyContent:collapsed?'center':'flex-start'}}>
        <div style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:accentColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:'white',flexShrink:0,transition:'background 0.3s'}}>
          {initials}
        </div>
        {!collapsed && (
          <div style={{overflow:'hidden'}}>
            <div style={{fontSize:13,fontWeight:500,color:'#1f2937',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombre}</div>
            <div style={{fontSize:11,color:'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.email || ''}</div>
          </div>
        )}
      </div>

      {/* Selector cliente */}
      <SelectorCliente collapsed={collapsed} />

      {/* Nav */}
      <nav style={{flex:1,padding:'8px',overflowY:'auto',display:'flex',flexDirection:'column',gap:1}}>
        {menuItems.map(group => (
          <div key={group.section} style={{marginBottom:4}}>
            {!collapsed && (
              <div style={{fontSize:10,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',padding:'8px 8px 4px',whiteSpace:'nowrap'}}>
                {group.section}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <a key={item.label} href={item.href}
                  title={collapsed ? item.label : ''}
                  style={{display:'flex',alignItems:'center',gap:10,padding:collapsed?'10px':'9px 10px',borderRadius:8,cursor:'pointer',textDecoration:'none',background:isActive?(clienteActivo?'#dbeafe':'#EFF6FF'):'transparent',justifyContent:collapsed?'center':'flex-start',marginBottom:1,transition:'background 0.15s'}}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background='#f9fafb' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background='transparent' }}>
                  <Icon size={18} color={isActive?accentColor:'#9ca3af'} strokeWidth={isActive?2:1.75} />
                  {!collapsed && (
                    <span style={{fontSize:13,color:isActive?accentColor:'#4b5563',fontWeight:isActive?500:400,whiteSpace:'nowrap'}}>
                      {item.label}
                    </span>
                  )}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{padding:'8px',borderTop:`0.5px solid ${clienteActivo?'#dbeafe':'#f3f4f6'}`,display:'flex',flexDirection:'column',gap:1}}>
        <a href="/configuracion"
          title={collapsed?'Configuracion':''}
          style={{display:'flex',alignItems:'center',gap:10,padding:collapsed?'10px':'9px 10px',borderRadius:8,cursor:'pointer',textDecoration:'none',justifyContent:collapsed?'center':'flex-start',background:pathname==='/configuracion'?(clienteActivo?'#dbeafe':'#EFF6FF'):'transparent',transition:'background 0.15s'}}
          onMouseEnter={e => { if (pathname!=='/configuracion') e.currentTarget.style.background='#f9fafb' }}
          onMouseLeave={e => { if (pathname!=='/configuracion') e.currentTarget.style.background=pathname==='/configuracion'?(clienteActivo?'#dbeafe':'#EFF6FF'):'transparent' }}>
          <Settings size={18} color={pathname==='/configuracion'?accentColor:'#9ca3af'} strokeWidth={1.75} />
          {!collapsed && <span style={{fontSize:13,color:pathname==='/configuracion'?accentColor:'#4b5563',fontWeight:pathname==='/configuracion'?500:400}}>Configuracion</span>}
        </a>
        <button onClick={handleLogout}
          title={collapsed?'Cerrar sesion':''}
          style={{display:'flex',alignItems:'center',gap:10,padding:collapsed?'10px':'9px 10px',borderRadius:8,cursor:'pointer',background:'none',border:'none',justifyContent:collapsed?'center':'flex-start',width:'100%',transition:'background 0.15s'}}
          onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background='none'}>
          <LogOut size={18} color="#ef4444" strokeWidth={1.75} />
          {!collapsed && <span style={{fontSize:13,color:'#ef4444'}}>Cerrar sesion</span>}
        </button>
      </div>
    </aside>
  )
}

function AppLayout({ children }) {
  const pathname = usePathname()
  const { clienteActivo } = useCliente()
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
      <body style={{margin:0,fontFamily:'system-ui,sans-serif',display:'flex',minHeight:'100vh',background:'#f8fafc'}}>
        <Sidebar user={user} collapsed={collapsed} setCollapsed={setCollapsed} />
        <main style={{flex:1,overflowY:'auto',position:'relative',transition:'all 0.25s ease'}}>
          {/* Banner global cliente activo */}
          {clienteActivo && (
            <div style={{background:'#1d4ed8',padding:'8px 20px',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:50}}>
              <div style={{width:22,height:22,borderRadius:6,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white',flexShrink:0}}>
                {clienteActivo.nombre.charAt(0)}
              </div>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.8)'}}>Consultando cliente:</span>
              <span style={{fontSize:13,fontWeight:600,color:'white'}}>{clienteActivo.nombre}</span>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontFamily:'monospace'}}>{clienteActivo.rfc}</span>
            </div>
          )}
          {children}
          <CalculadoraFlotante />
        </main>
      </body>
    </html>
  )
}

export default function RootLayout({ children }) {
  return (
    <ClienteProvider>
      <AppLayout>{children}</AppLayout>
    </ClienteProvider>
  )
}