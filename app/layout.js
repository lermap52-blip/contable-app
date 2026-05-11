'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from './supabase'
import { ClienteProvider, useCliente } from './ClienteContext'
import "./globals.css"
import {
  LayoutDashboard, TrendingUp, TrendingDown, FileText,
  Users, Calculator, Settings, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, AlertTriangle,
  Building2, BookOpen, ScrollText, Scale, Clock,
  ShoppingCart, Package, Landmark, BarChart3, UserSearch,
  Truck, Warehouse
} from 'lucide-react'

const authRoutes = ['/auth/login', '/auth/registro', '/auth/recuperar', '/auth/nueva-password']

const MODULOS = [
  {
    id: 'fiscal', label: 'Fiscal', icon: 'ti-scale', color: '#e03131', tag: 'Fiscal / Contable',
    tabs: [
      {
        id: 'pf', label: 'P. Física',
        nav: [
          { section: 'General', items: [
            { label: 'Dashboard', href: '/', icon: LayoutDashboard },
          ]},
          { section: 'Regímenes', items: [
            { label: 'RESICO PF', href: '/ingresos', icon: TrendingUp, chip: 'Activo', regimen: 'resico' },
            { label: 'Actividad Empresarial', href: '/fiscal/actividad', icon: FileText, regimen: 'actividad' },
            { label: 'Arrendamiento', href: '/fiscal/arrendamiento', icon: Building2, regimen: 'arrendamiento' },
            { label: 'RIF', href: '/fiscal/rif', icon: ScrollText, chip: 'Legacy', regimen: 'rif' },
            { label: 'Sueldos y Salarios', href: '/fiscal/sueldos', icon: Users, regimen: 'sueldos' },
            { label: 'Plataformas Tecnológicas', href: '/fiscal/plataformas', icon: FileText, regimen: 'plataformas' },
            { label: 'Intereses', href: '/fiscal/intereses', icon: Calculator, regimen: 'intereses' },
            { label: 'Dividendos', href: '/fiscal/dividendos', icon: TrendingUp, regimen: 'dividendos' },
          ]},
          { section: 'Impuestos y SAT', items: [
            { label: 'Declaración mensual', href: '/fiscal/declaraciones', icon: FileText, chip: 'SAT' },
            { label: 'DIOT mensual', href: '/fiscal/diot', icon: ScrollText, chip: 'SAT' },
            { label: 'Calendario fiscal', href: '/fiscal/pagos', icon: Clock },
          ]},
          { section: 'Comprobantes', items: [
            { label: 'Ingresos', href: '/ingresos', icon: TrendingUp },
            { label: 'Egresos / XML SAT', href: '/egresos', icon: TrendingDown },
            { label: 'Liquidación IVA/ISR', href: '/impuestos', icon: Calculator },
          ]},
        ]
      },
      {
        id: 'pm', label: 'P. Moral',
        nav: [
          { section: 'General', items: [
            { label: 'Dashboard PM', href: '/', icon: LayoutDashboard },
          ]},
          { section: 'Regímenes', items: [
            { label: 'Régimen General PM', href: '/fiscal/general-pm', icon: FileText, regimen: 'general_pm' },
            { label: 'RESICO PM', href: '/fiscal/resico-pm', icon: TrendingUp, chip: 'Nuevo', regimen: 'resico_pm' },
            { label: 'Fines No Lucrativos', href: '/fiscal/fnl', icon: Building2, regimen: 'fines_no_lucrativos' },
            { label: 'AGAPES', href: '/fiscal/agapes', icon: FileText, regimen: 'agapes' },
          ]},
          { section: 'Contabilidad electrónica', items: [
            { label: 'Catálogo de cuentas', href: '/fiscal/cuentas', icon: BookOpen, chip: 'SAT' },
            { label: 'Pólizas / Asientos', href: '/fiscal/polizas', icon: ScrollText },
            { label: 'Balanza de comprobación', href: '/fiscal/balanza', icon: Scale, chip: 'SAT' },
          ]},
          { section: 'Impuestos y SAT', items: [
            { label: 'Pago provisional ISR', href: '/fiscal/declaraciones', icon: FileText, chip: 'SAT' },
            { label: 'DIOT mensual', href: '/fiscal/diot', icon: ScrollText, chip: 'SAT' },
            { label: 'Declaración anual PM', href: '/fiscal/anual', icon: Calculator },
          ]},
          { section: 'Estados financieros', items: [
            { label: 'Estado de resultados', href: '/fiscal/resultados', icon: BarChart3 },
            { label: 'Balance general', href: '/fiscal/balance', icon: Scale },
            { label: 'Flujo de efectivo', href: '/fiscal/flujo', icon: TrendingUp },
          ]},
        ]
      }
    ]
  },
  { id: 'ventas', label: 'Ventas', icon: 'ti-receipt-2', color: '#e8590c', tag: 'Ventas y Facturación',
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
  { id: 'compras', label: 'Compras', icon: 'ti-truck-delivery', color: '#f08c00', tag: 'Compras y Gastos',
    nav: [
      { section: 'Compras', items: [
        { label: 'Órdenes de compra', href: '/compras/ordenes', icon: ShoppingCart },
        { label: 'Catálogo proveedores', href: '/compras/proveedores', icon: Truck },
        { label: 'Carga XML SAT', href: '/egresos', icon: FileText, chip: 'SAT' },
        { label: 'Cuentas por pagar', href: '/compras/cxp', icon: Calculator },
      ]}
    ]
  },
  { id: 'nomina', label: 'Nómina', icon: 'ti-address-book', color: '#2f9e44', tag: 'Nómina y RRHH',
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
  { id: 'inventarios', label: 'Inventario', icon: 'ti-box', color: '#1098ad', tag: 'Inventarios',
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
  { id: 'tesoreria', label: 'Tesorería', icon: 'ti-coin', color: '#1971c2', tag: 'Tesorería y Bancos',
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
  { id: 'crm', label: 'CRM', icon: 'ti-phone-call', color: '#3b5bdb', tag: 'CRM Clientes',
    nav: [
      { section: 'CRM', items: [
        { label: 'Prospectos', href: '/crm/prospectos', icon: UserSearch },
        { label: 'Recordatorios cobranza', href: '/crm/cobranza', icon: Clock },
        { label: 'Historial interacciones', href: '/crm/historial', icon: ScrollText },
      ]}
    ]
  },
  { id: 'bi', label: 'Business', icon: 'ti-presentation-analytics', color: '#6741d9', tag: 'Business Intelligence',
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
  { hasta: 25000, tasa: 0.0100 },
  { hasta: 50000, tasa: 0.0110 },
  { hasta: 83333.33, tasa: 0.0150 },
  { hasta: 208333.33, tasa: 0.0200 },
  { hasta: 3500000, tasa: 0.0250 },
]
function getTramo(m) { for (let t of resico) { if (m <= t.hasta) return t } return resico[resico.length-1] }
function fmtN(n) { return '$'+n.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

const TEMA = {
  claro: {
    topbarBg: 'white',
    topbarBorder: '#f1f5f9',
    topbarShadow: '0 1px 4px rgba(0,0,0,0.04)',
    sepColor: '#e5e7eb',
    bubbleOn: '#f1f5f9',
    bubbleOnOutline: '#e2e8f0',
    sidebarBg: '#1e2a4a',
    sidebarBorder: 'rgba(255,255,255,0.06)',
    sidebarText: 'white',
    sidebarSubtext: 'rgba(255,255,255,0.35)',
    sidebarItem: 'rgba(255,255,255,0.55)',
    sidebarItemOn: 'rgba(255,255,255,0.1)',
    sidebarItemOnText: 'white',
    sidebarSec: 'rgba(255,255,255,0.3)',
    sidebarBox: 'rgba(255,255,255,0.06)',
    sidebarBoxBorder: 'rgba(255,255,255,0.12)',
    contentBg: '#F9FAFB',
    dotOn: '#60a5fa',
    avatarBg: 'linear-gradient(135deg,#60a5fa,#818cf8)',
  },
  oscuro: {
    topbarBg: '#2c2c2e',
    topbarBorder: '#3a3a3c',
    topbarShadow: '0 1px 4px rgba(0,0,0,0.3)',
    sepColor: '#3a3a3c',
    bubbleOn: 'rgba(255,255,255,0.08)',
    bubbleOnOutline: 'rgba(255,255,255,0.12)',
    sidebarBg: '#2c2c2e',
    sidebarBorder: '#3a3a3c',
    sidebarText: '#f1f5f9',
    sidebarSubtext: '#666',
    sidebarItem: '#8e8e93',
    sidebarItemOn: 'rgba(96,165,250,0.12)',
    sidebarItemOnText: '#93c5fd',
    sidebarSec: '#555',
    sidebarBox: '#3a3a3c',
    sidebarBoxBorder: '#48484a',
    contentBg: '#1c1c1e',
    dotOn: '#60a5fa',
    avatarBg: '#1e2a4a',
  }
}

function DockBubble({ modulo, activo, onClick, t }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
      <button onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none',background:activo?t.bubbleOn:'transparent',outline:activo?`1.5px solid ${t.bubbleOnOutline}`:'1.5px solid transparent',transform:hover?'scale(1.25)':'scale(1)',transition:'transform 0.2s cubic-bezier(.34,1.56,.64,1),background 0.15s',flexShrink:0}}>
        <i className={`ti ${modulo.icon}`} style={{fontSize:19,color:modulo.color}} aria-hidden="true"></i>
      </button>
      <div style={{width:4,height:4,borderRadius:'50%',background:activo?t.dotOn:'transparent',transition:'background 0.2s'}}></div>
      {hover && (
        <div style={{position:'absolute',top:'calc(100% + 8px)',left:'50%',transform:'translateX(-50%)',background:'rgba(15,23,42,0.9)',color:'white',fontSize:11,fontWeight:500,padding:'4px 10px',borderRadius:7,whiteSpace:'nowrap',pointerEvents:'none',zIndex:300,boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
          {modulo.tag}
          <div style={{position:'absolute',top:-4,left:'50%',transform:'translateX(-50%)',width:8,height:8,background:'rgba(15,23,42,0.9)',clipPath:'polygon(50% 0%, 0% 100%, 100% 100%)'}}></div>
        </div>
      )}
    </div>
  )
}

function SelectorCliente({ collapsed, t }) {
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
    <div style={{padding:'8px',borderBottom:`0.5px solid ${t.sidebarBorder}`,display:'flex',justifyContent:'center'}}>
      <div title={clienteActivo?.nombre||'Mi Despacho'} onClick={() => setOpen(!open)}
        style={{width:32,height:32,borderRadius:8,background:t.sidebarBox,border:`1px solid ${t.sidebarBoxBorder}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:t.sidebarText,cursor:'pointer'}}>
        {clienteActivo?clienteActivo.nombre.charAt(0):'🏢'}
      </div>
    </div>
  )

  return (
    <div ref={ref} style={{padding:'8px 10px',borderBottom:`0.5px solid ${t.sidebarBorder}`,position:'relative'}}>
      <div style={{fontSize:9,fontWeight:600,color:t.sidebarSec,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>Contexto activo</div>
      <button onClick={() => setOpen(!open)}
        style={{width:'100%',padding:'7px 9px',background:t.sidebarBox,border:`0.5px solid ${t.sidebarBoxBorder}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:clienteActivo?'#60a5fa':'#4ade80',flexShrink:0}}></div>
        <span style={{fontSize:12,color:t.sidebarItem,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:1,textAlign:'left'}}>
          {clienteActivo?clienteActivo.nombre.split(' ').slice(0,2).join(' '):'Mi Despacho'}
        </span>
        <ChevronDown size={10} color={t.sidebarSec} style={{flexShrink:0,transform:open?'rotate(180deg)':'rotate(0)',transition:'transform 0.15s'}} />
      </button>

      {alertaEfirma && clienteActivo && (
        <div style={{marginTop:5,padding:'4px 7px',background:'rgba(251,191,36,0.1)',border:'0.5px solid rgba(251,191,36,0.2)',borderRadius:6,display:'flex',alignItems:'center',gap:5}}>
          <AlertTriangle size={10} color="#fbbf24" />
          <span style={{fontSize:10,color:'#fbbf24'}}>{diasVenc<=0?'e.firma vencida':`${diasVenc}d para vencer`}</span>
        </div>
      )}

      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:10,right:10,background:'white',border:'0.5px solid #e5e7eb',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',zIndex:200,overflow:'hidden'}}>
          <div style={{maxHeight:220,overflowY:'auto'}}>
            <button onClick={() => { seleccionarCliente(null); setOpen(false) }}
              style={{width:'100%',padding:'10px 12px',background:'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'0.5px solid #f3f4f6',display:'flex',alignItems:'center',gap:9}}
              onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <div style={{width:24,height:24,borderRadius:6,background:'#f0fdf4',border:'0.5px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Building2 size={13} color="#16a34a" />
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'#1f2937'}}>Mi Despacho</div>
                <div style={{fontSize:10,color:'#9ca3af'}}>Vista personal</div>
              </div>
              {!clienteActivo && <span style={{fontSize:10,background:'#dcfce7',color:'#16a34a',padding:'2px 7px',borderRadius:20,fontWeight:500}}>Activo</span>}
            </button>
            {clientes.length > 0 && <div style={{padding:'5px 12px',fontSize:9,fontWeight:600,color:'#c4c4c4',textTransform:'uppercase',letterSpacing:'0.1em',background:'#fafafa'}}>Clientes</div>}
            {clientes.map(c => {
              const isActive = clienteActivo?.id === c.id
              return (
                <button key={c.id} onClick={() => { seleccionarCliente(c); setOpen(false) }}
                  style={{width:'100%',padding:'9px 12px',background:isActive?'#eff6ff':'none',border:'none',cursor:'pointer',textAlign:'left',borderBottom:'0.5px solid #f3f4f6',display:'flex',alignItems:'center',gap:9}}
                  onMouseEnter={e => { if(!isActive) e.currentTarget.style.background='#f9fafb' }}
                  onMouseLeave={e => { if(!isActive) e.currentTarget.style.background=isActive?'#eff6ff':'none' }}>
                  <div style={{width:24,height:24,minWidth:24,borderRadius:6,background:c.es_persona_moral?'#7c3aed':'#1e2a4a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'white'}}>{c.nombre.charAt(0)}</div>
                  <div style={{flex:1,overflow:'hidden'}}>
                    <div style={{fontSize:12,fontWeight:500,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.nombre.split(' ').slice(0,3).join(' ')}</div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>{c.es_persona_moral?'PM':'PF'} · {(c.regimenes||[]).length} régimen{(c.regimenes||[]).length!==1?'es':''}</div>
                  </div>
                  {isActive && <span style={{fontSize:10,background:'#dbeafe',color:'#1d4ed8',padding:'2px 7px',borderRadius:20,fontWeight:500,flexShrink:0}}>Activo</span>}
                </button>
              )
            })}
            {clientes.length === 0 && <div style={{padding:'14px',fontSize:12,color:'#94a3b8',textAlign:'center'}}>No hay clientes</div>}
          </div>
          <a href="/clientes" onClick={() => setOpen(false)}
            style={{display:'block',padding:'8px 12px',fontSize:11,color:'#1e2a4a',textDecoration:'none',borderTop:'0.5px solid #f3f4f6',textAlign:'center',background:'#f9fafb'}}
            onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background='#f9fafb'}>
            + Agregar cliente
          </a>
        </div>
      )}
    </div>
  )
}

function ChatBot({ darkMode }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy el asistente fiscal de Audify. ¿En qué te puedo ayudar?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const panelRef = useRef()

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const enviar = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const historial = messages.filter((_,i) => i > 0).map(m => ({ role: m.role, content: m.text }))
      historial.push({ role: 'user', content: userMsg })
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: historial }) })
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.texto || 'Ocurrio un error.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Ocurrio un error. Intenta de nuevo.' }])
    }
    setLoading(false)
  }

  const bg = darkMode ? '#2c2c2e' : 'white'
  const border = darkMode ? '#3a3a3c' : '#e5e7eb'
  const textColor = darkMode ? '#f1f5f9' : '#1f2937'
  const inputBg = darkMode ? '#3a3a3c' : '#f9fafb'

  return (
    <div ref={panelRef} style={{position:'fixed',bottom:24,right:24,zIndex:999,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
      {open && (
        <div style={{background:bg,borderRadius:20,boxShadow:'0 8px 32px rgba(0,0,0,0.2)',border:`0.5px solid ${border}`,width:340,display:'flex',flexDirection:'column',overflow:'hidden',maxHeight:500}}>
          <div style={{background:'linear-gradient(135deg,#1e2a4a,#0f1a2e)',padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'white'}}>A</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'white'}}>Audify · Asistente Fiscal</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>Experto en SAT · Mexico</div>
            </div>
            <button onClick={() => setOpen(false)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.6)',fontSize:18,lineHeight:1}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:10,maxHeight:320}}>
            {messages.map((m,i) => (
              <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                <div style={{maxWidth:'85%',padding:'9px 12px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:m.role==='user'?'#1e2a4a':darkMode?'#3a3a3c':'#f8fafc',color:m.role==='user'?'white':textColor,fontSize:13,lineHeight:1.5,border:m.role==='assistant'?`0.5px solid ${border}`:'none'}}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{display:'flex',justifyContent:'flex-start'}}>
                <div style={{padding:'9px 14px',borderRadius:'16px 16px 16px 4px',background:darkMode?'#3a3a3c':'#f8fafc',border:`0.5px solid ${border}`,display:'flex',gap:4,alignItems:'center'}}>
                  {[0,1,2].map(i => <div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#9ca3af'}}></div>)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{padding:'10px 12px',borderTop:`0.5px solid ${border}`,display:'flex',gap:8,alignItems:'center'}}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && enviar()}
              placeholder="Escribe tu pregunta fiscal..."
              style={{flex:1,padding:'9px 12px',border:`0.5px solid ${border}`,borderRadius:20,fontSize:13,color:textColor,outline:'none',background:inputBg}} />
            <button onClick={enviar} disabled={loading||!input.trim()}
              style={{width:36,height:36,borderRadius:'50%',background:input.trim()?'#1e2a4a':'#f3f4f6',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim()?'white':'#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
        <button onClick={() => setOpen(!open)} title="Asistente Audify"
          style={{width:52,height:52,borderRadius:'50%',background:darkMode?'#2c2c2e':'white',border:`2px solid ${darkMode?'#3a3a3c':'#1e2a4a'}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',transition:'transform 0.2s'}}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
          <span style={{fontSize:20,fontWeight:700,color:darkMode?'#93c5fd':'#1e2a4a'}}>A</span>
        </button>
        <CalculadoraFlotante darkMode={darkMode} />
      </div>
    </div>
  )
}

function CalculadoraFlotante({ darkMode }) {
  const [open, setOpen] = useState(false)
  const [ingreso, setIngreso] = useState('')
  const [ivaRate, setIvaRate] = useState(0.16)
  const [ivaLbl, setIvaLbl] = useState('16%')
  const panelRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const ivasOpts = [{label:'16%',rate:0.16},{label:'8%',rate:0.08},{label:'4%',rate:0.04},{label:'0%',rate:0},{label:'Ex.',rate:-1}]
  const ing = parseFloat(ingreso)||0
  const iva = ivaRate===-1?0:ing*ivaRate
  const tramo = getTramo(ing)
  const isr = ing*tramo.tasa
  const total = iva+isr

  const bg = darkMode ? '#2c2c2e' : 'white'
  const border = darkMode ? '#3a3a3c' : '#e5e7eb'
  const textColor = darkMode ? '#f1f5f9' : '#1f2937'
  const inputBg = darkMode ? '#3a3a3c' : 'white'
  const btnBg = darkMode ? '#3a3a3c' : '#f9fafb'

  return (
    <div ref={panelRef} style={{position:'relative'}}>
      {open && (
        <div style={{position:'absolute',bottom:64,right:0,width:300,background:bg,border:`0.5px solid ${border}`,borderRadius:16,boxShadow:'0 4px 24px rgba(0,0,0,0.2)',overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:`0.5px solid ${border}`}}>
            <span style={{fontSize:14,fontWeight:500,color:textColor}}>Calculadora de impuestos</span>
            <button onClick={() => setOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',display:'flex',alignItems:'center'}}><ChevronRight size={18}/></button>
          </div>
          <div style={{padding:16,maxHeight:400,overflowY:'auto'}}>
            <div style={{position:'relative',marginBottom:14}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#9ca3af'}}>$</span>
              <input type="number" value={ingreso} onChange={e => setIngreso(e.target.value)} placeholder="0.00"
                style={{width:'100%',padding:'9px 10px 9px 24px',border:`0.5px solid ${border}`,borderRadius:8,fontSize:17,fontWeight:500,color:textColor,outline:'none',boxSizing:'border-box',background:inputBg}} />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginBottom:14}}>
              {ivasOpts.map(o => (
                <button key={o.label} onClick={() => { setIvaRate(o.rate); setIvaLbl(o.label) }}
                  style={{padding:'6px 4px',border:'none',borderRadius:8,fontSize:11,fontWeight:500,cursor:'pointer',background:ivaRate===o.rate?'#1e2a4a':btnBg,color:ivaRate===o.rate?'white':darkMode?'#9ca3af':'#374151'}}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{background:darkMode?'rgba(59,107,17,0.15)':'#EAF3DE',border:'0.5px solid #3B6D11',borderRadius:8,padding:'8px 12px',fontSize:12,fontWeight:500,color:'#4ade80',marginBottom:14}}>
              RESICO · Persona fisica · SAT {new Date().getFullYear()}
            </div>
            {[
              {lbl:'Base',v:fmtN(ing)},
              {lbl:ivaRate===-1?'IVA (Exento)':`IVA (${ivaLbl})`,v:fmtN(iva),blue:true},
              {lbl:`ISR ${(tramo.tasa*100).toFixed(2)}%`,v:fmtN(isr),red:true},
              {lbl:'IVA al SAT',v:fmtN(iva),red:true},
            ].map(r => (
              <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`0.5px solid ${darkMode?'#3a3a3c':'#f9fafb'}`,fontSize:12}}>
                <span style={{color:'#9ca3af'}}>{r.lbl}</span>
                <span style={{fontWeight:500,color:r.red?'#f87171':r.blue?'#60a5fa':textColor}}>{r.v}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,padding:'10px 12px',background:darkMode?'#3a3a3c':'#f9fafb',borderRadius:10}}>
              <span style={{fontSize:12,color:'#9ca3af'}}>Total impuestos</span>
              <span style={{fontSize:20,fontWeight:600,color:'#f87171'}}>{fmtN(total)}</span>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)} title="Calculadora"
        style={{width:52,height:52,borderRadius:'50%',background:darkMode?'#2c2c2e':'white',border:`2px solid ${darkMode?'#3a3a3c':'#1e2a4a'}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,0,0.15)',transition:'transform 0.2s'}}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={darkMode?'#93c5fd':'#1e2a4a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <rect x="7" y="5" width="10" height="4" rx="1"/>
          <circle cx="8" cy="13" r="0.8" fill={darkMode?'#93c5fd':'#1e2a4a'}/>
          <circle cx="12" cy="13" r="0.8" fill={darkMode?'#93c5fd':'#1e2a4a'}/>
          <circle cx="16" cy="13" r="0.8" fill={darkMode?'#93c5fd':'#1e2a4a'}/>
          <circle cx="8" cy="17" r="0.8" fill={darkMode?'#93c5fd':'#1e2a4a'}/>
          <circle cx="12" cy="17" r="0.8" fill={darkMode?'#93c5fd':'#1e2a4a'}/>
          <rect x="14" y="16" width="3" height="2" rx="0.5" fill={darkMode?'#93c5fd':'#1e2a4a'}/>
        </svg>
      </button>
    </div>
  )
}

function Sidebar({ user, moduloActivo, setModuloActivo, collapsed, setCollapsed, darkMode }) {
  const pathname = usePathname()
  const { clienteActivo, regimenesActivos, esPersonaMoral } = useCliente()
  const [config, setConfig] = useState({})
  const [moduloOpen, setModuloOpen] = useState(false)
  const [tabFiscal, setTabFiscal] = useState('pf')

  useEffect(() => {
    const saved = localStorage.getItem('config_app')
    if (saved) setConfig(JSON.parse(saved))
    const handler = (e) => setConfig(e.detail)
    window.addEventListener('config_actualizada', handler)
    return () => window.removeEventListener('config_actualizada', handler)
  }, [])

  useEffect(() => {
    if (esPersonaMoral) setTabFiscal('pm')
    else setTabFiscal('pf')
  }, [esPersonaMoral, clienteActivo])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const nombre = config.nombre || user?.email?.split('@')[0] || 'Usuario'
  const t = darkMode ? TEMA.oscuro : TEMA.claro
  const modulo = MODULOS.find(m => m.id === moduloActivo) || MODULOS[0]

  const filtrarNav = (nav) => {
    if (!nav) return []
    return nav.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.regimen) return true
        return regimenesActivos.includes(item.regimen)
      })
    })).filter(group => group.items.length > 0)
  }

  const navActual = modulo.tabs
    ? filtrarNav(modulo.tabs.find(tab => tab.id === tabFiscal)?.nav || [])
    : filtrarNav(modulo.nav || [])

  return (
    <aside style={{width:collapsed?56:200,minWidth:collapsed?56:200,background:t.sidebarBg,borderRight:`0.5px solid ${t.sidebarBorder}`,display:'flex',flexDirection:'column',transition:'width 0.25s ease,min-width 0.25s ease',overflow:'hidden',height:'100vh',boxShadow:darkMode?'1px 0 8px rgba(0,0,0,0.3)':'1px 0 8px rgba(0,0,0,0.08)'}}>

      {/* Perfil */}
      <div style={{padding:collapsed?'14px 8px':'14px 12px 10px',borderBottom:`0.5px solid ${t.sidebarBorder}`,display:'flex',alignItems:'center',gap:10,justifyContent:collapsed?'center':'flex-start',position:'relative',minHeight:58}}>
        <div style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:t.avatarBg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'white',flexShrink:0}}>
          {nombre.charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <div style={{overflow:'hidden',flex:1}}>
            <div style={{fontSize:13,fontWeight:500,color:t.sidebarText,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{nombre}</div>
            <div style={{fontSize:10,color:t.sidebarSubtext}}>Audify</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'rgba(255,255,255,0.06)',border:`0.5px solid ${t.sidebarBorder}`,borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:4,color:t.sidebarSubtext,flexShrink:0}}
          onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}>
          {collapsed?<ChevronRight size={13}/>:<ChevronLeft size={13}/>}
        </button>
      </div>

      {/* Selector cliente */}
      <SelectorCliente collapsed={collapsed} t={t} />

      {/* Selector módulo */}
      {!collapsed && (
        <div style={{padding:'8px 10px',borderBottom:`0.5px solid ${t.sidebarBorder}`,position:'relative',zIndex:10}}>
          <button onClick={() => setModuloOpen(!moduloOpen)}
            style={{width:'100%',padding:'7px 9px',background:t.sidebarBox,border:`0.5px solid ${t.sidebarBoxBorder}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:8,justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <i className={`ti ${modulo.icon}`} style={{fontSize:14,color:modulo.color}} aria-hidden="true"></i>
              <span style={{fontSize:12,color:t.sidebarItem,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:100}}>{modulo.tag}</span>
            </div>
            <ChevronDown size={11} color={t.sidebarSec} style={{transform:moduloOpen?'rotate(180deg)':'rotate(0)',transition:'transform 0.15s',flexShrink:0}} />
          </button>
          {moduloOpen && (
            <div style={{position:'absolute',left:10,right:10,top:'calc(100% - 4px)',background:darkMode?'#2c2c2e':'white',border:`0.5px solid ${darkMode?'#3a3a3c':'#e5e7eb'}`,borderRadius:9,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.15)',zIndex:100}}>
              {MODULOS.map(m => (
                <button key={m.id} onClick={() => { setModuloActivo(m.id); localStorage.setItem('modulo_activo',m.id); setModuloOpen(false) }}
                  style={{width:'100%',padding:'8px 12px',border:'none',background:moduloActivo===m.id?(darkMode?'rgba(96,165,250,0.1)':'#EFF6FF'):'none',cursor:'pointer',display:'flex',alignItems:'center',gap:8,borderBottom:`0.5px solid ${darkMode?'#3a3a3c':'#f3f4f6'}`,textAlign:'left'}}
                  onMouseEnter={e => { if(moduloActivo!==m.id) e.currentTarget.style.background=darkMode?'rgba(255,255,255,0.05)':'#f9fafb' }}
                  onMouseLeave={e => { if(moduloActivo!==m.id) e.currentTarget.style.background='none' }}>
                  <i className={`ti ${m.icon}`} style={{fontSize:14,color:m.color}} aria-hidden="true"></i>
                  <span style={{fontSize:12,color:moduloActivo===m.id?(darkMode?'#93c5fd':'#1e2a4a'):darkMode?'#9ca3af':'#374151',fontWeight:moduloActivo===m.id?500:400}}>{m.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs PF/PM */}
      {!collapsed && moduloActivo==='fiscal' && !clienteActivo && (
        <div style={{display:'flex',gap:4,padding:'7px 10px',borderBottom:`0.5px solid ${t.sidebarBorder}`}}>
          {modulo.tabs.map(tab => (
            <button key={tab.id} onClick={() => setTabFiscal(tab.id)}
              style={{flex:1,padding:'5px 4px',border:`0.5px solid ${t.sidebarBorder}`,borderRadius:6,fontSize:11,cursor:'pointer',fontWeight:500,background:tabFiscal===tab.id?'#60a5fa':t.sidebarBox,color:tabFiscal===tab.id?'white':t.sidebarItem,transition:'background 0.15s'}}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Regímenes del cliente */}
      {!collapsed && clienteActivo && moduloActivo==='fiscal' && (
        <div style={{padding:'6px 12px',borderBottom:`0.5px solid ${t.sidebarBorder}`,background:'rgba(96,165,250,0.05)'}}>
          <div style={{fontSize:9,fontWeight:600,color:t.sidebarSec,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>Regímenes</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
            {regimenesActivos.slice(0,2).map(r => (
              <span key={r} style={{fontSize:9,padding:'2px 6px',borderRadius:20,background:'rgba(96,165,250,0.15)',color:'#60a5fa',fontWeight:500}}>{r}</span>
            ))}
            {regimenesActivos.length>2&&<span style={{fontSize:9,color:t.sidebarSec}}>+{regimenesActivos.length-2}</span>}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{flex:1,padding:'6px 8px',overflowY:'auto',display:'flex',flexDirection:'column',gap:1}}>
        {collapsed ? (
          MODULOS.map(m => (
            <button key={m.id} onClick={() => { setModuloActivo(m.id); localStorage.setItem('modulo_activo',m.id) }}
              title={m.tag}
              style={{width:'100%',padding:'10px',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none',background:moduloActivo===m.id?t.sidebarItemOn:'transparent',marginBottom:2}}>
              <i className={`ti ${m.icon}`} style={{fontSize:20,color:moduloActivo===m.id?m.color:t.sidebarItem}} aria-hidden="true"></i>
            </button>
          ))
        ) : (
          navActual.map(group => (
            <div key={group.section} style={{marginBottom:2}}>
              <div style={{fontSize:9,fontWeight:600,color:t.sidebarSec,textTransform:'uppercase',letterSpacing:'0.1em',padding:'6px 8px 3px',whiteSpace:'nowrap'}}>{group.section}</div>
              {group.items.map(item => {
                const Icon = item.icon
                const isActive = pathname===item.href
                return (
                  <a key={item.label} href={item.href}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:7,cursor:'pointer',textDecoration:'none',background:isActive?t.sidebarItemOn:'transparent',marginBottom:1,transition:'background 0.15s',borderLeft:isActive?'2px solid #60a5fa':'2px solid transparent'}}
                    onMouseEnter={e => { if(!isActive) e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { if(!isActive) e.currentTarget.style.background='transparent' }}>
                    <Icon size={14} color={isActive?'#60a5fa':t.sidebarItem} strokeWidth={isActive?2:1.75} />
                    <span style={{fontSize:12,color:isActive?t.sidebarItemOnText:t.sidebarItem,fontWeight:isActive?500:400,whiteSpace:'nowrap',flex:1}}>{item.label}</span>
                    {item.chip&&<span style={{fontSize:9,padding:'2px 6px',borderRadius:10,background:item.chip==='SAT'?'rgba(74,222,128,0.15)':'rgba(96,165,250,0.15)',color:item.chip==='SAT'?'#4ade80':'#60a5fa',fontWeight:500,whiteSpace:'nowrap'}}>{item.chip}</span>}
                  </a>
                )
              })}
            </div>
          ))
        )}
      </nav>

      {/* Bottom */}
      <div style={{padding:'6px 8px',borderTop:`0.5px solid ${t.sidebarBorder}`,display:'flex',flexDirection:'column',gap:1}}>
        <a href="/configuracion" title={collapsed?'Configuracion':''}
          style={{display:'flex',alignItems:'center',gap:8,padding:collapsed?'9px':'7px 10px',borderRadius:7,cursor:'pointer',textDecoration:'none',justifyContent:collapsed?'center':'flex-start',background:pathname==='/configuracion'?t.sidebarItemOn:'transparent',transition:'background 0.15s'}}
          onMouseEnter={e => { if(pathname!=='/configuracion') e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { if(pathname!=='/configuracion') e.currentTarget.style.background=pathname==='/configuracion'?t.sidebarItemOn:'transparent' }}>
          <Settings size={14} color={pathname==='/configuracion'?'#60a5fa':t.sidebarItem} strokeWidth={1.75}/>
          {!collapsed&&<span style={{fontSize:12,color:pathname==='/configuracion'?t.sidebarItemOnText:t.sidebarItem,fontWeight:pathname==='/configuracion'?500:400}}>Configuracion</span>}
        </a>
        <button onClick={handleLogout} title={collapsed?'Cerrar sesion':''}
          style={{display:'flex',alignItems:'center',gap:8,padding:collapsed?'9px':'7px 10px',borderRadius:7,cursor:'pointer',background:'none',border:'none',justifyContent:collapsed?'center':'flex-start',width:'100%',transition:'background 0.15s'}}
          onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background='none'}>
          <LogOut size={14} color="rgba(239,68,68,0.6)" strokeWidth={1.75}/>
          {!collapsed&&<span style={{fontSize:12,color:'rgba(239,68,68,0.6)'}}>Cerrar sesion</span>}
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
  const [darkMode, setDarkMode] = useState(false)
  const isAuthPage = authRoutes.includes(pathname)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const saved = localStorage.getItem('modulo_activo')
    if (saved) setModuloActivo(saved)
    const savedDark = localStorage.getItem('dark_mode')
    if (savedDark === 'true') setDarkMode(true)
    const handler = (e) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
        localStorage.setItem('dark_mode', String(e.detail.darkMode))
      }
    }
    window.addEventListener('config_actualizada', handler)
    return () => window.removeEventListener('config_actualizada', handler)
  }, [])

  const t = darkMode ? TEMA.oscuro : TEMA.claro

  if (isAuthPage) {
    return (
      <html lang="es">
        <body style={{margin:0,fontFamily:'system-ui,sans-serif'}}>{children}</body>
      </html>
    )
  }

  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      </head>
      <body style={{margin:0,fontFamily:'system-ui,sans-serif',display:'flex',flexDirection:'column',minHeight:'100vh',background:t.contentBg}}>

        {/* Topbar */}
        <div style={{background:t.topbarBg,padding:'5px 20px',display:'flex',alignItems:'center',flexShrink:0,position:'sticky',top:0,zIndex:100,borderBottom:`0.5px solid ${t.topbarBorder}`,boxShadow:t.topbarShadow}}>
          <div style={{width:28,height:28,borderRadius:8,background:'#1e2a4a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white',flexShrink:0}}>
            A
          </div>
          <div style={{width:0.5,height:20,background:t.sepColor,margin:'0 14px',flexShrink:0}}></div>
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'center'}}>
            {MODULOS.map(m => (
              <DockBubble key={m.id} modulo={m} activo={moduloActivo===m.id} t={t}
                onClick={() => { setModuloActivo(m.id); localStorage.setItem('modulo_activo',m.id) }} />
            ))}
          </div>
        </div>

        {/* Banner cliente */}
        {clienteActivo && (
          <div style={{background:'#1e2a4a',padding:'5px 20px',display:'flex',alignItems:'center',gap:10,zIndex:50,flexShrink:0}}>
            <div style={{width:16,height:16,borderRadius:4,background:'rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'white',flexShrink:0}}>{clienteActivo.nombre.charAt(0)}</div>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>Consultando:</span>
            <span style={{fontSize:11,fontWeight:600,color:'white'}}>{clienteActivo.nombre}</span>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:'monospace'}}>{clienteActivo.rfc}</span>
            {clienteActivo.es_persona_moral&&<span style={{fontSize:9,background:'rgba(255,255,255,0.1)',color:'white',padding:'1px 6px',borderRadius:20}}>PM</span>}
          </div>
        )}

        {/* Body */}
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          <Sidebar user={user} moduloActivo={moduloActivo} setModuloActivo={setModuloActivo} collapsed={collapsed} setCollapsed={setCollapsed} darkMode={darkMode} />
          <main style={{flex:1,overflowY:'auto',position:'relative',background:t.contentBg}}>
            {children}
            <ChatBot darkMode={darkMode} />
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