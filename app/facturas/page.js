'use client'
import { useState } from 'react'

const PAC = {
  async timbrar(factura) {
    console.log('PAC.timbrar:', factura)
    return { uuid: 'SIMULADO-' + Date.now() }
  },
  async cancelar(uuid) {
    console.log('PAC.cancelar:', uuid)
    return { ok: true }
  },
  async descargarXML(uuid) {
    console.log('PAC.descargarXML:', uuid)
    return null
  },
  async descargarPDF(uuid) {
    console.log('PAC.descargarPDF:', uuid)
    return null
  }
}

const tasasIVA = [
  { label: '16% General', valor: 0.16 },
  { label: '8% Frontera', valor: 0.08 },
  { label: '4% Especial', valor: 0.04 },
  { label: '0% Tasa cero', valor: 0 },
  { label: 'Exento', valor: -1 },
]

const usosCFDI = [
  { value: 'G01', label: 'G01 - Adquisicion de mercancias' },
  { value: 'G02', label: 'G02 - Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I01', label: 'I01 - Construcciones' },
  { value: 'I02', label: 'I02 - Mobilario y equipo de oficina por inversiones' },
  { value: 'I03', label: 'I03 - Equipo de transporte' },
  { value: 'I04', label: 'I04 - Equipo de computo y accesorios' },
  { value: 'I05', label: 'I05 - Dados, troqueles, moldes, matrices y herramental' },
  { value: 'I06', label: 'I06 - Comunicaciones telefonicas' },
  { value: 'I07', label: 'I07 - Comunicaciones satelitales' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'D01', label: 'D01 - Honorarios medicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'D02 - Gastos medicos por incapacidad o discapacidad' },
  { value: 'D03', label: 'D03 - Gastos funerales' },
  { value: 'D04', label: 'D04 - Donativos' },
  { value: 'D05', label: 'D05 - Intereses reales efectivamente pagados por creditos hipotecarios (casa habitacion)' },
  { value: 'D06', label: 'D06 - Aportaciones voluntarias al SAR' },
  { value: 'D07', label: 'D07 - Primas por seguros de gastos medicos' },
  { value: 'D08', label: 'D08 - Gastos de transportacion escolar obligatoria' },
  { value: 'D09', label: 'D09 - Depositos en cuentas para el ahorro, primas que tengan como base planes de pensiones' },
  { value: 'D10', label: 'D10 - Pagos por servicios educativos (colegiaturas)' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 - Pagos' },
  { value: 'CN01', label: 'CN01 - Nomina' },
  { value: 'P01', label: 'P01 - Por definir' },
]

const formasPago = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electronica de fondos' },
  { value: '04', label: '04 - Tarjeta de credito' },
  { value: '05', label: '05 - Monedero electronico' },
  { value: '06', label: '06 - Dinero electronico' },
  { value: '08', label: '08 - Vales de despensa' },
  { value: '12', label: '12 - Dacion en pago' },
  { value: '13', label: '13 - Pago por subrogacion' },
  { value: '14', label: '14 - Pago por consignacion' },
  { value: '15', label: '15 - Condonacion' },
  { value: '17', label: '17 - Compensacion' },
  { value: '23', label: '23 - Novacion' },
  { value: '24', label: '24 - Confusion' },
  { value: '25', label: '25 - Remision de deuda' },
  { value: '26', label: '26 - Prescripcion o caducidad' },
  { value: '27', label: '27 - A satisfaccion del acreedor' },
  { value: '28', label: '28 - Tarjeta de debito' },
  { value: '29', label: '29 - Tarjeta de servicios' },
  { value: '30', label: '30 - Aplicacion de anticipos' },
  { value: '31', label: '31 - Intermediario pagos' },
  { value: '99', label: '99 - Por definir' },
]

const metodosPago = [
  { value: 'PUE', label: 'PUE - Pago en una sola exhibicion' },
  { value: 'PPD', label: 'PPD - Pago en parcialidades o diferido' },
]

const regimenes = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '607', label: '607 - Regimen de Enajenacion o Adquisicion de Bienes' },
  { value: '608', label: '608 - Demas ingresos' },
  { value: '609', label: '609 - Consolidacion' },
  { value: '610', label: '610 - Residentes en el Extranjero sin Establecimiento Permanente en Mexico' },
  { value: '611', label: '611 - Ingresos por Dividendos (socios y accionistas)' },
  { value: '612', label: '612 - Personas Fisicas con Actividades Empresariales y Profesionales' },
  { value: '614', label: '614 - Ingresos por intereses' },
  { value: '615', label: '615 - Regimen de los ingresos por obtencion de premios' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Produccion que optan por diferir sus ingresos' },
  { value: '621', label: '621 - Incorporacion Fiscal' },
  { value: '622', label: '622 - Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras' },
  { value: '623', label: '623 - Opcional para Grupos de Sociedades' },
  { value: '624', label: '624 - Coordinados' },
  { value: '625', label: '625 - Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas' },
  { value: '626', label: '626 - Regimen Simplificado de Confianza (RESICO)' },
]

