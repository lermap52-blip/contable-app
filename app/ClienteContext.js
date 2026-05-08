'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { useCliente } from './ClienteContext'
import { AlertTriangle, Shield, Calendar, TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react'

const pagosCalc = () => {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const dias = (f) => Math.ceil((f - hoy) / (1000 * 60 * 60 * 24))
  return [
    { id:'dec', dia:17, mes:meses[mes], nombre:'Declaracion mensual', tipo:`IVA + ISR · ${meses[mes>0?mes-1:11]}`, dias:dias(new Date(anio,mes,17)) },
    { id:'imss', dia:20, mes:meses[mes], nombre:'IMSS', tipo:`Cuotas patronales · ${meses[mes]}`, dias:dias(new Date(anio,mes,20)) },
    { id:'dec2', dia:17, mes:meses[(mes+1)%12], nombre:'Declaracion mensual', tipo:`IVA + ISR · ${meses[mes]}`, dias:dias(new Date(anio,mes+1,17)) },
    { id:'imss2', dia:20, mes:meses[(mes+1)%12], nombre:'IMSS', tipo:`Cuotas patronales · ${meses[(mes+1)%12]}`, dias:dias(new Date(anio,mes+1,20)) },
  ]
}

function fmt(n) { return '$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

const card = { background:'white', borderRadius:16, padding:24, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'0.5px solid #f1f5f9' }

export default function Dashboard() {
  const { clienteActivo, esModoMaestro, empresaId, diasParaVencimiento, perfilMaestro } = useCliente()
  const [ingresos, setIngresos] = useState([])
  const [egresos, setEgresos] = useState([])
  const [pagados, setPagados] = useState({})
  const pagos = pagosCalc()

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, clienteActivo])

  const cargarDatos = async () => {
    const now = new Date()
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const ultimoDia = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0]

    let query = supabase
      .from('movimientos')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha_operacion', primerDia)
      .lte('fecha_operacion', ultimoDia)

    // Si hay cliente activo filtrar por su RFC en la descripcion o referencia
    if (clienteActivo) {
      query = query.eq('referencia', clienteActivo.rfc)
    }

    const { data: movs } = await query
    setIngresos((movs||[]).filter(m => m.tipo === 'ingreso'))
    setEgresos((movs||[]).filter(m => m.tipo === 'egreso'))
  }

  const totalIngresos = ingresos.reduce((a,r)=>a+Number(r.monto),0)
  const ingresosFacturados = ingresos.filter(r=>r.es_facturado).reduce((a,r)=>a+Number(r.monto),0)
  const ingresosNoFacturados = ingresos.filter(r=>!r.es_facturado).reduce((a,r)=>a+Number(r.monto),0)
  const totalEgresos = egresos.reduce((a,r)=>a+Number(r.monto),0)
  const balance = totalIngresos - totalEgresos
  const tasaResico = totalIngresos<=25000?0.01:totalIngresos<=50000?0.011:totalIngresos<=83333?0.015:totalIngresos<=208333?0.02:0.025
  const ivaEstimado = ingresosNoFacturados * 0.16
  const isrEstimado = totalIngresos * tasaResico

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos dias' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const mesActual = new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  // e.firma del cliente activo
  const diasEfirma = clienteActivo ? diasParaVencimiento(clienteActivo.vencimiento_efirma) : null
  const alertaEfirma = diasEfirma !== null && diasEfirma <= 30

  const badgePago = (p) => {
    if (pagados[p.id]) return { bg:'#f0fdf4', color:'#16a34a', texto:'Pagado' }
    if (p.dias < 0) return { bg:'#fef2f2', color:'#dc2626', texto:'Vencido' }
    if (p.dias <= 5) return { bg:'#fef2f2', color:'#dc2626', texto:`${p.dias}d` }
    if (p.dias <= 10) return { bg:'#fffbeb', color:'#d97706', texto:`${p.dias}d` }
    return { bg:'#f0fdf4', color:'#16a34a', texto:`${p.dias}d` }
  }

  return (
    <div style={{padding:32,fontFamily:'system-ui,sans-serif',background:'#f8fafc',minHeight:'100vh'}}>

      {/* Banner cliente activo */}
      {!esModoMaestro && clienteActivo && (
        <div style={{marginBottom:20,padding:'10px 16px',background:'#eff6ff',border:'0.5px solid #bfdbfe',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:28,height:28,borderRadius:8,background:'#185FA5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white'}}>
              {clienteActivo.nombre.charAt(0)}
            </div>
            <div>
              <span style={{fontSize:12,color:'#1e40af',fontWeight:500}}>Gestionando a: </span>
              <span style={{fontSize:13,color:'#1e3a8a',fontWeight:700}}>{clienteActivo.nombre}</span>
              <span style={{fontSize:11,color:'#93c5fd',marginLeft:8,fontFamily:'monospace'}}>{clienteActivo.rfc}</span>
            </div>
          </div>
          {alertaEfirma && (
            <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#fffbeb',border:'0.5px solid #fde68a',borderRadius:20}}>
              <AlertTriangle size={12} color="#d97706" />
              <span style={{fontSize:11,color:'#d97706',fontWeight:500}}>
                {diasEfirma <= 0 ? 'e.firma vencida' : `e.firma vence en ${diasEfirma} dias`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:24,fontWeight:700,color:'#0f172a',marginBottom:4,letterSpacing:'-0.3px'}}>{saludo}</h1>
        <p style={{fontSize:14,color:'#94a3b8',margin:0}}>
          {esModoMaestro ? `Resumen de ${mesActual}` : `${clienteActivo?.nombre} · ${mesActual}`}
        </p>
      </div>

      {/* Alerta e.firma cliente */}
      {alertaEfirma && clienteActivo && (
        <div style={{...card,marginBottom:20,background:'#fffbeb',border:'0.5px solid #fde68a',padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
          <AlertTriangle size={20} color="#d97706" />
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'#92400e'}}>
              {diasEfirma <= 0 ? 'e.firma vencida' : `e.firma vence en ${diasEfirma} dias`}
            </div>
            <div style={{fontSize:11,color:'#b45309',marginTop:1}}>
              {diasEfirma <= 0
                ? 'Renueva la e.firma de este cliente para poder timbrar CFDIs'
                : `Vence el ${clienteActivo.vencimiento_efirma} — Renueva antes de que expire`}
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:24}}>
        <div style={card}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
            <TrendingUp size={12} color="#16a34a" /> Ingresos del mes
          </div>
          <div style={{fontSize:28,fontWeight:700,color:'#16a34a',marginBottom:12,letterSpacing:'-0.5px'}}>{fmt(totalIngresos)}</div>
          <div style={{borderTop:'1px solid #f1f5f9',paddingTop:10,display:'flex',flexDirection:'column',gap:5}}>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:11,color:'#94a3b8'}}>Facturados</span>
              <span style={{fontSize:12,color:'#3b82f6',fontWeight:600}}>{fmt(ingresosFacturados)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:11,color:'#94a3b8'}}>No facturados</span>
              <span style={{fontSize:12,color:'#f59e0b',fontWeight:600}}>{fmt(ingresosNoFacturados)}</span>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
            <TrendingDown size={12} color="#dc2626" /> Egresos del mes
          </div>
          <div style={{fontSize:28,fontWeight:700,color:'#dc2626',marginBottom:12,letterSpacing:'-0.5px'}}>{fmt(totalEgresos)}</div>
          <div style={{fontSize:11,color:'#94a3b8'}}>{egresos.length} movimientos registrados</div>
        </div>

        <div style={{...card,background:balance>=0?'#f0fdf4':'#fef2f2',border:`0.5px solid ${balance>=0?'#bbf7d0':'#fecaca'}`}}>
          <div style={{fontSize:11,fontWeight:600,color:balance>=0?'#16a34a':'#dc2626',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
            <Wallet size={12} /> Balance
          </div>
          <div style={{fontSize:28,fontWeight:700,color:balance>=0?'#15803d':'#b91c1c',marginBottom:12,letterSpacing:'-0.5px'}}>{fmt(balance)}</div>
          <div style={{fontSize:11,color:balance>=0?'#4ade80':'#f87171'}}>{balance>=0?'Positivo este mes':'Negativo este mes'}</div>
        </div>

        <div style={card}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
            <Activity size={12} /> Movimientos
          </div>
          <div style={{fontSize:28,fontWeight:700,color:'#0f172a',marginBottom:12,letterSpacing:'-0.5px'}}>{ingresos.length+egresos.length}</div>
          <div style={{fontSize:11,color:'#94a3b8'}}>Este mes</div>
        </div>
      </div>

      {/* Fila 2 */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>

        {/* Estatus fiscal */}
        <div style={card}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16,display:'flex',alignItems:'center',gap:6}}>
            <Shield size={12} /> Estatus fiscal
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16,padding:'12px 14px',background:'#f0fdf4',borderRadius:12}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'#16a34a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'white',fontWeight:700,flexShrink:0}}>✓</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'#15803d'}}>Al corriente</div>
              <div style={{fontSize:11,color:'#4ade80',marginTop:1}}>Opinion de cumplimiento SAT</div>
            </div>
          </div>
          {[
            {label:'Declaraciones presentadas',val:'Abr 2026',ok:true},
            {label:'RFC activo',val:clienteActivo?.rfc||'Vigente',ok:true},
            {label:'Buzon tributario',val:'Activo',ok:true},
            {label:'FIEL / e.firma',val:alertaEfirma?(diasEfirma<=0?'Vencida':`Vence en ${diasEfirma}d`):'Vigente',ok:!alertaEfirma},
          ].map(item => (
            <div key={item.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f8fafc'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:item.ok?'#16a34a':'#f59e0b',flexShrink:0}}></div>
                <span style={{fontSize:12,color:'#64748b'}}>{item.label}</span>
              </div>
              <span style={{fontSize:11,fontWeight:500,color:item.ok?'#0f172a':'#d97706'}}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* Proximos pagos */}
        <div style={card}>
          <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16,display:'flex',alignItems:'center',gap:6}}>
            <Calendar size={12} /> Proximos pagos
          </div>
          {pagos.map((p,i) => {
            const badge = badgePago(p)
            const vencido = p.dias < 0 && !pagados[p.id]
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<pagos.length-1?'1px solid #f8fafc':'none',opacity:pagados[p.id]?0.5:1}}>
                <div style={{minWidth:42,textAlign:'center',background:vencido?'#fef2f2':'#f8fafc',borderRadius:10,padding:'5px 6px'}}>
                  <div style={{fontSize:16,fontWeight:700,color:vencido?'#dc2626':'#0f172a',lineHeight:1}}>{p.dia}</div>
                  <div style={{fontSize:9,color:vencido?'#dc2626':'#94a3b8',textTransform:'uppercase',marginTop:1}}>{p.mes}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:vencido?'#dc2626':'#0f172a',textDecoration:pagados[p.id]?'line-through':'none'}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{p.tipo}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20,background:badge.bg,color:badge.color,whiteSpace:'nowrap'}}>{badge.texto}</span>
                  <input type="checkbox" checked={!!pagados[p.id]} onChange={() => setPagados(prev=>({...prev,[p.id]:!prev[p.id]}))}
                    style={{width:14,height:14,cursor:'pointer',accentColor:'#16a34a'}} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Impuestos */}
      <div style={{...card,marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:16}}>
          Impuestos estimados · {esModoMaestro ? mesActual : `${clienteActivo?.nombre?.split(' ')[0]} · ${mesActual}`}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          <div style={{background:'#fef2f2',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>IVA estimado</div>
            <div style={{fontSize:24,fontWeight:700,color:'#dc2626',letterSpacing:'-0.5px'}}>{fmt(ivaEstimado)}</div>
          </div>
          <div style={{background:'#eff6ff',borderRadius:12,padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'#94a3b8',marginBottom:4}}>ISR estimado (RESICO {(tasaResico*100).toFixed(2)}%)</div>
            <div style={{fontSize:24,fontWeight:700,color:'#3b82f6',letterSpacing:'-0.5px'}}>{fmt(isrEstimado)}</div>
          </div>
        </div>
        {[
          {lbl:'Ingresos registrados',v:fmt(totalIngresos)},
          {lbl:'Egresos registrados',v:fmt(totalEgresos)},
          {lbl:'IVA estimado (16% no facturados)',v:fmt(ivaEstimado),red:true},
          {lbl:'ISR segun tabla RESICO',v:fmt(isrEstimado),red:true},
        ].map(r => (
          <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #f8fafc'}}>
            <span style={{fontSize:12,color:'#64748b'}}>{r.lbl}</span>
            <span style={{fontSize:13,fontWeight:600,color:r.red?'#dc2626':'#0f172a'}}>{r.v}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,padding:'14px 16px',background:'#f8fafc',borderRadius:12}}>
          <span style={{fontSize:13,color:'#64748b'}}>Total estimado a pagar al SAT</span>
          <span style={{fontSize:22,fontWeight:700,color:'#dc2626',letterSpacing:'-0.5px'}}>{fmt(ivaEstimado+isrEstimado)}</span>
        </div>
      </div>

      {/* Acciones rapidas */}
      <div>
        <div style={{fontSize:11,fontWeight:600,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Acciones rapidas</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
          {[
            {icon:'💰',label:'Registrar ingreso',href:'/movimientos/nuevo?tipo=ingreso',bg:'#eff6ff'},
            {icon:'🧾',label:'Registrar egreso',href:'/movimientos/nuevo?tipo=egreso',bg:'#fef2f2'},
            {icon:'📋',label:'Ver ingresos',href:'/ingresos',bg:'#f0fdf4'},
            {icon:'📊',label:'Ver egresos',href:'/egresos',bg:'#fffbeb'},
          ].map(a => (
            <a key={a.label} href={a.href} style={{textDecoration:'none',...card,padding:'16px',display:'flex',alignItems:'center',gap:12}}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}>
              <div style={{width:36,height:36,borderRadius:10,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
                {a.icon}
              </div>
              <span style={{fontSize:13,color:'#0f172a',fontWeight:500}}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}