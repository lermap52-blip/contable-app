'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'

const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmt(n) { return '$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

function parsearXML(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'text/xml')
  const cfdi = doc.querySelector('Comprobante') || doc.documentElement
  const emisor = doc.querySelector('Emisor')
  const receptor = doc.querySelector('Receptor')
  const timbre = doc.querySelector('TimbreFiscalDigital')
  const traslados = doc.querySelectorAll('Traslado')
  const retenciones = doc.querySelectorAll('Retencion')

  const fecha = (cfdi.getAttribute('Fecha') || '').split('T')[0]
  const subtotal = parseFloat(cfdi.getAttribute('SubTotal') || 0)
  const total = parseFloat(cfdi.getAttribute('Total') || 0)
  const formaPago = cfdi.getAttribute('FormaPago') || ''
  const usoCFDI = receptor?.getAttribute('UsoCFDI') || ''

  let iva = 0
  let tasaIva = 0
  traslados.forEach(t => {
    iva += parseFloat(t.getAttribute('Importe') || 0)
    tasaIva = parseFloat(t.getAttribute('TasaOCuota') || 0)
  })

  let retencion = 0
  retenciones.forEach(r => { retencion += parseFloat(r.getAttribute('Importe') || 0) })

  const uuid = timbre?.getAttribute('UUID') || ''
  const rfcEmisor = emisor?.getAttribute('Rfc') || ''
  const nombreEmisor = emisor?.getAttribute('Nombre') || 'Sin nombre'
  const categoria = usoCFDI === 'P01' ? 'Nomina' : usoCFDI === 'I04' ? 'Activo' : 'Gasto de operacion'
  const noDeducible = formaPago === '01' && total > 2000

  return { fecha, rfcEmisor, nombreEmisor, uuid, subtotal, iva, tasaIva: Math.round(tasaIva * 100), retencion, total, formaPago, categoria, noDeducible, estatus: 'pendiente' }
}

