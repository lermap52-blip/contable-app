'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Plus, Download, Eye, FileText, ChevronDown, ChevronUp, Send } from 'lucide-react'

// ── Constantes ──────────────────────────────────────────────────────────────
const ESTADOS = ['Pendiente', 'En Proceso', 'Esperando Documentación', 'Listo para Facturar']

const ESTADO_COLORS = {
  'Pendiente':                { bg: '#FFF7ED', color: '#C2500A', border: '#FED7AA' },
  'En Proceso':               { bg: '#EFF6FF', color: '#185FA5', border: '#BFDBFE' },
  'Esperando Documentación':  { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
  'Listo para Facturar':      { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
}

const CHECKLISTS = {
  'declaracion mensual': ['Descargar XML del SAT', 'Calcular Impuestos', 'Enviar Pre-declaración al cliente', 'Validar saldo a favor / cargo', 'Presentar declaración'],
  'declaracion anual':   ['Recopilar CFDI del ejercicio', 'Calcular ISR anual', 'Revisar deducciones personales', 'Enviar Pre-declaración', 'Presentar y pagar'],
  'nomina':              ['Validar asistencias', 'Calcular percepciones y deducciones', 'Timbrar recibos', 'Entregar comprobantes'],
  'contabilidad':        ['Clasificar pólizas', 'Conciliar bancos', 'Generar balanza', 'Enviar reporte al cliente'],
}

function getChecklist(descripcion) {
  if (!descripcion) return []
  const lower = descripcion.toLowerCase()
  for (const key of Object.keys(CHECKLISTS)) {
    if (lower.includes(key)) return CHECKLISTS[key].map(t => ({ texto: t, done: false }))
  }
  return []
}

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function diasRestantes(fecha) {
  if (!fecha) return null
  return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
}

// ── Componente principal ────────────────────────────────────────────────────
export default function Pedidos() {
  const { clienteActivo, empresaId } = useCliente()
  const [pedidos, setPedidos] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState('lista') // lista | nuevo | ver
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const [filtro, setFiltro] = useState('Todos')
  const [config, setConfig] = useState({})

  // Form nuevo pedido
  const [cotOrigen, setCotOrigen] = useState(null)
  const [nombreCliente, setNombreCliente] = useState('')
  const [rfcCliente, setRfcCliente] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [items, setItems] = useState([])
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [estado, setEstado] = useState('Pendiente')
  const [checklist, setChecklist] = useState([])
  const [guardando, setGuardando] = useState(false)

  // Asistente IA
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatMsgs, setChatMsgs] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatCargando, setChatCargando] = useState(false)

  useEffect(() => {
    if (empresaId) {
      cargarPedidos()
      cargarCotizaciones()
    }
    const saved = localStorage.getItem('config_app')
    if (saved) setConfig(JSON.parse(saved))
  }, [empresaId, clienteActivo])

  useEffect(() => {
    if (descripcion) {
      const cl = getChecklist(descripcion)
      if (cl.length > 0) setChecklist(cl)
    }
  }, [descripcion])

  const cargarPedidos = async () => {
    setLoading(true)
    let query = supabase.from('pedidos').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (clienteActivo) query = query.eq('cliente_id', clienteActivo.id)
    const { data } = await query
    setPedidos(data || [])
    setLoading(false)
  }

  const cargarCotizaciones = async () => {
    let query = supabase.from('cotizaciones').select('*').eq('empresa_id', empresaId).eq('convertida', false).order('created_at', { ascending: false })
    if (clienteActivo) query = query.eq('cliente_id', clienteActivo.id)
    const { data } = await query
    setCotizaciones(data || [])
  }

  // ── Conversión cotización → pedido ──────────────────────────────────────
  const cargarDesdeCotizacion = (cot) => {
    setCotOrigen(cot)
    setNombreCliente(cot.tipo_cliente === 'generico' ? 'Cliente General' : cot.nombre_cliente)
    setRfcCliente(cot.rfc_cliente)
    const itemsParsed = JSON.parse(cot.items || '[]')
    setItems(itemsParsed)
    const desc = itemsParsed.map(i => i.desc).join(', ')
    setDescripcion(desc)
    setChecklist(getChecklist(desc))
  }

  const subtotal = items.reduce((a, i) => a + (Number(i.cant) * Number(i.precio)), 0)

  const guardar = async () => {
    if (!empresaId) return
    setGuardando(true)
    const payload = {
      empresa_id: empresaId,
      cliente_id: clienteActivo?.id || null,
      cotizacion_id: cotOrigen?.id || null,
      folio_cotizacion: cotOrigen?.folio || null,
      nombre_cliente: nombreCliente,
      rfc_cliente: rfcCliente,
      descripcion,
      items: JSON.stringify(items),
      total: subtotal,
      estado,
      checklist: JSON.stringify(checklist),
      fecha_vencimiento: fechaVencimiento || null,
      fecha: new Date().toISOString().split('T')[0],
    }
    const { data } = await supabase.from('pedidos').insert(payload).select().single()
    if (data) {
      // Marcar cotización origen como convertida
      if (cotOrigen) {
        await supabase.from('cotizaciones').update({ convertida: true }).eq('id', cotOrigen.id)
      }
      setPedidos(prev => [data, ...prev])
      setPedidoActivo(data)
      setModo('ver')
    }
    setGuardando(false)
  }

  const actualizarEstado = async (id, nuevoEstado) => {
    await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p))
    if (pedidoActivo?.id === id) setPedidoActivo(prev => ({ ...prev, estado: nuevoEstado }))
  }

  const actualizarChecklist = async (pedido, idx) => {
    const cl = JSON.parse(pedido.checklist || '[]')
    cl[idx].done = !cl[idx].done
    await supabase.from('pedidos').update({ checklist: JSON.stringify(cl) }).eq('id', pedido.id)
    const updated = { ...pedido, checklist: JSON.stringify(cl) }
    setPedidos(prev => prev.map(p => p.id === pedido.id ? updated : p))
    setPedidoActivo(updated)
  }

  // ── Asistente IA ─────────────────────────────────────────────────────────
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
          system: `Eres un asistente especializado en despachos fiscales y contables mexicanos. 
Ayudas a desglosar servicios contables/fiscales en etapas claras para explicárselas al cliente.
El contexto del pedido actual es: ${descripcion || 'no especificado'}.
Responde siempre en español, de forma concisa y profesional.`,
          messages: nuevosMsgs,
        }),
      })
      const data = await res.json()
      const respuesta = data.content?.[0]?.text || 'No pude generar una respuesta.'
      setChatMsgs(prev => [...prev, { role: 'assistant', content: respuesta }])
    } catch {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: 'Ocurrió un error al conectar con el asistente.' }])
    }
    setChatCargando(false)
  }

  // ── PDF Orden de Servicio ─────────────────────────────────────────────────
  const generarPDF = (pedido) => {
    const itemsParsed = JSON.parse(pedido.items || '[]')
    const checklistParsed = JSON.parse(pedido.checklist || '[]')
    const empresa = config.appNombre || 'Audify'
    const { bg, color } = ESTADO_COLORS[pedido.estado] || {}
    const html = `
      <html><head><meta charset="utf-8"/><style>
        body{font-family:system-ui,sans-serif;padding:40px;color:#1f2937;font-size:13px;}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e2a4a;padding-bottom:16px;margin-bottom:20px;}
        .logo{width:44px;height:44px;background:#1e2a4a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:700;}
        table{width:100%;border-collapse:collapse;margin:16px 0;}
        th{text-align:left;padding:8px;background:#f8fafc;font-size:11px;border-bottom:1px solid #e5e7eb;}
        td{padding:8px;border-bottom:1px solid #f3f4f6;font-size:12px;}
        .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;}
        .check{margin:4px 0;font-size:12px;}
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
            <div style="font-size:18px;font-weight:700;color:#1e2a4a;">ORDEN DE SERVICIO</div>
            <div style="font-size:12px;color:#6b7280;">${fmtFecha(pedido.fecha)}</div>
            ${pedido.folio_cotizacion ? `<div style="font-size:11px;color:#6b7280;">Ref. cotización: ${pedido.folio_cotizacion}</div>` : ''}
            <div style="margin-top:6px;"><span class="badge" style="background:${bg};color:${color};">${pedido.estado}</span></div>
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Cliente:</div>
          <div style="font-size:13px;font-weight:500;">${pedido.nombre_cliente}</div>
          <div style="font-size:11px;color:#6b7280;">RFC: ${pedido.rfc_cliente}</div>
        </div>

        ${pedido.descripcion ? `<div style="margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px;">
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px;">Descripción del servicio:</div>
          <div style="font-size:12px;">${pedido.descripcion}</div>
        </div>` : ''}

        <table>
          <thead><tr><th>Servicio</th><th>Cant.</th><th style="text-align:right;">P. Unitario</th><th style="text-align:right;">Importe</th></tr></thead>
          <tbody>
            ${itemsParsed.map(i => `<tr><td>${i.desc}</td><td>${i.cant}</td><td style="text-align:right;font-family:monospace;">${fmt(i.precio)}</td><td style="text-align:right;font-family:monospace;">${fmt(Number(i.cant)*Number(i.precio))}</td></tr>`).join('')}
          </tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;margin-bottom:20px;">
          <div style="width:200px;border-top:2px solid #1e2a4a;padding-top:8px;">
            <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;">
              <span>Total</span><span style="font-family:monospace;color:#16a34a;">${fmt(pedido.total)}</span>
            </div>
          </div>
        </div>

        ${checklistParsed.length > 0 ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Checklist de cumplimiento</div>
          ${checklistParsed.map(c => `<div class="check">${c.done ? '✅' : '☐'} ${c.texto}</div>`).join('')}
        </div>` : ''}

        ${pedido.fecha_vencimiento ? `<div style="background:#fffbeb;border-radius:8px;padding:8px 12px;font-size:12px;color:#92400E;">
          ⏰ Fecha límite: ${fmtFecha(pedido.fecha_vencimiento)}
        </div>` : ''}

        <div class="footer">ORDEN DE SERVICIO GENERADA POR ${empresa.toUpperCase()}</div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  const pedidosFiltrados = pedidos.filter(p => filtro === 'Todos' || p.estado === filtro)

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }
  const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', ...extra })

  // ── VISTA: NUEVO PEDIDO ──────────────────────────────────────────────────
  if (modo === 'nuevo') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setModo('lista')} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Nuevo pedido</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Conversión desde cotización */}
          {cotizaciones.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Convertir desde cotización</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {cotizaciones.map(cot => (
                  <button key={cot.id} onClick={() => cargarDesdeCotizacion(cot)}
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: `1.5px solid ${cotOrigen?.id === cot.id ? '#1e2a4a' : '#e5e7eb'}`, background: cotOrigen?.id === cot.id ? '#1e2a4a' : 'white', color: cotOrigen?.id === cot.id ? 'white' : '#374151', fontWeight: 500 }}>
                    {cot.folio} · {fmt(cot.total)}
                  </button>
                ))}
              </div>
              {cotOrigen && (
                <div style={{ marginTop: 10, background: '#f0fdf4', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#166534' }}>
                  ✓ Datos cargados desde {cotOrigen.folio}
                </div>
              )}
            </div>
          )}

          {/* Datos del cliente */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Datos del cliente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Nombre / Razón social', nombreCliente, setNombreCliente], ['RFC', rfcCliente, setRfcCliente]].map(([lbl, val, set]) => (
                <div key={lbl}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{lbl}</label>
                  <input value={val} onChange={e => set(e.target.value)}
                    style={{ width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Descripción del servicio</div>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
              placeholder="Ej: Declaración Mensual ISR, Contabilidad..."
              style={{ width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
            {checklist.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Checklist generado automáticamente:</div>
                {checklist.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <input type="checkbox" checked={item.done} onChange={() => setChecklist(prev => prev.map((c, j) => j === i ? { ...c, done: !c.done } : c))} />
                    <span style={{ fontSize: 12, color: '#374151' }}>{item.texto}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Servicios */}
          {items.length > 0 && (
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Servicios</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Descripción','Cant.','P. Unitario','Importe'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Descripción' ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12 }}>{item.desc}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right' }}>{item.cant}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.precio)}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>{fmt(Number(item.cant)*Number(item.precio))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>Total: <span style={{ color: '#16a34a', fontFamily: 'monospace' }}>{fmt(subtotal)}</span></div>
              </div>
            </div>
          )}

          {/* Asistente IA */}
          <div style={card}>
            <button onClick={() => setChatAbierto(v => !v)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🤖 Asistente de redacción</div>
              {chatAbierto ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
            </button>
            {chatAbierto && (
              <div style={{ marginTop: 12 }}>
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 120, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
                  {chatMsgs.length === 0 && (
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Pregúntame cómo desglosar el servicio, qué etapas incluir, o cómo explicárselo al cliente.</div>
                  )}
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                      <span style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 10, fontSize: 12, background: m.role === 'user' ? '#1e2a4a' : 'white', color: m.role === 'user' ? 'white' : '#374151', border: m.role === 'assistant' ? '0.5px solid #e5e7eb' : 'none', maxWidth: '85%', textAlign: 'left' }}>
                        {m.content}
                      </span>
                    </div>
                  ))}
                  {chatCargando && <div style={{ fontSize: 12, color: '#9ca3af' }}>Escribiendo...</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && enviarChat()}
                    placeholder="Ej: ¿Cómo explico la declaración mensual al cliente?"
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
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Estado inicial</label>
              <select value={estado} onChange={e => setEstado(e.target.value)}
                style={{ width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', background: 'white' }}>
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Fecha límite</label>
              <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)}
                style={{ width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {subtotal > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total del pedido</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#16a34a' }}>{fmt(subtotal)}</div>
              </div>
            )}

            <button onClick={guardar} disabled={guardando || !nombreCliente}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: nombreCliente ? 'pointer' : 'not-allowed', background: '#1e2a4a', color: 'white', border: 'none', opacity: nombreCliente ? 1 : 0.5 }}>
              {guardando ? 'Guardando...' : '💾 Guardar pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── VISTA: VER PEDIDO ─────────────────────────────────────────────────────
  if (modo === 'ver' && pedidoActivo) {
    const p = pedidoActivo
    const itemsParsed = JSON.parse(p.items || '[]')
    const checklistParsed = JSON.parse(p.checklist || '[]')
    const dias = diasRestantes(p.fecha_vencimiento)
    const urgente = dias !== null && dias <= 3 && dias >= 0
    const vencido = dias !== null && dias < 0
    const { bg, color, border } = ESTADO_COLORS[p.estado] || {}
    const progreso = checklistParsed.length > 0 ? Math.round((checklistParsed.filter(c => c.done).length / checklistParsed.length) * 100) : null

    return (
      <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setModo('lista')} style={btn()}>← Volver</button>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{p.nombre_cliente}</div>
          <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{p.estado}</span>
        </div>

        {/* Alerta urgencia */}
        {urgente && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#C2500A', fontWeight: 500 }}>
            ⚠️ Este pedido vence en {dias} día{dias !== 1 ? 's' : ''}. ¡Atención requerida!
          </div>
        )}
        {vencido && (
          <div style={{ background: '#FCEBEB', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#A32D2D', fontWeight: 500 }}>
            🚨 Este pedido venció hace {Math.abs(dias)} día{Math.abs(dias) !== 1 ? 's' : ''}.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          {/* Detalle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingBottom: 14, borderBottom: '2px solid #1e2a4a' }}>
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
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e2a4a' }}>ORDEN DE SERVICIO</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{fmtFecha(p.fecha)}</div>
                  {p.folio_cotizacion && <div style={{ fontSize: 10, color: '#9ca3af' }}>Ref: {p.folio_cotizacion}</div>}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Cliente:</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre_cliente}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>RFC: {p.rfc_cliente}</div>
              </div>

              {p.descripcion && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: 12, color: '#374151' }}>
                  {p.descripcion}
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Servicio','Cant.','P. Unitario','Importe'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Servicio' ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemsParsed.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 13 }}>{item.desc}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right' }}>{item.cant}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.precio)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>{fmt(Number(item.cant)*Number(item.precio))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Total: <span style={{ color: '#16a34a', fontFamily: 'monospace' }}>{fmt(p.total)}</span></div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 10, color: '#c4c4c4', letterSpacing: '0.1em', borderTop: '0.5px solid #f3f4f6', paddingTop: 10 }}>
                ORDEN DE SERVICIO GENERADA POR {(config.appNombre || 'AUDIFY').toUpperCase()}
              </div>
            </div>

            {/* Checklist */}
            {checklistParsed.length > 0 && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Checklist de cumplimiento</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>{progreso}%</span>
                </div>
                <div style={{ background: '#f3f4f6', borderRadius: 999, height: 6, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ height: 6, borderRadius: 999, background: '#16a34a', width: `${progreso}%`, transition: 'width 0.3s' }} />
                </div>
                {checklistParsed.map((item, i) => (
                  <div key={i} onClick={() => actualizarChecklist(p, i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: item.done ? '#f0fdf4' : '#fafafa', border: `0.5px solid ${item.done ? '#bbf7d0' : '#f3f4f6'}` }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${item.done ? '#16a34a' : '#d1d5db'}`, background: item.done ? '#16a34a' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {item.done && <span style={{ color: 'white', fontSize: 11 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: item.done ? '#166534' : '#374151', textDecoration: item.done ? 'line-through' : 'none' }}>{item.texto}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Asistente en vista ver */}
            <div style={card}>
              <button onClick={() => setChatAbierto(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🤖 Asistente de redacción</div>
                {chatAbierto ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
              </button>
              {chatAbierto && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 120, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
                    {chatMsgs.length === 0 && (
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Pregúntame cómo desglosar o explicar este servicio al cliente.</div>
                    )}
                    {chatMsgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                        <span style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 10, fontSize: 12, background: m.role === 'user' ? '#1e2a4a' : 'white', color: m.role === 'user' ? 'white' : '#374151', border: m.role === 'assistant' ? '0.5px solid #e5e7eb' : 'none', maxWidth: '85%', textAlign: 'left' }}>
                          {m.content}
                        </span>
                      </div>
                    ))}
                    {chatCargando && <div style={{ fontSize: 12, color: '#9ca3af' }}>Escribiendo...</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && enviarChat()}
                      placeholder="¿Cómo explico este servicio?"
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
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Estado del pedido</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {ESTADOS.map(e => {
                  const ec = ESTADO_COLORS[e]
                  const activo = p.estado === e
                  return (
                    <button key={e} onClick={() => actualizarEstado(p.id, e)}
                      style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', border: `1.5px solid ${activo ? ec.border : '#e5e7eb'}`, background: activo ? ec.bg : 'white', color: activo ? ec.color : '#6b7280' }}>
                      {activo ? '● ' : '○ '}{e}
                    </button>
                  )
                })}
              </div>

              {p.fecha_vencimiento && (
                <div style={{ background: urgente || vencido ? '#FCEBEB' : '#fffbeb', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: urgente || vencido ? '#A32D2D' : '#92400E' }}>
                  ⏰ Vence: {fmtFecha(p.fecha_vencimiento)}{dias !== null && dias >= 0 ? ` · ${dias}d` : ''}
                </div>
              )}

              <button onClick={() => generarPDF(p)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...btn({ justifyContent: 'center', width: '100%' }) }}>
                <Download size={14} /> Descargar Orden PDF
              </button>

              {p.estado === 'Listo para Facturar' && (
                <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: 'white', border: 'none', marginTop: 8 }}>
                  <FileText size={14} /> Crear factura
                </button>
              )}
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
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Pedidos</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{clienteActivo ? clienteActivo.nombre : 'Mi Despacho'}</div>
        </div>
        <button onClick={() => { setModo('nuevo'); setCotOrigen(null); setNombreCliente(''); setRfcCliente(''); setDescripcion(''); setItems([]); setChecklist([]); setFechaVencimiento(''); setEstado('Pendiente') }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
          <Plus size={14} /> Nuevo pedido
        </button>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pedidos</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Todos', ...ESTADOS].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: filtro === f ? '#1e2a4a' : '#f9fafb', color: filtro === f ? 'white' : '#6b7280', fontWeight: filtro === f ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 }}>Sin pedidos</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Crea un pedido o conviértelo desde una cotización</div>
            <button onClick={() => setModo('nuevo')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
              <Plus size={13} /> Nuevo pedido
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Cliente','Descripción','Vencimiento','Total','Estado','Checklist','Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map(p => {
                  const { bg, color, border } = ESTADO_COLORS[p.estado] || {}
                  const dias = diasRestantes(p.fecha_vencimiento)
                  const urgente = dias !== null && dias <= 3 && dias >= 0
                  const vencido = dias !== null && dias < 0
                  const cl = JSON.parse(p.checklist || '[]')
                  const prog = cl.length > 0 ? Math.round((cl.filter(c => c.done).length / cl.length) * 100) : null

                  return (
                    <tr key={p.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{p.nombre_cliente}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{p.rfc_cliente}</div>
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, color: '#6b7280', maxWidth: 180 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion || '—'}</div>
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {p.fecha_vencimiento ? (
                          <span style={{ background: vencido ? '#FCEBEB' : urgente ? '#FFF7ED' : '#fffbeb', color: vencido ? '#A32D2D' : urgente ? '#C2500A' : '#92400E', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                            {vencido ? `Venció ${fmtFecha(p.fecha_vencimiento)}` : urgente ? `⚠ ${dias}d` : `${dias}d · ${fmtFecha(p.fecha_vencimiento)}`}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#16a34a' }}>{fmt(p.total)}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>{p.estado}</span>
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        {prog !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                              <div style={{ height: 5, borderRadius: 999, background: prog === 100 ? '#16a34a' : '#185FA5', width: `${prog}%` }} />
                            </div>
                            <span style={{ fontSize: 10, color: '#6b7280', minWidth: 28 }}>{prog}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => { setPedidoActivo(p); setModo('ver'); setChatMsgs([]); setDescripcion(p.descripcion || '') }} style={btn({ padding: '4px 8px' })}><Eye size={12} /></button>
                          <button onClick={() => generarPDF(p)} style={btn({ padding: '4px 8px' })}><Download size={12} /></button>
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