const facturasMock = [
  { id:1, folio:'A-0042', uuid:'A1B2C3D4-E5F6-7890-ABCD-EF1234567890', cliente:'Grupo Industrial del Norte SA de CV', rfc:'GIN920315AB2', fecha:'2026-05-02', uso:'G03', subtotal:86250, iva:13800, tasaIVA:0.16, ret:2587.50, total:97462.50, estatus:'timbrada', esPM:true },
  { id:2, folio:'A-0043', uuid:'', cliente:'Comercializadora Monterrey SA de CV', rfc:'CMO010101XY3', fecha:'2026-05-05', uso:'G01', subtotal:45000, iva:7200, tasaIVA:0.16, ret:0, total:52200, estatus:'borrador', esPM:true },
  { id:3, folio:'A-0041', uuid:'B2C3D4E5-F6A7-8901-BCDE-F12345678901', cliente:'Juan Carlos Mendoza Lopez', rfc:'MELJ850612HN1', fecha:'2026-04-28', uso:'S01', subtotal:12000, iva:960, tasaIVA:0.08, ret:0, total:12960, estatus:'cancelada', esPM:false },
]

function fmt(n) { return '$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }

function ConceptoRow({ concepto, onChange, onDelete, index }) {
  const importe = (Number(concepto.cantidad) * Number(concepto.precio)) || 0
  return (
    <tr style={{borderBottom:'0.5px solid #f3f4f6'}}>
      <td style={{padding:'6px 8px'}}>
        <input type="number" value={concepto.cantidad} min="1" onChange={e => onChange(index,'cantidad',e.target.value)}
          style={{width:'100%',padding:'6px 8px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:12,outline:'none',textAlign:'center',background:'#f9fafb'}} />
      </td>
      <td style={{padding:'6px 8px'}}>
        <input type="text" value={concepto.descripcion} onChange={e => onChange(index,'descripcion',e.target.value)} placeholder="Descripcion del servicio o producto"
          style={{width:'100%',padding:'6px 8px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:12,outline:'none',background:'#f9fafb'}} />
      </td>
      <td style={{padding:'6px 8px'}}>
        <div style={{position:'relative'}}>
          <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#9ca3af'}}>$</span>
          <input type="number" value={concepto.precio} onChange={e => onChange(index,'precio',e.target.value)} placeholder="0.00"
            style={{width:'100%',padding:'6px 8px 6px 18px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:12,outline:'none',background:'#f9fafb'}} />
        </div>
      </td>
      <td style={{padding:'6px 8px',textAlign:'right',fontWeight:500,fontSize:12,color:'#1f2937'}}>{fmt(importe)}</td>
      <td style={{padding:'6px 8px',textAlign:'center'}}>
        {index > 0 && (
          <button onClick={() => onDelete(index)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16,lineHeight:1}}>✕</button>
        )}
      </td>
    </tr>
  )
}

export default function Facturas() {
  const [facturas, setFacturas] = useState(facturasMock)
  const [search, setSearch] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [timbrado, setTimbrado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cliente, setCliente] = useState({ rfc:'', nombre:'', regimen:'626', cp:'' })
  const [usoCFDI, setUsoCFDI] = useState('G03')
  const [metodoPago, setMetodoPago] = useState('PUE')
  const [formaPago, setFormaPago] = useState('03')
  const [tasaIVA, setTasaIVA] = useState(0.16)
  const [conceptos, setConceptos] = useState([{ cantidad:1, descripcion:'', precio:'' }])
  const [ultimoUUID, setUltimoUUID] = useState('')

  const esPM = cliente.rfc.length === 12

  const subtotal = conceptos.reduce((a,c) => a + (Number(c.cantidad) * Number(c.precio) || 0), 0)
  const iva = tasaIVA === -1 ? 0 : subtotal * tasaIVA
  const ret = esPM ? subtotal * 0.0125 : 0
  const total = subtotal + iva - ret

  const actualizarConcepto = (i, campo, valor) => {
    setConceptos(prev => prev.map((c,idx) => idx===i ? {...c,[campo]:valor} : c))
  }

  const agregarConcepto = () => setConceptos(prev => [...prev, { cantidad:1, descripcion:'', precio:'' }])
  const eliminarConcepto = (i) => setConceptos(prev => prev.filter((_,idx) => idx!==i))

  const resetModal = () => {
    setCliente({ rfc:'', nombre:'', regimen:'626', cp:'' })
    setUsoCFDI('G03')
    setMetodoPago('PUE')
    setFormaPago('03')
    setTasaIVA(0.16)
    setConceptos([{ cantidad:1, descripcion:'', precio:'' }])
    setTimbrado(false)
  }

  const handleTimbrar = async () => {
    if (!cliente.rfc || !cliente.nombre) return
    setLoading(true)
    const facturaData = {
      cliente, usoCFDI, metodoPago, formaPago, tasaIVA, conceptos, subtotal, iva, ret, total, esPM,
    }
    const resultado = await PAC.timbrar(facturaData)
    const uuid = resultado.uuid
    setUltimoUUID(uuid)
    setFacturas(prev => [{
      id: Date.now(),
      folio: 'A-' + String(prev.length + 42).padStart(4,'0'),
      uuid,
      cliente: cliente.nombre,
      rfc: cliente.rfc,
      fecha: new Date().toISOString().split('T')[0],
      uso: usoCFDI,
      subtotal, iva, tasaIVA, ret, total,
      estatus: 'timbrada',
      esPM,
    }, ...prev])
    setLoading(false)
    setTimbrado(true)
  }

  const handleDescarga = async (tipo, factura) => {
    if (tipo === 'PDF') {
      const tasaLabel = factura.tasaIVA === -1 ? 'Exento' : (factura.tasaIVA*100)+'%'
      const html = `<html><head><style>body{font-family:Arial,sans-serif;padding:32px;font-size:13px}h1{font-size:20px;font-weight:700;margin-bottom:4px}.sub{color:#6b7280;font-size:12px;margin-bottom:24px}table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb}th{background:#f9fafb;font-weight:600;font-size:11px;color:#6b7280;text-transform:uppercase}.total{font-size:18px;font-weight:700;color:#185FA5}.footer{margin-top:32px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body><h1>ContableApp</h1><div class="sub">CFDI · ${factura.folio}</div><table><tr><th>Campo</th><th>Valor</th></tr><tr><td>Cliente</td><td>${factura.cliente}</td></tr><tr><td>RFC</td><td>${factura.rfc}</td></tr><tr><td>Folio</td><td>${factura.folio}</td></tr><tr><td>UUID</td><td>${factura.uuid||'Borrador'}</td></tr><tr><td>Fecha</td><td>${factura.fecha}</td></tr><tr><td>Uso CFDI</td><td>${factura.uso}</td></tr><tr><td>Subtotal</td><td>${fmt(factura.subtotal)}</td></tr><tr><td>IVA (${tasaLabel})</td><td>${fmt(factura.iva)}</td></tr><tr><td>Retenciones</td><td>${fmt(factura.ret)}</td></tr><tr><td><strong>Total</strong></td><td class="total">${fmt(factura.total)}</td></tr><tr><td>Estatus</td><td>${factura.estatus}</td></tr></table><div class="footer">Generado por ContableApp · ${new Date().toLocaleDateString('es-MX')}</div></body></html>`
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${factura.folio}.html`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Folio="${factura.folio}" Fecha="${factura.fecha}T00:00:00" SubTotal="${factura.subtotal}" Total="${factura.total}">\n  <cfdi:Emisor Rfc="XAXX010101000" Nombre="ContableApp" RegimenFiscal="626"/>\n  <cfdi:Receptor Rfc="${factura.rfc}" Nombre="${factura.cliente}" UsoCFDI="${factura.uso}"/>\n  <!-- UUID: ${factura.uuid||'SIN-TIMBRE'} -->\n</cfdi:Comprobante>`
      const blob = new Blob([xml], { type: 'text/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factura-${factura.folio}.xml`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const filtered = facturas.filter(f => {
    const q = search.toLowerCase()
    const matchQ = f.folio.toLowerCase().includes(q) || f.cliente.toLowerCase().includes(q) || f.rfc.toLowerCase().includes(q)
    const matchE = !filtroEstatus || f.estatus === filtroEstatus.toLowerCase()
    return matchQ && matchE
  })

  const badgeStyle = (e) => {
    if (e==='timbrada') return {background:'#EAF3DE',color:'#3B6D11'}
    if (e==='cancelada') return {background:'#FCEBEB',color:'#A32D2D'}
    return {background:'#f3f4f6',color:'#6b7280'}
  }

  const inputStyle = {width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#1f2937',outline:'none',background:'#f9fafb',boxSizing:'border-box'}
  const selectStyle = {width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:12,color:'#1f2937',outline:'none',background:'#f9fafb'}
  const labelStyle = {display:'block',fontSize:12,color:'#6b7280',marginBottom:4}

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Facturas</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:18}}>Comprobantes fiscales digitales (CFDI)</div>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'white',border:'0.5px solid #e5e7eb',borderRadius:999,padding:'10px 18px'}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio, cliente o RFC..." style={{border:'none',outline:'none',fontSize:13,color:'#1f2937',background:'transparent',width:'100%'}} />
        </div>
        <select value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}
          style={{padding:'9px 12px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,color:'#374151',background:'white',outline:'none',cursor:'pointer'}}>
          <option value="">Todos los estatus</option>
          <option value="timbrada">Timbrada</option>
          <option value="borrador">Borrador</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <button onClick={() => { resetModal(); setModalOpen(true) }}
          style={{padding:'9px 16px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
          + Nueva factura
        </button>
      </div>

      <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
          <thead>
            <tr>
              {['Folio','Cliente / RFC','Fecha','Uso CFDI','Subtotal','IVA','Retenciones','Total','Estatus','Acciones'].map((h,i) => (
                <th key={h} style={{padding:'10px 14px',textAlign:[4,5,6,7].includes(i)?'right':'left',fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid #e5e7eb',background:'#f9fafb',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="10" style={{textAlign:'center',padding:32,color:'#9ca3af'}}>No hay facturas — crea la primera</td></tr>
            ) : filtered.map((f,i) => (
              <tr key={f.id} style={{background:i%2===1?'#f9fafb':'white'}}>
                <td style={{padding:'10px 14px',fontFamily:'monospace',fontSize:11,color:'#6b7280'}}>{f.folio}</td>
                <td style={{padding:'10px 14px'}}>
                  <div style={{fontWeight:500,color:'#1f2937'}}>{f.cliente}</div>
                  <div style={{fontSize:10,color:'#9ca3af',fontFamily:'monospace',marginTop:1}}>{f.rfc}</div>
                </td>
                <td style={{padding:'10px 14px',color:'#6b7280'}}>{f.fecha}</td>
                <td style={{padding:'10px 14px',fontSize:11,color:'#6b7280'}}>{f.uso}</td>
                <td style={{padding:'10px 14px',textAlign:'right'}}>{fmt(f.subtotal)}</td>
                <td style={{padding:'10px 14px',textAlign:'right',color:'#185FA5'}}>
                  {fmt(f.iva)}
                  <span style={{fontSize:9,color:'#9ca3af',marginLeft:4}}>{f.tasaIVA===-1?'Ex':((f.tasaIVA||0.16)*100)+'%'}</span>
                </td>
                <td style={{padding:'10px 14px',textAlign:'right',color:'#A32D2D'}}>{f.ret>0?fmt(f.ret):'—'}</td>
                <td style={{padding:'10px 14px',textAlign:'right',fontWeight:600,color:'#1f2937'}}>{fmt(f.total)}</td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{...badgeStyle(f.estatus),fontSize:10,padding:'3px 8px',borderRadius:20,whiteSpace:'nowrap'}}>
                    {f.estatus.charAt(0).toUpperCase()+f.estatus.slice(1)}
                  </span>
                </td>
                <td style={{padding:'10px 14px'}}>
                  <div style={{display:'flex',gap:5}}>
                    <button onClick={() => handleDescarga('PDF',f)} style={{padding:'4px 8px',background:'#FCEBEB',color:'#A32D2D',border:'none',borderRadius:6,fontSize:10,fontWeight:500,cursor:'pointer'}}>PDF</button>
                    <button onClick={() => handleDescarga('XML',f)} style={{padding:'4px 8px',background:'#EAF3DE',color:'#3B6D11',border:'none',borderRadius:6,fontSize:10,fontWeight:500,cursor:'pointer'}}>XML</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderTop:'0.5px solid #e5e7eb'}}>
          <span style={{fontSize:12,color:'#6b7280'}}>{filtered.length} facturas</span>
          <div style={{display:'flex',gap:4}}>
            {['‹','1','›'].map(b => (
              <button key={b} style={{padding:'5px 10px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:12,color:b==='1'?'white':'#6b7280',background:b==='1'?'#185FA5':'white',cursor:'pointer'}}>{b}</button>
            ))}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:16,width:720,maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>

            <div style={{padding:'20px 24px 16px',borderBottom:'0.5px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:16,fontWeight:600,color:'#1f2937'}}>{timbrado?'CFDI timbrado':'Nueva factura'}</span>
              <button onClick={() => setModalOpen(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'#9ca3af',lineHeight:1}}>✕</button>
            </div>

            {timbrado ? (
              <div style={{padding:32,textAlign:'center'}}>
                <div style={{fontSize:48,marginBottom:16}}>✅</div>
                <h2 style={{fontSize:20,fontWeight:600,color:'#1f2937',marginBottom:8}}>CFDI timbrado exitosamente</h2>
                <p style={{fontSize:13,color:'#6b7280',marginBottom:8}}>La factura fue registrada y esta lista para descargar</p>
                <p style={{fontSize:11,color:'#9ca3af',fontFamily:'monospace',marginBottom:24}}>UUID: {ultimoUUID}</p>
                <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                  <button onClick={resetModal} style={{padding:'10px 20px',background:'#185FA5',color:'white',border:'none',borderRadius:10,fontSize:13,fontWeight:500,cursor:'pointer'}}>Nueva factura</button>
                  <button onClick={() => setModalOpen(false)} style={{padding:'10px 20px',background:'white',color:'#374151',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:13,fontWeight:500,cursor:'pointer'}}>Cerrar</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{padding:'20px 24px',overflowY:'auto',flex:1}}>

                  <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>Datos del receptor</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div>
                      <label style={labelStyle}>RFC del cliente</label>
                      <input value={cliente.rfc} onChange={e => setCliente(p=>({...p,rfc:e.target.value}))} placeholder="RFC12 o RFC13" style={{...inputStyle,fontFamily:'monospace'}} />
                    </div>
                    <div>
                      <label style={labelStyle}>Nombre / Razon Social</label>
                      <input value={cliente.nombre} onChange={e => setCliente(p=>({...p,nombre:e.target.value}))} placeholder="Nombre completo o razon social" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Regimen fiscal del receptor</label>
                      <select value={cliente.regimen} onChange={e => setCliente(p=>({...p,regimen:e.target.value}))} style={selectStyle}>
                        {regimenes.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Codigo Postal</label>
                      <input value={cliente.cp} onChange={e => setCliente(p=>({...p,cp:e.target.value}))} placeholder="00000" maxLength="5" style={inputStyle} />
                    </div>
                  </div>

                  {esPM && (
                    <div style={{background:'#E6F1FB',border:'0.5px solid #185FA5',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:12,color:'#185FA5',display:'flex',alignItems:'center',gap:8}}>
                      ℹ️ Persona Moral detectada · Se aplicara retencion de ISR (1.25%) automaticamente
                    </div>
                  )}

                  <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12,marginTop:16}}>Datos del comprobante</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
                    <div>
                      <label style={labelStyle}>Uso del CFDI</label>
                      <select value={usoCFDI} onChange={e => setUsoCFDI(e.target.value)} style={selectStyle}>
                        {usosCFDI.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Metodo de pago</label>
                      <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={selectStyle}>
                        {metodosPago.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Forma de pago</label>
                      <select value={formaPago} onChange={e => setFormaPago(e.target.value)} style={selectStyle}>
                        {formasPago.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Tasa de IVA</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:16}}>
                    {tasasIVA.map(t => (
                      <button key={t.label} onClick={() => setTasaIVA(t.valor)}
                        style={{padding:'8px 4px',border:`0.5px solid ${tasaIVA===t.valor?'#185FA5':'#e5e7eb'}`,borderRadius:8,background:tasaIVA===t.valor?'#E6F1FB':'white',cursor:'pointer',fontSize:11,fontWeight:500,color:tasaIVA===t.valor?'#185FA5':'#6b7280',textAlign:'center'}}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div style={{fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Conceptos</div>
                  <table style={{width:'100%',borderCollapse:'collapse',marginBottom:10}}>
                    <thead>
                      <tr>
                        {['Cant.','Descripcion','Valor unitario','Importe',''].map(h => (
                          <th key={h} style={{padding:'6px 8px',textAlign:'left',fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid #e5e7eb'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {conceptos.map((c,i) => (
                        <ConceptoRow key={i} concepto={c} index={i} onChange={actualizarConcepto} onDelete={eliminarConcepto} />
                      ))}
                    </tbody>
                  </table>
                  <button onClick={agregarConcepto} style={{fontSize:12,color:'#185FA5',background:'none',border:'none',cursor:'pointer',padding:'4px 0',marginBottom:16}}>
                    + Agregar concepto
                  </button>

                  <div style={{background:'#f9fafb',borderRadius:10,padding:'14px 16px'}}>
                    {[
                      {lbl:'Subtotal',v:fmt(subtotal)},
                      {lbl:`IVA (${tasaIVA===-1?'Exento':(tasaIVA*100)+'%'})`,v:fmt(iva),color:'#185FA5'},
                      ...(esPM?[{lbl:'Retencion ISR (1.25%)',v:fmt(ret),color:'#A32D2D'}]:[]),
                    ].map(r => (
                      <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'4px 0',borderBottom:'0.5px solid #f3f4f6'}}>
                        <span style={{color:'#6b7280'}}>{r.lbl}</span>
                        <span style={{fontWeight:500,color:r.color||'#1f2937'}}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:8,borderTop:'0.5px solid #e5e7eb'}}>
                      <span style={{fontSize:14,fontWeight:500,color:'#1f2937'}}>Total</span>
                      <span style={{fontSize:20,fontWeight:600,color:'#185FA5'}}>{fmt(total)}</span>
                    </div>
                  </div>

                </div>

                <div style={{padding:'16px 24px',borderTop:'0.5px solid #e5e7eb',display:'flex',gap:10,justifyContent:'flex-end'}}>
                  <button onClick={() => setModalOpen(false)} style={{padding:'10px 20px',background:'white',color:'#374151',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
                    Cancelar
                  </button>
                  <button onClick={() => {
                    setFacturas(prev => [{
                      id:Date.now(), folio:'BORR-'+String(prev.length+1).padStart(3,'0'), uuid:'',
                      cliente:cliente.nombre||'Sin nombre', rfc:cliente.rfc, fecha:new Date().toISOString().split('T')[0],
                      uso:usoCFDI, subtotal, iva, tasaIVA, ret, total, estatus:'borrador', esPM
                    },...prev])
                    setModalOpen(false)
                  }} style={{padding:'10px 20px',background:'white',color:'#374151',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
                    Guardar borrador
                  </button>
                  <button onClick={handleTimbrar} disabled={loading}
                    style={{padding:'10px 20px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'}}>
                    {loading?'Timbrando...':'Timbrar CFDI'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}