export default function Egresos() {
  const [egresos, setEgresos] = useState([])
  const [chips, setChips] = useState([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [dragover, setDragover] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  useEffect(() => { cargarEgresos() }, [])

  const cargarEgresos = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: movs } = await supabase
      .from('movimientos')
      .select('*')
      .eq('empresa_id', user.id)
      .eq('tipo', 'egreso')
      .order('fecha_operacion', { ascending: false })
    const mapped = (movs || []).map(m => ({
      id: m.id,
      fecha: m.fecha_operacion,
      rfcEmisor: m.referencia || '',
      nombreEmisor: m.descripcion || '',
      uuid: m.notas || '',
      subtotal: Number(m.monto),
      iva: Number(m.monto) * 0.16,
      tasaIva: 16,
      retencion: 0,
      total: Number(m.monto) * 1.16,
      formaPago: m.forma_pago || '',
      categoria: 'Gasto de operacion',
      noDeducible: false,
      estatus: m.estado === 'confirmado' ? 'pagado' : 'pendiente',
    }))
    setEgresos(mapped)
    setLoading(false)
  }

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.name.endsWith('.xml')) return
      const reader = new FileReader()
      reader.onload = async e => {
        try {
          const datos = parsearXML(e.target.result)
          setChips(prev => [...prev, { nombre: file.name, error: false }])
          await guardarEnSupabase(datos)
          setEgresos(prev => [...prev, datos])
        } catch {
          setChips(prev => [...prev, { nombre: file.name, error: true }])
        }
      }
      reader.readAsText(file)
    })
  }

  const guardarEnSupabase = async (datos) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('movimientos').insert({
      empresa_id: user.id,
      tipo: 'egreso',
      monto: datos.subtotal,
      monto_base: datos.subtotal,
      moneda: 'MXN',
      tipo_cambio: 1,
      fecha_operacion: datos.fecha,
      descripcion: datos.nombreEmisor,
      referencia: datos.rfcEmisor,
      notas: datos.uuid,
      forma_pago: datos.formaPago,
      es_facturado: true,
      estado: 'borrador',
    })
  }

  const filtered = egresos.filter(r => {
    const q = search.toLowerCase()
    const matchQ = r.nombreEmisor.toLowerCase().includes(q) || r.rfcEmisor.toLowerCase().includes(q) || r.uuid.toLowerCase().includes(q)
    const matchCat = !catFilter || r.categoria === catFilter
    return matchQ && matchCat
  })

  const totalGastado = filtered.reduce((a, r) => a + r.total, 0)
  const ivaAcreditable = filtered.reduce((a, r) => a + r.iva, 0)
  const pendientes = filtered.filter(r => r.estatus === 'pendiente')
  const noDeducibles = filtered.filter(r => r.noDeducible).reduce((a, r) => a + r.total, 0)

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Egresos</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:18}}>Gastos y comprobantes fiscales recibidos</div>

      {/* Tarjetas */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:18}}>
        {[
          {label:'Total gastado',val:fmt(totalGastado),color:'#A32D2D',sub:filtered.length+' comprobantes'},
          {label:'IVA acreditable',val:fmt(ivaAcreditable),color:'#3B6D11',sub:'Puedes restar al IVA cobrado'},
          {label:'Gastos por pagar',val:fmt(pendientes.reduce((a,r)=>a+r.total,0)),color:'#854F0B',sub:pendientes.length+' pendientes'},
          {label:'No deducibles',val:fmt(noDeducibles),color:'#6b7280',sub:'Efectivo mayor $2,000'},
        ].map(c => (
          <div key={c.label} style={{background:'white',borderRadius:10,padding:14,border:'0.5px solid #e5e7eb'}}>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:20,fontWeight:600,color:c.color}}>{c.val}</div>
            <div style={{fontSize:10,color:'#9ca3af',marginTop:3}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragover(true) }}
        onDragLeave={() => setDragover(false)}
        onDrop={e => { e.preventDefault(); setDragover(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => fileRef.current.click()}
        style={{border:`2px dashed ${dragover?'#185FA5':'#e5e7eb'}`,borderRadius:12,padding:32,textAlign:'center',background:dragover?'#E6F1FB':'white',marginBottom:16,cursor:'pointer',transition:'all 0.2s'}}>
        <div style={{fontSize:36,marginBottom:12}}>📂</div>
        <div style={{fontSize:15,fontWeight:500,color:'#1f2937',marginBottom:4}}>Arrastra tus archivos XML aqui</div>
        <div style={{fontSize:12,color:'#9ca3af',marginBottom:16}}>O da clic para seleccionarlos · Acepta multiples archivos XML del SAT</div>
        <button onClick={e => { e.stopPropagation(); fileRef.current.click() }}
          style={{padding:'8px 20px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
          Seleccionar XML
        </button>
        <input ref={fileRef} type="file" accept=".xml" multiple style={{display:'none'}} onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          {chips.map((c,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:6,background:c.error?'#FCEBEB':'#EAF3DE',border:`0.5px solid ${c.error?'#A32D2D':'#3B6D11'}`,borderRadius:20,padding:'4px 10px',fontSize:11,color:c.error?'#A32D2D':'#3B6D11'}}>
              {c.error ? '✗' : '✓'} {c.nombre}
            </div>
          ))}
        </div>
      )}

      {/* Header bar */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'white',border:'0.5px solid #e5e7eb',borderRadius:999,padding:'10px 18px'}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por proveedor, RFC o folio..." style={{border:'none',outline:'none',fontSize:13,color:'#1f2937',background:'transparent',width:'100%'}} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{padding:'9px 12px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#374151',background:'white',outline:'none',cursor:'pointer'}}>
          <option value="">Todas las categorias</option>
          <option value="Gasto de operacion">Gasto de operacion</option>
          <option value="Nomina">Nomina</option>
          <option value="Activo">Activo</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr>
              {['Fecha','Proveedor / RFC','Folio UUID','Categoria','Subtotal','IVA','Retenciones','Total','Estatus'].map((h,i) => (
                <th key={h} style={{padding:'10px 12px',textAlign:[4,5,6,7].includes(i)?'right':'left',fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid #e5e7eb',background:'#f9fafb',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{textAlign:'center',padding:32,color:'#9ca3af'}}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="9" style={{textAlign:'center',padding:32,color:'#9ca3af'}}>Carga un archivo XML del SAT para ver los egresos aqui</td></tr>
            ) : filtered.map((r,i) => (
              <tr key={i} style={{background:i%2===1?'#f9fafb':'white'}}>
                <td style={{padding:'10px 12px'}}>{r.fecha}</td>
                <td style={{padding:'10px 12px'}}>
                  <div style={{fontWeight:500,color:'#1f2937',display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
                    {r.nombreEmisor}
                    {r.noDeducible && <span style={{fontSize:10,color:'#A32D2D',background:'#FCEBEB',padding:'2px 7px',borderRadius:20}}>⚠ No deducible</span>}
                  </div>
                  <div style={{fontSize:10,color:'#9ca3af',fontFamily:'monospace'}}>{r.rfcEmisor}</div>
                </td>
                <td style={{padding:'10px 12px',fontFamily:'monospace',fontSize:10,color:'#6b7280'}}>{r.uuid ? r.uuid.substring(0,8)+'...' : '—'}</td>
                <td style={{padding:'10px 12px'}}>
                  <span style={{fontSize:10,padding:'3px 8px',borderRadius:20,background:r.categoria==='Nomina'?'#E6F1FB':r.categoria==='Activo'?'#F3E8FF':'#f3f4f6',color:r.categoria==='Nomina'?'#185FA5':r.categoria==='Activo'?'#7C3AED':'#6b7280'}}>
                    {r.categoria}
                  </span>
                </td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{fmt(r.subtotal)}</td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>
                  {fmt(r.iva)}
                  <span style={{fontSize:10,color:'#6b7280',background:'#f3f4f6',padding:'2px 6px',borderRadius:4,marginLeft:4}}>{r.tasaIva}%</span>
                </td>
                <td style={{padding:'10px 12px',textAlign:'right'}}>{fmt(r.retencion)}</td>
                <td style={{padding:'10px 12px',textAlign:'right',fontWeight:600,color:'#A32D2D'}}>{fmt(r.total)}</td>
                <td style={{padding:'10px 12px'}}>
                  <select value={r.estatus} onChange={e => {
                    const nuevo = [...egresos]
                    nuevo[i].estatus = e.target.value
                    setEgresos(nuevo)
                  }} style={{border:'0.5px solid #e5e7eb',borderRadius:6,padding:'3px 6px',fontSize:11,background:'white',cursor:'pointer'}}>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderTop:'0.5px solid #e5e7eb'}}>
          <span style={{fontSize:12,color:'#6b7280'}}>{filtered.length} registros</span>
          <div style={{display:'flex',gap:4}}>
            {['‹','1','›'].map(b => (
              <button key={b} style={{padding:'5px 10px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:12,color:b==='1'?'white':'#6b7280',background:b==='1'?'#A32D2D':'white',cursor:'pointer'}}>{b}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}