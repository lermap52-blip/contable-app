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
  Building2, BookOpen, ScrollText, Scale, Clock,
  ShoppingCart, Package, Landmark, BarChart3, UserSearch,
  Truck, Warehouse
} from 'lucide-react'

const authRoutes = ['/auth/login', '/auth/registro', '/auth/recuperar', '/auth/nueva-password']

const MODULOS = [
  {
    id: 'fiscal', label: 'Fiscal', icon: '📊', tag: 'Fiscal / Contable',
    nav: [
      { section: 'Contabilidad', items: [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard },
        { label: 'Catálogo de cuentas', href: '/fiscal/cuentas', icon: BookOpen },
        { label: 'Pólizas / Asientos', href: '/fiscal/polizas', icon: ScrollText },
        { label: 'Balanza de comprobación', href: '/fiscal/balanza', icon: Scale },
      ]},
      { section: 'Impuestos SAT', items: [
        { label: 'Ingresos', href: '/ingresos', icon: TrendingUp },
        { label: 'Egresos', href: '/egresos', icon: TrendingDown },
        { label: 'Liquidación IVA/ISR', href: '/impuestos', icon: Calculator },
        { label: 'Declaraciones', href: '/fiscal/declaraciones', icon: FileText, chip: 'SAT' },
        { label: 'Próximos pagos', href: '/fiscal/pagos', icon: Clock },
      ]},
      { section: 'Reportes', items: [
        { label: 'Estado de resultados', href: '/fiscal/resultados', icon: BarChart3 },
        { label: 'Balance general', href: '/fiscal/balance', icon: Scale },
        { label: 'Reportes SAT', href: '/fiscal/reportes', icon: FileText },
      ]}
    ]
  },
  {
    id: 'ventas', label: 'Ventas', icon: '🧾', tag: 'Ventas y Facturación',
    nav: [
      { section: 'Facturación', items: [
        { label: 'Facturas CFDI', href: '/facturas', icon: FileText },
        { label: 'Notas de crédito', href: '/ventas/notas', icon: ScrollText },
        { label: 'Complementos de pago', href: '/ventas/complementos', icon: FileText },
      ]},
      { section: 'Ventas', items: [
        { label: 'Catálogo de clientes', href: '/clientes', icon: Users },
        { label: 'Cotizaciones', href: '/ventas/cotizaciones', icon: ScrollText },
        { label: 'Pedidos', href: '/ventas/pedidos', icon: ShoppingCart },
      ]}
    ]
  },
  {
    id: 'compras', label: 'Compras', icon: '🛒', tag: 'Compras y Gastos',
    nav: [
      { section: 'Compras', items: [
        { label: 'Órdenes de compra', href: '/compras/ordenes', icon: ShoppingCart },
        { label: 'Catálogo proveedores', href: '/compras/proveedores', icon: Truck },
        { label: 'Carga XML SAT', href: '/egresos', icon: FileText, chip: 'SAT' },
        { label: 'Cuentas por pagar', href: '/compras/cxp', icon: Calculator },
      ]}
    ]
  },
  {
    id: 'nomina', label: 'Nómina', icon: '👥', tag: 'Nómina y RRHH',
    nav: [
      { section: 'Empleados', items: [
        { label: 'Expedientes digitales', href: '/nomina/empleados', icon: Users },
        { label: 'Incidencias', href: '/nomina/incidencias', icon: Clock },
        { label: 'Vacaciones', href: '/nomina/vacaciones', icon: Clock },
      ]},
      { section: 'Nómina', items: [
        { label: 'Cálculo de nómina', href: '/nomina/calculo', icon: Calculator },
        { label: 'Timbrado CFDI', href: '/nomina/timbrado', icon: FileText },
        { label: 'Cuotas IMSS', href: '/nomina/imss', icon: Calculator },
        { label: 'INFONAVIT / RCV', href: '/nomina/infonavit', icon: Building2 },
      ]}
    ]
  },
  {
    id: 'inventarios', label: 'Inventario', icon: '📦', tag: 'Inventarios',
    nav: [
      { section: 'Productos', items: [
        { label: 'Catálogo SKU', href: '/inventarios/productos', icon: Package },
        { label: 'Entradas', href: '/inventarios/entradas', icon: TrendingUp },
        { label: 'Salidas', href: '/inventarios/salidas', icon: TrendingDown },
      ]},
      { section: 'Almacenes', items: [
        { label: 'Multialmacén', href: '/inventarios/almacenes', icon: Warehouse },
        { label: 'Alertas stock mínimo', href: '/inventarios/alertas', icon: AlertTriangle },
      ]}
    ]
  },
  {
    id: 'tesoreria', label: 'Tesorería', icon: '🏦', tag: 'Tesorería y Bancos',
    nav: [
      { section: 'Cuentas', items: [
        { label: 'Cuentas bancarias', href: '/tesoreria/cuentas', icon: Landmark },
        { label: 'Conciliación bancaria', href: '/tesoreria/conciliacion', icon: Scale },
        { label: 'Movimientos', href: '/tesoreria/movimientos', icon: TrendingUp },
      ]},
      { section: 'Flujo', items: [
        { label: 'Cash Flow', href: '/tesoreria/cashflow', icon: BarChart3 },
        { label: 'Prog. de pagos', href: '/tesoreria/pagos', icon: Clock },
      ]}
    ]
  },
  {
    id: 'crm', label: 'CRM', icon: '🤝', tag: 'CRM Clientes',
    nav: [
      { section: 'CRM', items: [
        { label: 'Prospectos', href: '/crm/prospectos', icon: UserSearch },
        { label: 'Recordatorios cobranza', href: '/crm/cobranza', icon: Clock },
        { label: 'Historial interacciones', href: '/crm/historial', icon: ScrollText },
      ]}
    ]
  },
  {
    id: 'bi', label: 'Business', icon: '📈', tag: 'Business Intelligence',
    nav: [
      { section: 'Dashboard', items: [
        { label: 'Resumen ejecutivo', href: '/bi/resumen', icon: BarChart3 },
        { label: 'Ingresos vs Egresos', href: '/bi/comparativa', icon: TrendingUp },
        { label: 'Proyección impuestos', href: '/bi/proyeccion', icon: Calculator },
        { label: 'Top clientes', href: '/bi/clientes', icon: Users },
        { label: 'Top productos', href: '/bi/productos', icon: Package },
      ]}
    ]
  },
]

