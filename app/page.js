'use client'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

function fmt(n) { return '$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

function calcularPagos() {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()

  const diasRestantes = (fecha) => {
    const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
    return diff
  }

  const fmtFecha = (fecha) => {
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  // Declaracion mensual — dia 17 del mes actual (para periodo anterior)
  const limiteDeclaracion = new Date(anio, mes, 17)
  const diasDeclaracion = diasRestantes(limiteDeclaracion)

  // IMSS — dia 20 del mes actual
  const limiteIMSS = new Date(anio, mes, 20)
  const diasIMSS = diasRestantes(limiteIMSS)

  // Declaracion siguiente mes
  const limiteDeclaracionSig = new Date(anio, mes+1, 17)
  const diasDeclaracionSig = diasRestantes(limiteDeclaracionSig)

  // IMSS siguiente mes
  const limiteIMSSSig = new Date(anio, mes+1, 20)
  const diasIMSSSig = diasRestantes(limiteIMSSSig)

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return [
    {
      id: 'dec-actual',
      dia: 17,
      mes: meses[mes],
      nombre: 'Declaracion mensual',
      tipo: `IVA + ISR · RESICO · ${meses[mes > 0 ? mes-1 : 11]}`,
      dias: diasDeclaracion,
      fecha: limiteDeclaracion,
    },
    {
      id: 'imss-actual',
      dia: 20,
      mes: meses[mes],
      nombre: 'IMSS',
      tipo: `Cuotas patronales · ${meses[mes]}`,
      dias: diasIMSS,
      fecha: limiteIMSS,
    },
    {
      id: 'dec-sig',
      dia: 17,
      mes: meses[(mes+1) % 12],
      nombre: 'Declaracion mensual',
      tipo: `IVA + ISR · RESICO · ${meses[mes]}`,
      dias: diasDeclaracionSig,
      fecha: limiteDeclaracionSig,
    },
    {
      id: 'imss-sig',
      dia: 20,
      mes: meses[(mes+1) % 12],
      nombre: 'IMSS',
      tipo: `Cuotas patronales · ${meses[(mes+1)%12]}`,
      dias: diasIMSSSig,
      fecha: limiteIMSSSig,
    },
  ]
}

export default function Dashboard() {
  const [ingresos, setIngresos] = useState([])
  const [egresos, setEgresos] = useState([])
  const [pagados, setPagados] = useState({})
  const pagos = calcularPagos()

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date()
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const ultimoDia = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().split('T')[0]
    const { data: movs } = await supabase.from('movimientos').select('*').eq('empresa_id', user.id).gte('fecha_operacion', primerDia).lte('fecha_operacion', ultimoDia)
    setIngresos((movs||[]).filter(m => m.tipo === 'ingreso'))
    setEgresos((movs||[]).filter(m => m.tipo === 'egreso'))
  }

  const totalIngresos = ingresos.reduce((a,r)=>a+Number(r.monto),0)
  const ingresosFacturados = ingresos.filter(r=>r.es_facturado).reduce((a,r)=>a+Number(r.monto),0)
  const ingresosNoFacturados = ingresos.filter(r=>!r.es_facturado).reduce((a,r)=>a+Number(r.monto),0)
  const totalEgresos = egresos.reduce((a,r)=>a+Number(r.monto),0)
  const balance = totalIngresos - totalEgresos
  const ivaEstimado = ingresosNoFacturados * 0.16
  const tasaResico = totalIngresos <= 25000 ? 0.01 : totalIngresos <= 50000 ? 0.011 : totalIngresos <= 83333 ? 0.015 : totalIngresos <= 208333 ? 0.02 : 0.025
const isrEstimado = totalIngresos * tasaResico

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos dias' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'
  const mesActual = new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  const badgePago = (pago) => {
    if (pagados[pago.id]) return { bg: '#EAF3DE', color: '#3B6D11', texto: 'Pagado' }
    if (pago.dias < 0) return { bg: '#FCEBEB', color: '#A32D2D', texto: 'Vencido' }
    if (pago.dias <= 5) return { bg: '#FCEBEB', color: '#A32D2D', texto: `${pago.dias} dias` }
    if (pago.dias <= 10) return { bg: '#FAEEDA', color: '#854F0B', texto: `${pago.dias} dias` }
    return { bg: '#EAF3DE', color: '#3B6D11', texto: `${pago.dias} dias` }
  }

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:600,color:'#1f2937',marginBottom:4}}>{saludo}</h1>
        <p style={{fontSize:14,color:'#6b7280'}}>Resumen de {mesActual}</p>
      </div>

      {/* Tarjetas */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        <div style={{background:'white',borderRadius:12,padding:'18px',border:'0.5px solid #e5e7eb'}}>
          <div style={{fontSize:12,color:'#6b7280',marginBottom:8}}>Ingresos del mes</div>
          <div style={{fontSize:22,fontWeight:600,color:'#3B6D11',marginBottom:8}}>{fmt(totalIngresos)}</div>
          <div style={{borderTop:'0.5px solid #f3f4f6',paddingTop:8,display:'flex',flexDirection:'column',gap:4}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
              <span style={{color:'#9ca3af'}}>Facturados</span>
              <span style={{color:'#185FA5',fontWeight:500}}>{fmt(ingresosFacturados)}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11}}>
              <span style={{color:'#9ca3af'}}>No facturados</span>
              <span style={{color:'#854F0B',fontWeight:500}}>{fmt(ingresosNoFacturados)}</span>
            </div>
          </div>
        </div>
        <div style={{background:'white',borderRadius:12,padding:'18px',border:'0.5px solid #e5e7eb'}}>
          <div style={{fontSize:12,color:'#6b7280',marginBottom:8}}>Egresos del mes</div>
          <div style={{fontSize:22,fontWeight:600,color:'#A32D2D'}}>{fmt(totalEgresos)}</div>
          <div style={{fontSize:11,color:'#9ca3af',marginTop:8}}>{egresos.length} movimientos</div>
        </div>
        <div style={{background:'white',borderRadius:12,padding:'18px',border:'0.5px solid #e5e7eb'}}>
          <div style={{fontSize:12,color:'#6b7280',marginBottom:8}}>Balance</div>
          <div style={{fontSize:22,fontWeight:600,color:balance>=0?'#3B6D11':'#A32D2D'}}>{fmt(balance)}</div>
          <div style={{fontSize:11,color:'#9ca3af',marginTop:8}}>{balance>=0?'Positivo':'Negativo'} este mes</div>
        </div>
        <div style={{background:'white',borderRadius:12,padding:'18px',border:'0.5px solid #e5e7eb'}}>
          <div style={{fontSize:12,color:'#6b7280',marginBottom:8}}>Movimientos</div>
          <div style={{fontSize:22,fontWeight:600,color:'#1f2937'}}>{ingresos.length+egresos.length}</div>
          <div style={{fontSize:11,color:'#9ca3af',marginTop:8}}>Este mes</div>
        </div>
      </div>

      {/* Widgets */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:24}}>

        {/* Estatus fiscal */}
        <div style={{background:'white',borderRadius:12,padding:'18px',border:'0.5px solid #e5e7eb'}}>
          <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Estatus fiscal</div>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
            <div style={{width:52,height:52,minWidth:52,borderRadius:'50%',background:'#EAF3DE',border:'2px solid #3B6D11',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'#3B6D11'}}>✓</div>
            <div>
              <div style={{fontSize:15,fontWeight:500,color:'#3B6D11'}}>Al corriente</div>
              <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>Opinion de cumplimiento SAT</div>
            </div>
          </div>
          {[
            {label:'Declaraciones presentadas',val:'Abr 2026',color:'#3B6D11'},
            {label:'RFC activo',val:'Vigente',color:'#3B6D11'},
            {label:'Buzon tributario',val:'Activo',color:'#3B6D11'},
            {label:'FIEL / e.firma',val:'Vence en 45 dias',color:'#BA7517'},
          ].map(item => (
            <div key={item.label} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#6b7280',marginBottom:6}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:item.color,minWidth:7}}></div>
              <span>{item.label}</span>
              <span style={{marginLeft:'auto',fontWeight:500,color:'#1f2937',fontSize:11}}>{item.val}</span>
            </div>
          ))}
        </div>

        {/* Proximos pagos dinamico */}
        <div style={{background:'white',borderRadius:12,padding:'18px',border:'0.5px solid #e5e7eb'}}>
          <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Proximos pagos</div>
          {pagos.map((p,i) => {
            const badge = badgePago(p)
            const vencido = p.dias < 0 && !pagados[p.id]
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,paddingBottom:8,marginBottom:8,borderBottom:i<pagos.length-1?'0.5px solid #f3f4f6':'none',opacity:pagados[p.id]?0.6:1}}>
                <div style={{minWidth:40,textAlign:'center',background:vencido?'#FCEBEB':'#f9fafb',borderRadius:8,padding:'4px 6px'}}>
                  <div style={{fontSize:15,fontWeight:500,color:vencido?'#A32D2D':'#1f2937',lineHeight:1}}>{p.dia}</div>
                  <div style={{fontSize:9,color:vencido?'#A32D2D':'#9ca3af',textTransform:'uppercase'}}>{p.mes}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:500,color:vencido?'#A32D2D':'#1f2937',textDecoration:pagados[p.id]?'line-through':'none'}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:'#6b7280',marginTop:1}}>{p.tipo}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:badge.bg,color:badge.color,whiteSpace:'nowrap'}}>
                    {badge.texto}
                  </span>
                  <input type="checkbox" checked={!!pagados[p.id]} onChange={() => setPagados(prev => ({...prev,[p.id]:!prev[p.id]}))}
                    title="Marcar como pagado"
                    style={{width:14,height:14,cursor:'pointer',accentColor:'#3B6D11'}} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Impuestos estimados */}
      <div style={{background:'white',borderRadius:12,padding:'18px',border:'0.5px solid #e5e7eb',marginBottom:24}}>
        <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>Impuestos estimados · {mesActual}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
          <div style={{background:'#f9fafb',borderRadius:10,padding:'12px'}}>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:4}}>IVA estimado</div>
            <div style={{fontSize:22,fontWeight:600,color:'#A32D2D'}}>{fmt(ivaEstimado)}</div>
          </div>
          <div style={{background:'#f9fafb',borderRadius:10,padding:'12px'}}>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:4}}>ISR estimado (RESICO 2%)</div>
            <div style={{fontSize:22,fontWeight:600,color:'#185FA5'}}>{fmt(isrEstimado)}</div>
          </div>
        </div>
        {[
          {lbl:'Ingresos registrados',v:fmt(totalIngresos)},
          {lbl:'Egresos registrados',v:fmt(totalEgresos)},
          {lbl:'IVA estimado (16% no facturados)',v:fmt(ivaEstimado),red:true},
          {lbl:'ISR segun tabla RESICO',v:fmt(isrEstimado),red:true},
        ].map(r => (
          <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid #f3f4f6',fontSize:13}}>
            <span style={{color:'#6b7280'}}>{r.lbl}</span>
            <span style={{fontWeight:500,color:r.red?'#A32D2D':'#1f2937'}}>{r.v}</span>
          </div>
        ))}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,padding:'12px 14px',background:'#f9fafb',borderRadius:10}}>
          <span style={{fontSize:13,color:'#6b7280'}}>Total estimado a pagar al SAT</span>
          <span style={{fontSize:20,fontWeight:600,color:'#A32D2D'}}>{fmt(ivaEstimado+isrEstimado)}</span>
        </div>
      </div>

      {/* Acciones rapidas */}
      <div>
        <h2 style={{fontSize:14,fontWeight:500,color:'#1f2937',marginBottom:12}}>Acciones rapidas</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
          {[
            {icon:'💰',label:'Registrar ingreso',href:'/movimientos/nuevo?tipo=ingreso',color:'#185FA5',bg:'#E6F1FB'},
            {icon:'🧾',label:'Registrar egreso',href:'/movimientos/nuevo?tipo=egreso',color:'#A32D2D',bg:'#FCEBEB'},
            {icon:'📋',label:'Ver ingresos',href:'/ingresos',color:'#3B6D11',bg:'#EAF3DE'},
            {icon:'📊',label:'Ver egresos',href:'/egresos',color:'#854F0B',bg:'#FAEEDA'},
          ].map(a => (
            <a key={a.label} href={a.href} style={{textDecoration:'none',background:'white',border:'0.5px solid #e5e7eb',borderRadius:12,padding:'14px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:34,height:34,borderRadius:8,background:a.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>
                {a.icon}
              </div>
              <span style={{fontSize:13,color:'#374151',fontWeight:500}}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}