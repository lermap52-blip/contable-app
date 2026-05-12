'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Plus, Download, Eye, Mail, Send, ChevronDown, ChevronUp, Upload, AlertCircle } from 'lucide-react'

const ESTADOS_OC = ['Borrador', 'Enviada', 'Recibida y Validada', 'Cancelada']

const ESTADO_COLORS = {
  'Borrador':            { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
  'Enviada':             { bg: '#EFF6FF', color: '#185FA5', border: '#BFDBFE' },
  'Recibida y Validada': { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  'Cancelada':           { bg: '#FCEBEB', color: '#A32D2D', border: '#FECACA' },
}

const CONDICIONES_PAGO = ['Contado', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 60 días', '50% anticipo / 50% entrega']
const FORMAS_PAGO = ['Transferencia electrónica', 'Cheque nominativo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Efectivo']

const ITEM_VACIO = () => ({ desc: '', cant: 1, precio: 0 })

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function folioNuevo(lista) {
  const anio = new Date().getFullYear()
  const num = String((lista.length || 0) + 1).padStart(3, '0')
  return `OC-${anio}-${num}`
}

const WA_ICON = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M11.97 0C5.372 0 0 5.373 0 11.97c0 2.11.553 4.09 1.518 5.808L0 24l6.396-1.482A11.935 11.935 0 0011.97 24C18.568 24 24 18.627 24 12.03 24 5.373 18.568 0 11.97 0zm0 21.818a9.845 9.845 0 01-5.022-1.378l-.36-.214-3.737.98.999-3.648-.235-.374a9.849 9.849 0 01-1.51-5.214c0-5.445 4.43-9.876 9.865-9.876 5.445 0 9.875 4.431 9.875 9.876 0 5.446-4.43 9.848-9.875 9.848z"/>
  </svg>
)

export default function OrdenesCompra() {
  const { empresaId } = useCliente()
  const [ordenes, setOrdenes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState('lista') // lista | nueva | ver
  const [ordenActiva, setOrdenActiva] = useState(null)
  const [filtro, setFiltro] = useState('Todos')
  const [config, setConfig] = useState({})

  // Form nueva OC
  const [proveedorId, setProveedorId] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [rfcProveedor, setRfcProveedor] = useState('')
  const [emailProveedor, setEmailProveedor] = useState('')
  const [telefonoProveedor, setTelefonoProveedor] = useState('')
  const [condicionPago, setCondicionPago] = useState('Contado')
  const [formaPago, setFormaPago] = useState('Transferencia electrónica')
  const [items, setItems] = useState([ITEM_VACIO()])
  const [notas, setNotas] = useState('')
  const [estado, setEstado] = useState('Borrador')
  const [guardando, setGuardando] = useState(false)

  // Conciliación XML
  const [xmlNombre, setXmlNombre] = useState('')
  const [conciliacion, setConciliacion] = useState(null)

  // Asistente IA
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatMsgs, setChatMsgs] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatCargando, setChatCargando] = useState(false)

  useEffect(() => {
    if (empresaId) { cargarOrdenes(); cargarProveedores() }
    const saved = localStorage.getItem('config_app')
    if (saved) setConfig(JSON.parse(saved))
  }, [empresaId])

  const cargarOrdenes = async () => {
    setLoading(true)
    const { data } = await supabase.from('ordenes_compra').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    setOrdenes(data || [])
    setLoading(false)
  }

  const cargarProveedores = async () => {
    const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId).order('nombre')
    setProveedores(data || [])
  }

  // Auto-relleno desde catálogo
  const seleccionarProveedor = (id) => {
    const p = proveedores.find(p => p.id === id)
    if (!p) { setProveedorId(''); return }
    setProveedorId(p.id)
    setProveedor(p.nombre)
    setRfcProveedor(p.rfc || '')
    setEmailProveedor(p.email || '')
    setTelefonoProveedor(p.telefono || '')
  }

  const subtotal = items.reduce((a, i) => a + (Number(i.cant) * Number(i.precio)), 0)
  const requiereElectronico = subtotal > 2000
  const formaInvalida = requiereElectronico && formaPago === 'Efectivo'

  const guardar = async () => {
    if (!empresaId || !proveedor || formaInvalida) return
    setGuardando(true)
    const folio = folioNuevo(ordenes)
    const payload = {
      empresa_id: empresaId,
      proveedor_id: proveedorId || null,
      folio,
      proveedor,
      rfc_proveedor: rfcProveedor,
      email_proveedor: emailProveedor,
      telefono_proveedor: telefonoProveedor,
      condicion_pago: condicionPago,
      forma_pago: formaPago,
      items: JSON.stringify(items),
      total: subtotal,
      notas,
      estado,
      fecha: new Date().toISOString().split('T')[0],
    }
    const { data } = await supabase.from('ordenes_compra').insert(payload).select().single()
    if (data) {
      setOrdenes(prev => [data, ...prev])
      setOrdenActiva(data)
      setModo('ver')
    }
    setGuardando(false)
  }

  const actualizarEstado = async (id, nuevoEstado) => {
    await supabase.from('ordenes_compra').update({ estado: nuevoEstado }).eq('id', id)
    setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o))
    if (ordenActiva?.id === id) setOrdenActiva(prev => ({ ...prev, estado: nuevoEstado }))
  }

  // Conciliación XML — guarda en tabla gastos si coincide
  const leerXML = async (file) => {
    if (!file || !ordenActiva) return
    setXmlNombre(file.name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const doc = new DOMParser().parseFromString(e.target.result, 'text/xml')
        const comp = doc.querySelector('Comprobante') || doc.documentElement
        const totalXML = parseFloat(comp?.getAttribute('Total') || '0')
        const subtotalXML = parseFloat(comp?.getAttribute('SubTotal') || '0')
        const emisor = doc.querySelector('Emisor')?.getAttribute('Nombre') || '—'
        const folioCFDI = comp?.getAttribute('Folio') || '—'
        const uuid = doc.querySelector('TimbreFiscalDigital')?.getAttribute('UUID') || '—'
        const fechaCFDI = comp?.getAttribute('Fecha')?.split('T')[0] || null

        // Separar IVA 16% y 8% desde nodos Traslado
        let iva16 = 0, iva8 = 0
        doc.querySelectorAll('Traslado').forEach(t => {
          const tasa = parseFloat(t.getAttribute('TasaOCuota') || '0')
          const imp = parseFloat(t.getAttribute('Importe') || '0')
          if (Math.abs(tasa - 0.16) < 0.001) iva16 += imp
          else if (Math.abs(tasa - 0.08) < 0.001) iva8 += imp
        })

        const coincide = Math.abs(totalXML - ordenActiva.total) < 1
        const concData = { totalXML, totalOC: ordenActiva.total, diferencia: totalXML - ordenActiva.total, coincide, emisor, folioCFDI, uuid, iva16, iva8, subtotalXML, fechaCFDI }
        setConciliacion(concData)

        if (coincide) {
          // Marcar OC como Recibida y Validada
          await supabase.from('ordenes_compra').update({
            estado: 'Recibida y Validada',
            conciliada: true,
            xml_total: totalXML,
            xml_folio: folioCFDI,
            xml_emisor: emisor,
          }).eq('id', ordenActiva.id)

          setOrdenActiva(prev => ({ ...prev, estado: 'Recibida y Validada', conciliada: true }))
          setOrdenes(prev => prev.map(o => o.id === ordenActiva.id ? { ...o, estado: 'Recibida y Validada', conciliada: true } : o))

          // Guardar en tabla gastos para DIOT
          const mes = new Date().getMonth() + 1
          const anio = new Date().getFullYear()
          await supabase.from('gastos').insert({
            empresa_id: empresaId,
            orden_compra_id: ordenActiva.id,
            proveedor_id: ordenActiva.proveedor_id || null,
            rfc_emisor: ordenActiva.rfc_proveedor,
            nombre_emisor: emisor,
            folio_cfdi: folioCFDI,
            uuid_cfdi: uuid,
            fecha_cfdi: fechaCFDI,
            subtotal: subtotalXML,
            iva_16: iva16,
            iva_8: iva8,
            total: totalXML,
            tipo_tercero: '04',
            tipo_operacion: '85',
            mes,
            anio,
          })
        }
      } catch {
        setConciliacion({ error: 'No se pudo leer el XML. Verifica que sea un CFDI válido.' })
      }
    }
    reader.readAsText(file)
  }

  // Asistente IA
  const enviarChat = async () => {
    if (!chatInput.trim()) return
    const userMsg = { role: 'user', content: chatInput }
    const nuevosMsgs = [...chatMsgs, userMsg]
    setChatMsgs(nuevosMsgs)
    setChatInput('')
    setChatCargando(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Eres un asistente fiscal mexicano especializado en deducciones, CFDI y negociación con proveedores. Contexto del proveedor actual: ${proveedor || ordenActiva?.proveedor || 'no especificado'}. Responde en español, conciso y profesional.`,
          messages: nuevosMsgs,
        }),
      })
      const data = await res.json()
      setChatMsgs(prev => [...prev, { role: 'assistant', content: data.content?.[0]?.text || 'Sin respuesta.' }])
    } catch {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }])
    }
    setChatCargando(false)
  }

  // WhatsApp y Correo
  const enviarWhatsApp = (oc) => {
    const tel = oc.telefono_proveedor?.replace(/\D/g, '')
    if (!tel || tel.length !== 10) { alert('El número no tiene 10 dígitos válidos.'); return }
    const empresa = config.appNombre || 'nuestra empresa'
    const msg = encodeURIComponent(
      `Buen día, le contactamos de parte de ${empresa}.\n\nAdjuntamos la Orden de Compra *${oc.folio}* por un total de *${fmt(oc.total)}*.\nCondición de pago: ${oc.condicion_pago}.\n\nEl PDF con el detalle completo se encuentra adjunto. Quedamos a sus órdenes para cualquier aclaración.`
    )
    window.open(`https://wa.me/521${tel}?text=${msg}`, '_blank')
  }

  const enviarCorreo = (oc) => {
    const empresa = config.appNombre || 'nuestra empresa'
    const asunto = encodeURIComponent(`Orden de Compra ${oc.folio} — ${empresa}`)
    const cuerpo = encodeURIComponent(
      `Estimado proveedor ${oc.proveedor},%0A%0AEsperamos que se encuentre bien.%0A%0AAnexamos la Orden de Compra ${oc.folio} por ${fmt(oc.total)}.%0ACondición de pago: ${oc.condicion_pago}.%0AForma de pago: ${oc.forma_pago}.%0A%0AEl PDF adjunto contiene el detalle completo.%0A%0AQuedamos a sus órdenes para cualquier aclaración.%0A%0AAtentamente,%0A${empresa}`
    )
    window.open(`mailto:${oc.email_proveedor}?subject=${asunto}&body=${cuerpo}`)
  }

  // PDF
  const generarPDF = (oc) => {
    const itemsParsed = JSON.parse(oc.items || '[]')
    const empresa = config.appNombre || 'Audify'
    const { bg, color } = ESTADO_COLORS[oc.estado] || {}
    const html = `
      <html><head><meta charset="utf-8"/><style>
        body{font-family:system-ui,sans-serif;padding:40px;color:#1f2937;font-size:13px;}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e2a4a;padding-bottom:16px;margin-bottom:20px;}
        .logo{width:44px;height:44px;background:#1e2a4a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:700;}
        table{width:100%;border-collapse:collapse;margin:16px 0;}
        th{text-align:left;padding:8px;background:#f8fafc;font-size:11px;border-bottom:1px solid #e5e7eb;}
        td{padding:8px;border-bottom:1px solid #f3f4f6;font-size:12px;}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;}
        .alerta{background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:10px 14px;font-size:12px;color:#C2500A;margin:16px 0;}
        .footer{text-align:center;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin-top:40px;border-top:1px solid #f3f4f6;padding-top:12px;}
      </style></head><body>
        <div class="header">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="logo">${empresa.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-size:16px;font-weight:600;color:#1e2a4a;">${empresa}</div>
              <div style="font-size:11px;color:#6b7280;">Despacho Fiscal y Legal · Matamoros, Tam.</div>
              <div style="font-size:11px;color:#6b7280;">RFC: ${config.rfcExtraido || '—'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:700;color:#1e2a4a;">ORDEN DE COMPRA</div>
            <div style="font-size:13px;font-weight:600;color:#6b7280;font-family:monospace;">${oc.folio}</div>
            <div style="font-size:11px;color:#6b7280;">${fmtFecha(oc.fecha)}</div>
            <div style="margin-top:6px;"><span class="badge" style="background:${bg};color:${color};">${oc.estado}</span></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
          <div>
            <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Proveedor:</div>
            <div style="font-size:13px;font-weight:500;">${oc.proveedor}</div>
            <div style="font-size:11px;color:#6b7280;">RFC: ${oc.rfc_proveedor || '—'}</div>
            ${oc.email_proveedor ? `<div style="font-size:11px;color:#6b7280;">${oc.email_proveedor}</div>` : ''}
          </div>
          <div>
            <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Condiciones:</div>
            <div style="font-size:12px;font-weight:500;">${oc.condicion_pago}</div>
            <div style="font-size:12px;color:#6b7280;">Forma de pago: ${oc.forma_pago}</div>
          </div>
        </div>

        <table>
          <thead><tr>
            <th>Descripción</th>
            <th style="text-align:center;width:60px;">Cant.</th>
            <th style="text-align:right;width:110px;">P. Unitario</th>
            <th style="text-align:right;width:110px;">Importe</th>
          </tr></thead>
          <tbody>
            ${itemsParsed.map(i => `<tr>
              <td>${i.desc}</td>
              <td style="text-align:center;">${i.cant}</td>
              <td style="text-align:right;font-family:monospace;">${fmt(i.precio)}</td>
              <td style="text-align:right;font-family:monospace;">${fmt(Number(i.cant) * Number(i.precio))}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
          <div style="width:220px;border-top:2px solid #1e2a4a;padding-top:10px;">
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:600;">
              <span>Total</span>
              <span style="font-family:monospace;color:#16a34a;">${fmt(oc.total)}</span>
            </div>
          </div>
        </div>

        ${oc.total > 2000 ? `<div class="alerta">⚠️ Deducibilidad: Esta compra supera $2,000 MXN. Requiere pago por medios electrónicos para ser deducible (Art. 27, fracción VIII, LISR).</div>` : ''}
        ${oc.notas ? `<div style="background:#f8fafc;border-radius:8px;padding:12px;font-size:12px;color:#374151;margin-bottom:14px;"><strong>Notas:</strong> ${oc.notas}</div>` : ''}

        <div style="border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#6b7280;">
          La presente Orden de Compra autoriza la adquisición de los bienes/servicios descritos bajo las condiciones indicadas.
        </div>
        <div class="footer">GENERADO POR ${empresa.toUpperCase()}</div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  const ordenesFiltradas = ordenes.filter(o => filtro === 'Todos' || o.estado === filtro)
  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }
  const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', ...extra })
  const inp = { width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', boxSizing: 'border-box' }

  // ── VISTA: NUEVA OC ───────────────────────────────────────────────────────
  if (modo === 'nueva') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setModo('lista')} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Nueva Orden de Compra</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Proveedor */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Proveedor</div>

            {proveedores.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Seleccionar del catálogo</label>
                <select value={proveedorId} onChange={e => seleccionarProveedor(e.target.value)} style={{ ...inp, background: 'white' }}>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — {p.rfc}</option>
                  ))}
                </select>
                {proveedorId && proveedores.find(p => p.id === proveedorId)?.es_efos && (
                  <div style={{ marginTop: 8, background: '#FCEBEB', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#A32D2D' }}>
                    🚨 Este proveedor está marcado como EFOS (Lista 69-B). Las operaciones con él pueden no ser deducibles.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Nombre / Razón Social', proveedor, setProveedor],
                ['RFC', rfcProveedor, setRfcProveedor],
                ['Correo electrónico', emailProveedor, setEmailProveedor],
                ['Teléfono (10 dígitos)', telefonoProveedor, setTelefonoProveedor],
              ].map(([lbl, val, set]) => (
                <div key={lbl}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{lbl}</label>
                  <input value={val} onChange={e => set(e.target.value)} style={inp} />
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Productos / Servicios</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6' }}>Descripción</th>
                  <th style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6', width: 60 }}>Cant.</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6', width: 110 }}>P. Unitario</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6', width: 110 }}>Importe</th>
                  <th style={{ width: 30, borderBottom: '0.5px solid #f3f4f6' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #f9fafb' }}>
                      <input value={item.desc} onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, desc: e.target.value } : it))}
                        placeholder="Descripción del producto o servicio"
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 12, color: '#374151', outline: 'none' }} />
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #f9fafb', textAlign: 'center' }}>
                      <input type="number" value={item.cant} onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, cant: e.target.value } : it))}
                        style={{ width: 50, border: 'none', background: 'transparent', fontSize: 12, color: '#374151', outline: 'none', textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #f9fafb', textAlign: 'right' }}>
                      <input type="number" value={item.precio} onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, precio: e.target.value } : it))}
                        style={{ width: 90, border: 'none', background: 'transparent', fontSize: 12, color: '#374151', outline: 'none', textAlign: 'right', fontFamily: 'monospace' }} />
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #f9fafb', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 500 }}>
                      {fmt(Number(item.cant) * Number(item.precio))}
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #f9fafb', textAlign: 'center' }}>
                      {items.length > 1 && (
                        <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, lineHeight: 1 }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setItems(prev => [...prev, ITEM_VACIO()])} style={btn({ fontSize: 11, marginBottom: 16 })}>
              <Plus size={12} /> Agregar línea
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 220, borderTop: '2px solid #1e2a4a', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
                <span>Total</span>
                <span style={{ fontFamily: 'monospace', color: '#16a34a' }}>{fmt(subtotal)}</span>
              </div>
            </div>

            {requiereElectronico && (
              <div style={{ marginTop: 14, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertCircle size={16} color="#C2500A" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: '#C2500A' }}>
                  <strong>Art. 27, fracción VIII LISR:</strong> Esta compra supera $2,000 MXN. El pago en efectivo no es deducible. Se requiere transferencia electrónica, cheque nominativo o tarjeta.
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Notas / Condiciones adicionales</div>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Ej: Entrega en 5 días hábiles, incluye flete..."
              style={{ ...inp, resize: 'vertical' }} />
          </div>

          {/* Asistente IA */}
          <div style={card}>
            <button onClick={() => setChatAbierto(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🤖 Asistente Fiscal</div>
              {chatAbierto ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
            </button>
            {chatAbierto && (
              <div style={{ marginTop: 12 }}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 120, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
                  {chatMsgs.length === 0 && (
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Pregúntame sobre deducibilidad, redacción de descripciones o condiciones de negociación con este proveedor.</div>
                  )}
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                      <span style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 10, fontSize: 12, background: m.role === 'user' ? '#1e2a4a' : 'white', color: m.role === 'user' ? 'white' : '#374151', border: m.role === 'assistant' ? '0.5px solid #e5e7eb' : 'none', maxWidth: '85%', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                        {m.content}
                      </span>
                    </div>
                  ))}
                  {chatCargando && <div style={{ fontSize: 12, color: '#9ca3af' }}>Escribiendo...</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && enviarChat()}
                    placeholder="Ej: ¿Este gasto es deducible? / Redacta una descripción profesional"
                    style={{ flex: 1, padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                  <button onClick={enviarChat} disabled={chatCargando}
                    style={{ padding: '8px 14px', borderRadius: 8, background: '#1e2a4a', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <Send size={13} /> Enviar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Configuración</div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Condición de pago</label>
              <select value={condicionPago} onChange={e => setCondicionPago(e.target.value)} style={{ ...inp, background: 'white' }}>
                {CONDICIONES_PAGO.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Forma de pago</label>
              <select value={formaPago} onChange={e => setFormaPago(e.target.value)}
                style={{ ...inp, background: 'white', borderColor: formaInvalida ? '#fca5a5' : '#e5e7eb' }}>
                {FORMAS_PAGO.map(f => (
                  <option key={f} disabled={requiereElectronico && f === 'Efectivo'}>{f}</option>
                ))}
              </select>
              {formaInvalida && (
                <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4 }}>
                  ⛔ Efectivo no permitido para montos mayores a $2,000 MXN
                </div>
              )}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total de la OC</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#16a34a' }}>{fmt(subtotal)}</div>
              {requiereElectronico && <div style={{ fontSize: 10, color: '#C2500A', marginTop: 4 }}>⚠ Requiere pago electrónico</div>}
            </div>

            <button onClick={guardar} disabled={guardando || !proveedor || formaInvalida}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: (proveedor && !formaInvalida) ? 'pointer' : 'not-allowed', background: '#1e2a4a', color: 'white', border: 'none', opacity: (proveedor && !formaInvalida) ? 1 : 0.5 }}>
              {guardando ? 'Guardando...' : '💾 Guardar OC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── VISTA: VER OC ─────────────────────────────────────────────────────────
  if (modo === 'ver' && ordenActiva) {
    const oc = ordenActiva
    const itemsParsed = JSON.parse(oc.items || '[]')
    const { bg, color, border } = ESTADO_COLORS[oc.estado] || {}

    return (
      <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setModo('lista'); setConciliacion(null); setXmlNombre('') }} style={btn()}>← Volver</button>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{oc.folio}</div>
          <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{oc.estado}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Preview OC */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #1e2a4a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: '#1e2a4a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>
                    {(config.appNombre || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e2a4a' }}>{config.appNombre || 'Audify'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Despacho Fiscal · Matamoros, Tam.</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1e2a4a' }}>ORDEN DE COMPRA</div>
                  <div style={{ fontSize: 13, color: '#6b7280', fontFamily: 'monospace' }}>{oc.folio}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{fmtFecha(oc.fecha)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Proveedor:</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{oc.proveedor}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>RFC: {oc.rfc_proveedor || '—'}</div>
                  {oc.email_proveedor && <div style={{ fontSize: 11, color: '#6b7280' }}>{oc.email_proveedor}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Condiciones:</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{oc.condicion_pago}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Forma de pago: {oc.forma_pago}</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Descripción', 'Cant.', 'P. Unitario', 'Importe'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Descripción' ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemsParsed.map((item, i) => (
                    <tr key={i} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 13 }}>{item.desc}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right' }}>{item.cant}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.precio)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>{fmt(Number(item.cant) * Number(item.precio))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Total: <span style={{ color: '#16a34a', fontFamily: 'monospace' }}>{fmt(oc.total)}</span></div>
              </div>

              {oc.total > 2000 && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
                  <AlertCircle size={15} color="#C2500A" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: '#C2500A' }}><strong>Deducibilidad:</strong> Requiere pago por medios electrónicos (Art. 27 LISR).</div>
                </div>
              )}

              {oc.notas && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#374151', marginBottom: 14 }}>
                  <strong>Notas:</strong> {oc.notas}
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: 10, color: '#c4c4c4', letterSpacing: '0.1em', borderTop: '0.5px solid #f3f4f6', paddingTop: 10 }}>
                GENERADO POR {(config.appNombre || 'AUDIFY').toUpperCase()}
              </div>
            </div>

            {/* Conciliación XML */}
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Conciliación con CFDI</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1.5px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                <Upload size={16} color="#9ca3af" />
                {xmlNombre || 'Subir XML del CFDI del proveedor'}
                <input type="file" accept=".xml" style={{ display: 'none' }} onChange={e => leerXML(e.target.files[0])} />
              </label>

              {conciliacion && !conciliacion.error && (
                <div style={{ background: conciliacion.coincide ? '#f0fdf4' : '#FCEBEB', border: `1px solid ${conciliacion.coincide ? '#bbf7d0' : '#FECACA'}`, borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: conciliacion.coincide ? '#166534' : '#A32D2D', marginBottom: 10 }}>
                    {conciliacion.coincide ? '✅ Totales coinciden — OC marcada como Recibida y Validada' : '⚠️ Diferencia detectada en los totales'}
                  </div>
                  {[
                    ['Emisor', conciliacion.emisor],
                    ['Folio CFDI', conciliacion.folioCFDI],
                    ['UUID', conciliacion.uuid?.slice(0, 20) + '...'],
                    ['Total OC', fmt(conciliacion.totalOC)],
                    ['Total XML', fmt(conciliacion.totalXML)],
                    ['IVA 16%', fmt(conciliacion.iva16)],
                    ['IVA 8% (fronterizo)', fmt(conciliacion.iva8)],
                    ['Diferencia', fmt(conciliacion.diferencia)],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                      <span style={{ color: '#6b7280' }}>{l}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {conciliacion?.error && (
                <div style={{ background: '#FCEBEB', borderRadius: 8, padding: 12, fontSize: 12, color: '#A32D2D' }}>{conciliacion.error}</div>
              )}
            </div>

            {/* Asistente en vista ver */}
            <div style={card}>
              <button onClick={() => setChatAbierto(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🤖 Asistente Fiscal</div>
                {chatAbierto ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
              </button>
              {chatAbierto && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 120, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
                    {chatMsgs.length === 0 && (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Pídeme que redacte un correo de negociación o resuelve dudas sobre la deducibilidad de este gasto.</div>
                    )}
                    {chatMsgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                        <span style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 10, fontSize: 12, background: m.role === 'user' ? '#1e2a4a' : 'white', color: m.role === 'user' ? 'white' : '#374151', border: m.role === 'assistant' ? '0.5px solid #e5e7eb' : 'none', maxWidth: '85%', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </span>
                      </div>
                    ))}
                    {chatCargando && <div style={{ fontSize: 12, color: '#9ca3af' }}>Escribiendo...</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && enviarChat()}
                      placeholder="Ej: ¿Por qué este gasto no es deducible?"
                      style={{ flex: 1, padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                    <button onClick={enviarChat} disabled={chatCargando}
                      style={{ padding: '8px 14px', borderRadius: 8, background: '#1e2a4a', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <Send size={13} /> Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Estado</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {ESTADOS_OC.map(e => {
                  const ec = ESTADO_COLORS[e]
                  const activo = oc.estado === e
                  return (
                    <button key={e} onClick={() => actualizarEstado(oc.id, e)}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${activo ? ec.border : '#e5e7eb'}`, background: activo ? ec.bg : 'white', color: activo ? ec.color : '#6b7280' }}>
                      {activo ? '● ' : '○ '}{e}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => generarPDF(oc)} style={{ width: '100%', ...btn({ justifyContent: 'center' }) }}>
                  <Download size={14} /> Descargar PDF
                </button>

                <button onClick={() => enviarWhatsApp(oc)}
                  disabled={!oc.telefono_proveedor}
                  title={!oc.telefono_proveedor ? 'Sin número de teléfono' : ''}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: oc.telefono_proveedor ? 'pointer' : 'not-allowed', background: oc.telefono_proveedor ? '#25D366' : '#f3f4f6', color: oc.telefono_proveedor ? 'white' : '#9ca3af', border: 'none', opacity: oc.telefono_proveedor ? 1 : 0.6 }}>
                  <WA_ICON /> Enviar por WhatsApp
                </button>

                <button onClick={() => enviarCorreo(oc)}
                  disabled={!oc.email_proveedor}
                  title={!oc.email_proveedor ? 'Sin correo electrónico' : ''}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: oc.email_proveedor ? 'pointer' : 'not-allowed', background: oc.email_proveedor ? '#185FA5' : '#f3f4f6', color: oc.email_proveedor ? 'white' : '#9ca3af', border: 'none', opacity: oc.email_proveedor ? 1 : 0.6 }}>
                  <Mail size={14} /> Enviar por correo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── VISTA: LISTA ──────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Órdenes de Compra</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Compras y Gastos</div>
        </div>
        <button onClick={() => {
          setModo('nueva'); setProveedorId(''); setProveedor(''); setRfcProveedor(''); setEmailProveedor(''); setTelefonoProveedor(''); setCondicionPago('Contado'); setFormaPago('Transferencia electrónica'); setItems([ITEM_VACIO()]); setNotas(''); setEstado('Borrador')
        }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
          <Plus size={14} /> Nueva OC
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Órdenes</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Todos', ...ESTADOS_OC].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: filtro === f ? '#1e2a4a' : '#f9fafb', color: filtro === f ? 'white' : '#6b7280', fontWeight: filtro === f ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : ordenesFiltradas.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛒</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 }}>Sin órdenes de compra</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Crea tu primera orden de compra</div>
            <button onClick={() => setModo('nueva')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
              <Plus size={13} /> Nueva OC
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Folio', 'Proveedor', 'Condición', 'Forma Pago', 'Total', 'Deducibilidad', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenesFiltradas.map(oc => {
                  const { bg, color, border } = ESTADO_COLORS[oc.estado] || {}
                  return (
                    <tr key={oc.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>{oc.folio}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{oc.proveedor}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{oc.rfc_proveedor || '—'}</div>
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, color: '#6b7280' }}>{oc.condicion_pago}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 11, color: '#6b7280' }}>{oc.forma_pago}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#16a34a' }}>{fmt(oc.total)}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {oc.total > 2000
                          ? <span style={{ background: '#FFF7ED', color: '#C2500A', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>⚠ Electrónico</span>
                          : <span style={{ background: '#F0FDF4', color: '#166534', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>✓ OK</span>}
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>{oc.estado}</span>
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => { setOrdenActiva(oc); setModo('ver'); setChatMsgs([]); setConciliacion(null); setXmlNombre('') }}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151' }}>
                            <Eye size={12} />
                          </button>
                          <button onClick={() => generarPDF(oc)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151' }}>
                            <Download size={12} />
                          </button>
                          {oc.telefono_proveedor && (
                            <button onClick={() => enviarWhatsApp(oc)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '0.5px solid #86efac', background: '#f9fafb', color: '#25D366' }}>
                              <WA_ICON />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}