const resico = [
  { hasta: 25000, tasa: 0.0100, label: 'hasta $25,000' },
  { hasta: 50000, tasa: 0.0110, label: 'hasta $50,000' },
  { hasta: 83333.33, tasa: 0.0150, label: 'hasta $83,333' },
  { hasta: 208333.33, tasa: 0.0200, label: 'hasta $208,333' },
  { hasta: 3500000, tasa: 0.0250, label: 'hasta $3,500,000' },
]
function getTramo(m) { for (let t of resico) { if (m <= t.hasta) return t } return resico[resico.length-1] }
function fmtN(n) { return '$'+n.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

function DockButton({ modulo, activo, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center'}}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width:36,height:36,borderRadius:'50%',
          display:'flex',alignItems:'center',justifyContent:'center',
          cursor:'pointer',border:'none',
          background:activo?'#f1f5f9':'transparent',
          outline:activo?'1.5px solid #e2e8f0':'1.5px solid transparent',
          fontSize:17,
          transform:hover?'scale(1.28)':'scale(1)',
          transition:'transform 0.2s cubic-bezier(.34,1.56,.64,1), background 0.15s',
          flexShrink:0,
        }}>
        <span style={{lineHeight:1}}>{modulo.icon}</span>
      </button>
      {activo && (
        <div style={{width:4,height:4,borderRadius:'50%',background:'#185FA5',position:'absolute',bottom:-7}}></div>
      )}
      {hover && (
        <div style={{
          position:'absolute',top:'calc(100% + 12px)',left:'50%',
          transform:'translateX(-50%)',
          background:'rgba(15,23,42,0.88)',color:'white',
          fontSize:11,fontWeight:500,padding:'5px 10px',borderRadius:7,
          whiteSpace:'nowrap',pointerEvents:'none',
          zIndex:300,
          boxShadow:'0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {modulo.tag}
          <div style={{position:'absolute',top:-4,left:'50%',transform:'translateX(-50%)',width:8,height:8,background:'rgba(15,23,42,0.88)',clipPath:'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
        </div>
      )}
    </div>
  )
}

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

  if (collapsed) return (
    <div style={{padding:'8px',borderBottom:'0.5px solid #f3f4f6',display:'flex',justifyContent:'center'}}>
      <div title={clienteActivo?.nombre||'Mi Despacho'} onClick={() => setOpen(!open)}
        style={{width:32,height:32,borderRadius:8,background:clienteActivo?'#185FA5':'#f0fdf4',border:`1px solid ${clienteActivo?'#bfdbfe':'#bbf7d0'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:clienteActivo?'white':'#16a34a',cursor:'pointer'}}>
        {clienteActivo?clienteActivo.nombre.charAt(0):'🏢'}
      </div>
    </div>
  )

  return (
    <div ref={ref} style={{padding:'8px 10px',borderBottom:'0.5px solid #f3f4f6',position:'relative'}}>
      <div style={{fontSize:9,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>Contexto activo</div>
      <button onClick={() => setOpen(!open)}
        style={{width:'100%',padding:'8px 10px',background:clienteActivo?'#eff6ff':'#f0fdf4',border:`0.5px solid ${clienteActivo?'#bfdbfe':'#bbf7d0'}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,overflow:'hidden',flex:1}}>
          {clienteActivo ? (
            <>
              <div style={{width:22,height:22,minWidth:22,borderRadius:6,background:'#185FA5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>{clienteActivo.nombre.charAt(0)}</div>
              <div style={{overflow:'hidden'}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1e3a8a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{clienteActivo.nombre.split(' ').slice(0,2).join(' ')}</div>
                <div style={{fontSize:10,color:'#93c5fd',fontFamily:'monospace'}}>{clienteActivo.rfc}</div>
              </div>
            </>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:22,height:22,minWidth:22,borderRadius:6,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Building2 size={12} color="white" />
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'#15803d'}}>Mi Despacho</div>
                <div style={{fontSize:10,color:'#4ade80'}}>Vista personal</div>
              </div>
            </div>
          )}
        </div>
        <ChevronDown size={13} color="#94a3b8" style={{flexShrink:0,transform:open?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.15s'}} />
      </button>

      {alertaEfirma && clienteActivo && (
        <div style={{marginTop:6,padding:'5px 8px',background:'#fffbeb',border:'0.5px solid #fde68a',borderRadius:6,display:'flex',alignItems:'center',gap:6}}>
          <AlertTriangle size={11} color="#d97706" />
          <span style={{fontSize:10,color:'#d97706',fontWeight:500}}>{diasVenc<=0?'e.firma vencida':`e.firma vence en ${diasVenc} dias`}</span>
        </div>
      )}

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:10,right:10,background:'white',border:'0.5px solid #e5e7eb',borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,0.08)',zIndex:200,overflow:'hidden'}}>
          <div style={{maxHeight:220,overflowY:'auto'}}>
            <button onClick={() => { seleccionarCliente(null); setOpen(false) }}
              style={{width:'100%',padding:'10px 12px',background:!clienteActivo?'#f0fdf4':'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'0.5px solid #f3f4f6',display:'flex',alignItems:'center',gap:8}}
              onMouseEnter={e => { if(clienteActivo) e.currentTarget.style.background='#f9fafb' }}
              onMouseLeave={e => { if(clienteActivo) e.currentTarget.style.background='none' }}>
              <div style={{width:24,height:24,borderRadius:6,background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Building2 size={13} color="white" />
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:'#15803d'}}>Mi Despacho</div>
                <div style={{fontSize:10,color:'#94a3b8'}}>Ver mi informacion personal</div>
              </div>
              {!clienteActivo && <span style={{marginLeft:'auto',fontSize:10,background:'#dcfce7',color:'#16a34a',padding:'2px 7px',borderRadius:20,fontWeight:500}}>Activo</span>}
            </button>
            {clientes.length > 0 && <div style={{padding:'6px 12px',fontSize:9,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',background:'#fafafa'}}>Clientes</div>}
            {clientes.map(c => {
              const dias = diasParaVencimiento(c.vencimiento_efirma)
              const alerta = dias !== null && dias <= 30
              const isActive = clienteActivo?.id === c.id
              return (
                <button key={c.id} onClick={() => { seleccionarCliente(c); setOpen(false) }}
                  style={{width:'100%',padding:'9px 12px',background:isActive?'#eff6ff':'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'0.5px solid #f3f4f6',display:'flex',alignItems:'center',gap:8}}
                  onMouseEnter={e => { if(!isActive) e.currentTarget.style.background='#f9fafb' }}
                  onMouseLeave={e => { if(!isActive) e.currentTarget.style.background=isActive?'#eff6ff':'none' }}>
                  <div style={{width:24,height:24,minWidth:24,borderRadius:6,background:'#185FA5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>{c.nombre.charAt(0)}</div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:12,fontWeight:500,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.nombre.split(' ').slice(0,3).join(' ')}</div>
                    <div style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>{c.rfc}</div>
                  </div>
                  {alerta && <AlertTriangle size={11} color="#d97706" style={{flexShrink:0}} />}
                  {isActive && <span style={{marginLeft:4,fontSize:10,background:'#dbeafe',color:'#1d4ed8',padding:'2px 7px',borderRadius:20,fontWeight:500,flexShrink:0}}>Activo</span>}
                </button>
              )
            })}
            {clientes.length === 0 && <div style={{padding:'12px',fontSize:12,color:'#94a3b8',textAlign:'center'}}>No hay clientes registrados</div>}
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

function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy tu asistente fiscal. Puedo ayudarte con dudas sobre RESICO, IVA, ISR, facturas y más. ¿En qué te puedo ayudar?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const enviar = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const historial = messages.filter((_,i) => i > 0).map(m => ({ role: m.role, content: m.text }))
      historial.push({ role: 'user', content: userMsg })
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historial })
      })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.texto || 'Ocurrio un error.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Ocurrio un error. Intenta de nuevo.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:999,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
      {open && (
        <div style={{background:'white',borderRadius:20,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',border:'0.5px solid #e5e7eb',width:340,display:'flex',flexDirection:'column',overflow:'hidden',maxHeight:500}}>
          <div style={{background:'linear-gradient(135deg,#185FA5,#0C447C)',padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🤖</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'white'}}>Asistente Fiscal</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Experto en SAT · Mexico</div>
            </div>
            <button onClick={() => setOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.7)',fontSize:18,lineHeight:1}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:10,maxHeight:320}}>
            {messages.map((m,i) => (
              <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                <div style={{maxWidth:'85%',padding:'9px 12px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.role==='user'?'#185FA5':'#f8fafc',color:m.role==='user'?'white':'#1f2937',fontSize:13,lineHeight:1.5,border:m.role==='assistant'?'0.5px solid #e5e7eb':'none'}}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',justifyContent:'flex-start'}}>
                <div style={{padding:'9px 14px',borderRadius:'16px 16px 16px 4px',background:'#f8fafc',border:'0.5px solid #e5e7eb',display:'flex',gap:4,alignItems:'center'}}>
                  {[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#9ca3af'}}></div>)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{padding:'10px 12px',borderTop:'0.5px solid #e5e7eb',display:'flex',gap:8,alignItems:'center'}}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && enviar()}
              placeholder="Escribe tu pregunta fiscal..."
              style={{flex:1,padding:'9px 12px',border:'0.5px solid #e5e7eb',borderRadius:20,fontSize:13,color:'#1f2937',outline:'none',background:'#f9fafb'}} />
            <button onClick={enviar} disabled={loading||!input.trim()}
              style={{width:36,height:36,borderRadius:'50%',background:input.trim()?'#185FA5':'#f3f4f6',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim()?'white':'#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
        <button onClick={() => setOpen(!open)} title="Asistente fiscal"
          style={{width:52,height:52,borderRadius:'50%',background:'white',border:'2px solid #1f2937',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,0,0.12)',transition:'transform 0.2s'}}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v1a4 4 0 0 1-8 0v-1H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6a4 4 0 0 1 4-4z"/>
            <circle cx="9" cy="10" r="0.8" fill="#1f2937"/><circle cx="15" cy="10" r="0.8" fill="#1f2937"/>
            <path d="M9 14s1 1.5 3 1.5 3-1.5 3-1.5"/>
          </svg>
        </button>
        <CalculadoraFlotante />
      </div>
    </div>
  )
}

function CalculadoraFlotante() {
  const [open, setOpen] = useState(false)
  const [ingreso, setIngreso] = useState('')
  const [ivaRate, setIvaRate] = useState(0.16)
  const [ivaLbl, setIvaLbl] = useState('16%')
  const ivasOpts = [{label:'16%',rate:0.16},{label:'8%',rate:0.08},{label:'4%',rate:0.04},{label:'0%',rate:0},{label:'Ex.',rate:-1}]
  const ing = parseFloat(ingreso)||0
  const iva = ivaRate===-1?0:ing*ivaRate
  const tramo = getTramo(ing)
  const isr = ing*tramo.tasa
  const total = iva+isr

  return (
    <div style={{position:'relative'}}>
      {open && (
        <div style={{position:'absolute',bottom:64,right:0,width:300,background:'white',border:'0.5px solid #e5e7eb',borderRadius:16,boxShadow:'0 4px 24px rgba(0,0,0,0.10)',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'0.5px solid #e5e7eb'}}>
            <span style={{fontSize:14,fontWeight:500,color:'#1f2937'}}>Calculadora de impuestos</span>
            <button onClick={() => setOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',display:'flex',alignItems:'center'}}><ChevronRight size={18}/></button>
          </div>
          <div style={{padding:16,maxHeight:400,overflowY:'auto'}}>
            <div style={{position:'relative',marginBottom:14}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#9ca3af'}}>$</span>
              <input type="number" value={ingreso} onChange={e => setIngreso(e.target.value)} placeholder="0.00"
                style={{width:'100%',padding:'9px 10px 9px 24px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:17,fontWeight:500,color:'#1f2937',outline:'none',boxSizing:'border-box'}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginBottom:14}}>
              {ivasOpts.map(o => (
                <button key={o.label} onClick={() => { setIvaRate(o.rate); setIvaLbl(o.label) }}
                  style={{padding:'6px 4px',border:'none',borderRadius:8,fontSize:11,fontWeight:500,cursor:'pointer',background:ivaRate===o.rate?'#E6F1FB':'#f9fafb',color:ivaRate===o.rate?'#185FA5':'#374151'}}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{background:'#EAF3DE',border:'0.5px solid #3B6D11',borderRadius:8,padding:'8px 12px',fontSize:12,fontWeight:500,color:'#3B6D11',marginBottom:14}}>
              RESICO · Persona fisica · SAT {new Date().getFullYear()}
            </div>
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
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,padding:'10px 12px',background:'#f9fafb',borderRadius:10}}>
              <span style={{fontSize:12,color:'#6b7280'}}>Total impuestos</span>
              <span style={{fontSize:20,fontWeight:600,color:'#A32D2D'}}>{fmtN(total)}</span>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} title="Calculadora de impuestos"
        style={{width:52,height:52,borderRadius:'50%',background:'white',border:'2px solid #1f2937',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,0,0.12)',transition:'transform 0.2s'}}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <rect x="7" y="5" width="10" height="4" rx="1"/>
          <circle cx="8" cy="13" r="0.8" fill="#1f2937"/><circle cx="12" cy="13" r="0.8" fill="#1f2937"/><circle cx="16" cy="13" r="0.8" fill="#1f2937"/>
          <circle cx="8" cy="17" r="0.8" fill="#1f2937"/><circle cx="12" cy="17" r="0.8" fill="#1f2937"/>
          <rect x="14" y="16" width="3" height="2" rx="0.5" fill="#1f2937"/>
        </svg>
      </button>
    </div>
  )
}

function Sidebar({ user, moduloActivo, collapsed, setCollapsed }) {
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
  const accentColor = clienteActivo ? '#1d4ed8' : avatarColor
  const sidebarBg = clienteActivo ? '#f8faff' : 'white'
  const modulo = MODULOS.find(m => m.id === moduloActivo) || MODULOS[0]

  return (
    <aside style={{width:collapsed?64:240,minWidth:collapsed?64:240,background:sidebarBg,borderRight:`0.5px solid ${clienteActivo?'#bfdbfe':'#e5e7eb'}`,display:'flex',flexDirection:'column',transition:'width 0.25s ease,min-width 0.25s ease',overflow:'hidden',height:'100%',boxShadow:clienteActivo?'1px 0 8px rgba(29,78,216,0.06)':'1px 0 6px rgba(0,0,0,0.03)'}}>

      <div style={{padding:'10px 12px',borderBottom:`0.5px solid ${clienteActivo?'#dbeafe':'#f3f4f6'}`,display:'flex',alignItems:'center',justifyContent:collapsed?'center':'space-between',gap:8,minHeight:50}}>
        {!collapsed && (
          <div style={{display:'flex',alignItems:'center',gap:8,overflow:'hidden'}}>
            <div style={{width:26,height:26,minWidth:26,borderRadius:7,background:accentColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'white',fontWeight:700}}>{appNombre.charAt(0)}</div>
            <span style={{fontSize:13,fontWeight:600,color:'#1f2937',whiteSpace:'nowrap'}}>{appNombre}</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:7,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:5,color:'#6b7280',flexShrink:0}}
          onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background='#f9fafb'}>
          {collapsed?<ChevronRight size={14}/>:<ChevronLeft size={14}/>}
        </button>
      </div>

      <div style={{padding:collapsed?'8px':'10px 12px',borderBottom:`0.5px solid ${clienteActivo?'#dbeafe':'#f3f4f6'}`,display:'flex',alignItems:'center',gap:8,justifyContent:collapsed?'center':'flex-start'}}>
        <div style={{width:30,height:30,minWidth:30,borderRadius:'50%',background:accentColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'white',flexShrink:0}}>{initials}</div>
        {!collapsed && (
          <div style={{overflow:'hidden'}}>
            <div style={{fontSize:12,fontWeight:500,color:'#1f2937',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombre}</div>
            <div style={{fontSize:10,color:'#9ca3af',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.email||''}</div>
          </div>
        )}
      </div>

      <SelectorCliente collapsed={collapsed} />

      {!collapsed && (
        <div style={{padding:'6px 14px 4px',borderBottom:'0.5px solid #f3f4f6'}}>
          <div style={{fontSize:9,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>Módulo activo</div>
          <div style={{fontSize:12,fontWeight:500,color:accentColor,display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13}}>{modulo.icon}</span>
            {modulo.tag}
          </div>
        </div>
      )}

      <nav style={{flex:1,padding:'6px 8px',overflowY:'auto',display:'flex',flexDirection:'column',gap:1}}>
        {modulo.nav.map(group => (
          <div key={group.section} style={{marginBottom:2}}>
            {!collapsed && <div style={{fontSize:9,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',padding:'6px 8px 3px',whiteSpace:'nowrap'}}>{group.section}</div>}
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <a key={item.label} href={item.href} title={collapsed?item.label:''}
                  style={{display:'flex',alignItems:'center',gap:8,padding:collapsed?'9px':'7px 10px',borderRadius:7,cursor:'pointer',textDecoration:'none',background:isActive?(clienteActivo?'#dbeafe':'#EFF6FF'):'transparent',justifyContent:collapsed?'center':'flex-start',marginBottom:1,transition:'background 0.15s'}}
                  onMouseEnter={e => { if(!isActive) e.currentTarget.style.background='#f9fafb' }}
                  onMouseLeave={e => { if(!isActive) e.currentTarget.style.background='transparent' }}>
                  <Icon size={15} color={isActive?accentColor:'#9ca3af'} strokeWidth={isActive?2:1.75} />
                  {!collapsed && (
                    <>
                      <span style={{fontSize:12,color:isActive?accentColor:'#4b5563',fontWeight:isActive?500:400,whiteSpace:'nowrap',flex:1}}>{item.label}</span>
                      {item.chip && <span style={{fontSize:9,padding:'2px 6px',borderRadius:10,background:'#E6F1FB',color:'#185FA5',fontWeight:500,whiteSpace:'nowrap'}}>{item.chip}</span>}
                    </>
                  )}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      <div style={{padding:'6px 8px',borderTop:`0.5px solid ${clienteActivo?'#dbeafe':'#f3f4f6'}`,display:'flex',flexDirection:'column',gap:1}}>
        <a href="/configuracion" title={collapsed?'Configuracion':''}
          style={{display:'flex',alignItems:'center',gap:8,padding:collapsed?'9px':'7px 10px',borderRadius:7,cursor:'pointer',textDecoration:'none',justifyContent:collapsed?'center':'flex-start',background:pathname==='/configuracion'?(clienteActivo?'#dbeafe':'#EFF6FF'):'transparent',transition:'background 0.15s'}}
          onMouseEnter={e => { if(pathname!=='/configuracion') e.currentTarget.style.background='#f9fafb' }}
          onMouseLeave={e => { if(pathname!=='/configuracion') e.currentTarget.style.background=pathname==='/configuracion'?(clienteActivo?'#dbeafe':'#EFF6FF'):'transparent' }}>
          <Settings size={15} color={pathname==='/configuracion'?accentColor:'#9ca3af'} strokeWidth={1.75}/>
          {!collapsed && <span style={{fontSize:12,color:pathname==='/configuracion'?accentColor:'#4b5563',fontWeight:pathname==='/configuracion'?500:400}}>Configuracion</span>}
        </a>
        <button onClick={handleLogout} title={collapsed?'Cerrar sesion':''}
          style={{display:'flex',alignItems:'center',gap:8,padding:collapsed?'9px':'7px 10px',borderRadius:7,cursor:'pointer',background:'none',border:'none',justifyContent:collapsed?'center':'flex-start',width:'100%',transition:'background 0.15s'}}
          onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background='none'}>
          <LogOut size={15} color="#ef4444" strokeWidth={1.75}/>
          {!collapsed && <span style={{fontSize:12,color:'#ef4444'}}>Cerrar sesion</span>}
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
  const [moduloActivo, setModuloActivo] = useState('fiscal')
  const [config, setConfig] = useState({})
  const isAuthPage = authRoutes.includes(pathname)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const saved = localStorage.getItem('modulo_activo')
    if (saved) setModuloActivo(saved)
    const savedConfig = localStorage.getItem('config_app')
    if (savedConfig) setConfig(JSON.parse(savedConfig))
    const handler = (e) => setConfig(e.detail)
    window.addEventListener('config_actualizada', handler)
    return () => window.removeEventListener('config_actualizada', handler)
  }, [])

  const cambiarModulo = (id) => {
    setModuloActivo(id)
    localStorage.setItem('modulo_activo', id)
  }

  const avatarColor = config.avatarColor || '#185FA5'
  const appNombre = config.appNombre || 'ContableApp'
  const nombre = config.nombre || user?.email?.split('@')[0] || 'U'

  if (isAuthPage) {
    return (
      <html lang="es">
        <body style={{margin:0,fontFamily:'system-ui,sans-serif'}}>{children}</body>
      </html>
    )
  }

  return (
    <html lang="es">
      <body style={{margin:0,fontFamily:'system-ui,sans-serif',display:'flex',flexDirection:'column',minHeight:'100vh',background:'#f8fafc'}}>

        {/* Topbar blanca minimalista */}
        <div style={{background:'white',padding:'4px 20px',display:'flex',alignItems:'center',gap:6,flexShrink:0,position:'sticky',top:0,zIndex:100,borderBottom:'0.5px solid #e5e7eb',boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
          <div style={{width:26,height:26,borderRadius:7,background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'white',flexShrink:0,marginRight:4}}>
            {appNombre.charAt(0)}
          </div>
          <div style={{width:0.5,height:20,background:'#e5e7eb',margin:'0 8px',flexShrink:0}}></div>

          <div style={{display:'flex',alignItems:'center',gap:4}}>
            {MODULOS.map(m => (
              <DockButton key={m.id} modulo={m} activo={moduloActivo===m.id} onClick={() => cambiarModulo(m.id)} />
            ))}
          </div>

          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            <div style={{width:0.5,height:20,background:'#e5e7eb',margin:'0 4px'}}></div>
            <button title="Configuracion" onClick={() => { window.location.href='/configuracion' }}
              style={{width:30,height:30,borderRadius:'50%',background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 0.2s'}}
              onMouseEnter={e => e.currentTarget.style.transform='scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
              <Settings size={14} color="#9ca3af" strokeWidth={1.5}/>
            </button>
            <div style={{width:28,height:28,borderRadius:'50%',background:avatarColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,color:'white',cursor:'pointer'}}
              title={nombre}>
              {nombre.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Banner cliente activo */}
        {clienteActivo && (
          <div style={{background:'#1d4ed8',padding:'6px 20px',display:'flex',alignItems:'center',gap:10,zIndex:50,flexShrink:0}}>
            <div style={{width:18,height:18,borderRadius:5,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'white',flexShrink:0}}>{clienteActivo.nombre.charAt(0)}</div>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.75)'}}>Consultando cliente:</span>
            <span style={{fontSize:12,fontWeight:600,color:'white'}}>{clienteActivo.nombre}</span>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.55)',fontFamily:'monospace'}}>{clienteActivo.rfc}</span>
          </div>
        )}

        {/* Body */}
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          <Sidebar user={user} moduloActivo={moduloActivo} collapsed={collapsed} setCollapsed={setCollapsed} />
          <main style={{flex:1,overflowY:'auto',position:'relative'}}>
            {children}
            <ChatBot />
          </main>
        </div>
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