'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'
import { useCliente } from '../ClienteContext'

const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmt(n) { return '$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

function TablaIngresos({ rows, onEliminar }) {
  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
      <thead>
        <tr>
          {['Fecha','Descripcion','Forma de pago','Referencia','Monto','Estado','Notas',''].map((h,i) => (
            <th key={h+i} style={{padding:'10px 12px',textAlign:i===4?'right':'left',fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid #e5e7eb',background:'#f9fafb',whiteSpace:'nowrap'}}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i) => (
          <tr key={r.id} style={{background:i%2===1?'#f9fafb':'white'}}>
            <td style={{padding:'10px 12px',color:'#374151'}}>{r.fecha_operacion}</td>
            <td style={{padding:'10px 12px',fontWeight:500,color:'#1f2937'}}>{r.descripcion}</td>
            <td style={{padding:'10px 12px'}}>
              <span style={{fontSize:11,background:'#f3f4f6',color:'#6b7280',padding:'3px 8px',borderRadius:20}}>
                {r.forma_pago || '—'}
              </span>
            </td>
            <td style={{padding:'10px 12px',color:'#6b7280',fontFamily:'monospace',fontSize:11}}>{r.referencia || '—'}</td>
            <td style={{padding:'10px 12px',textAlign:'right',fontWeight:600,color:'#3B6D11'}}>{fmt(r.monto)}</td>
            <td style={{padding:'10px 12px'}}>
              <span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:r.estado==='confirmado'?'#EAF3DE':'#FAEEDA',color:r.estado==='confirmado'?'#3B6D11':'#854F0B'}}>
                {r.estado}
              </span>
            </td>
            <td style={{padding:'10px 12px',color:'#9ca3af',fontSize:11}}>{r.notas || '—'}</td>
            <td style={{padding:'10px 12px'}}>
              <button
                onClick={() => onEliminar(r.id)}
                style={{padding:'4px 6px',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6}}
                onMouseEnter={e => {
                  e.currentTarget.querySelector('.tapa').setAttribute('transform','rotate(-35 12 4)')
                  e.currentTarget.querySelector('svg').style.stroke='#A32D2D'
                }}
                onMouseLeave={e => {
                  e.currentTarget.querySelector('.tapa').setAttribute('transform','rotate(0 12 4)')
                  e.currentTarget.querySelector('svg').style.stroke='#1f2937'
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{transition:'stroke 0.2s'}}>
                  <path className="tapa" style={{transition:'transform 0.2s',transformOrigin:'12px 4px'}} d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <rect x="5" y="6" width="14" height="15" rx="2" />
                  <line x1="9" y1="11" x2="9" y2="17" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="15" y1="11" x2="15" y2="17" />
                </svg>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Ingresos() {
  const router = useRouter()
  const { clienteActivo, empresaId, esModoMaestro } = useCliente()
  const [search, setSearch] = useState('')
  const [mesSelected, setMesSelected] = useState(null)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [diaInput, setDiaInput] = useState('')
  const [calOpen, setCalOpen] = useState(false)
  const [mesActivoLabel, setMesActivoLabel] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (empresaId) cargarIngresos()
  }, [empresaId, clienteActivo])

  const cargarIngresos = async () => {
    setLoading(true)
    let query = supabase
      .from('movimientos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'ingreso')
      .order('fecha_operacion', { ascending: false })

    if (clienteActivo) {
      query = query.eq('cliente_id', clienteActivo.id)
    } else {
      query = query.is('cliente_id', null)
    }

    const { data: movs } = await query
    setData(movs || [])
    setLoading(false)
  }

  const eliminarIngreso = async (id) => {
    const confirmar = window.confirm('Seguro que quieres eliminar este ingreso? Esta accion no se puede deshacer.')
    if (!confirmar) return
    await supabase.from('movimientos').delete().eq('id', id)
    cargarIngresos()
  }

  const filtered = data.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = r.descripcion?.toLowerCase().includes(q) || r.referencia?.toLowerCase().includes(q)
    if (diaInput) return matchSearch && r.fecha_operacion === diaInput
    if (mesSelected !== null) {
      const d = new Date(r.fecha_operacion)
      return matchSearch && d.getMonth() === mesSelected && d.getFullYear() === anio
    }
    return matchSearch
  })

  const totalIngresos = filtered.reduce((a,r)=>a+Number(r.monto),0)
  const totalFacturados = filtered.filter(r=>r.es_facturado).reduce((a,r)=>a+Number(r.monto),0)
  const totalNoFacturados = filtered.filter(r=>!r.es_facturado).reduce((a,r)=>a+Number(r.monto),0)
  const facturados = filtered.filter(r=>r.es_facturado)
  const noFacturados = filtered.filter(r=>!r.es_facturado)

  const aplicar = () => {
    if (diaInput) setMesActivoLabel(diaInput)
    else if (mesSelected !== null) setMesActivoLabel(meses[mesSelected]+' '+anio)
    setCalOpen(false)
  }

  const limpiar = () => {
    setMesSelected(null)
    setDiaInput('')
    setMesActivoLabel('')
    setCalOpen(false)
  }

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>

      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Ingresos</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:18}}>
        {esModoMaestro ? 'Todos los ingresos del despacho' : `Ingresos de ${clienteActivo?.nombre}`}
      </div>

      {/* Tarjetas */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:18}}>
        {[
          {label:'Total ingresos',val:fmt(totalIngresos),color:'#3B6D11',sub:filtered.length+' movimientos'},
          {label:'Facturados',val:fmt(totalFacturados),color:'#185FA5',sub:facturados.length+' con CFDI'},
          {label:'No facturados',val:fmt(totalNoFacturados),color:'#854F0B',sub:noFacturados.length+' sin CFDI'},
          {label:'IVA estimado',val:fmt(totalNoFacturados*0.16),color:'#A32D2D',sub:'Sobre no facturados'},
        ].map(c => (
          <div key={c.label} style={{background:'white',borderRadius:10,padding:14,border:'0.5px solid #e5e7eb'}}>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:20,fontWeight:600,color:c.color}}>{c.val}</div>
            <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Header bar */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'white',border:'0.5px solid #e5e7eb',borderRadius:999,padding:'10px 18px'}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descripcion o referencia..." style={{border:'none',outline:'none',fontSize:13,color:'#1f2937',background:'transparent',width:'100%'}} />
        </div>

        <div style={{position:'relative'}}>
          <button onClick={() => setCalOpen(!calOpen)} style={{background:'white',border:'0.5px solid #e5e7eb',cursor:'pointer',padding:'9px 12px',borderRadius:8,color:'#6b7280',display:'flex',alignItems:'center',gap:6,fontSize:13}}>
            📅 {mesActivoLabel || 'Filtrar fecha'}
          </button>
          {calOpen && (
            <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'white',border:'0.5px solid #e5e7eb',borderRadius:14,padding:16,boxShadow:'0 4px 24px rgba(0,0,0,0.10)',zIndex:200,minWidth:260}}>
              <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Año</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <button onClick={() => setAnio(anio-1)} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:16,padding:'2px 8px'}}>‹</button>
                <span style={{fontSize:14,fontWeight:500,color:'#1f2937'}}>{anio}</span>
                <button onClick={() => setAnio(anio+1)} style={{background:'none',border:'none',cursor:'pointer',color:'#6b7280',fontSize:16,padding:'2px 8px'}}>›</button>
              </div>
              <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Mes</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,marginBottom:12}}>
                {meses.map((m,i) => (
                  <button key={m} onClick={() => { setMesSelected(i); setDiaInput('') }}
                    style={{padding:'6px 4px',border:'none',borderRadius:8,fontSize:12,cursor:'pointer',background:mesSelected===i?'#185FA5':'#f9fafb',color:mesSelected===i?'white':'#374151'}}>
                    {m}
                  </button>
                ))}
              </div>
              <div style={{borderTop:'0.5px solid #f3f4f6',margin:'10px 0'}}></div>
              <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Dia especifico</div>
              <input type="date" value={diaInput} onChange={e => setDiaInput(e.target.value)} style={{width:'100%',padding:'7px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',boxSizing:'border-box'}} />
              <div style={{display:'flex',gap:6,marginTop:10}}>
                <button onClick={aplicar} style={{flex:1,padding:7,background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer'}}>Aplicar</button>
                <button onClick={limpiar} style={{flex:1,padding:7,border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:12,color:'#6b7280',background:'none',cursor:'pointer'}}>Limpiar</button>
              </div>
            </div>
          )}
        </div>

        {mesActivoLabel && (
          <span onClick={limpiar} style={{fontSize:11,color:'#185FA5',background:'#E6F1FB',padding:'3px 10px',borderRadius:20,cursor:'pointer',whiteSpace:'nowrap'}}>
            {mesActivoLabel} ✕
          </span>
        )}

        <button onClick={() => router.push('/movimientos/nuevo?tipo=ingreso')}
          style={{padding:'9px 16px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
          + Nuevo ingreso
        </button>
      </div>

      {/* Tabla facturados */}
      {facturados.length > 0 && (
        <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden',marginBottom:16}}>
          <div style={{padding:'12px 16px',borderBottom:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:11,fontWeight:500,color:'#185FA5',background:'#E6F1FB',padding:'3px 10px',borderRadius:20}}>Facturados (CFDI)</span>
            <span style={{fontSize:12,color:'#9ca3af'}}>{facturados.length} registros</span>
          </div>
          <TablaIngresos rows={facturados} onEliminar={eliminarIngreso} />
        </div>
      )}

      {/* Tabla no facturados */}
      <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
        <div style={{padding:'12px 16px',borderBottom:'0.5px solid #e5e7eb',display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:11,fontWeight:500,color:'#854F0B',background:'#FAEEDA',padding:'3px 10px',borderRadius:20}}>No facturados</span>
          <span style={{fontSize:12,color:'#9ca3af'}}>{noFacturados.length} registros</span>
        </div>
        {loading ? (
          <div style={{padding:24,textAlign:'center',color:'#9ca3af',fontSize:13}}>Cargando...</div>
        ) : noFacturados.length === 0 ? (
          <div style={{padding:24,textAlign:'center',color:'#9ca3af',fontSize:13}}>
            {clienteActivo ? `No hay ingresos para ${clienteActivo.nombre}` : 'No hay ingresos registrados — agrega el primero'}
          </div>
        ) : (
          <TablaIngresos rows={noFacturados} onEliminar={eliminarIngreso} />
        )}
      </div>
    </div>
  )
}