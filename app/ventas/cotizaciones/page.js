'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Plus, Download, Eye, FileText, Trash2, Mail, RefreshCw } from 'lucide-react'

const IVA_OPTS = [{ label: '16%', rate: 0.16 }, { label: '8%', rate: 0.08 }, { label: '0%', rate: 0 }, { label: 'Exento', rate: -1 }]

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
  return `COT-${anio}-${num}`
}

function calcVigencia(fecha, dias) {
  if (!fecha || !dias) return null
  const vence = new Date(fecha)
  vence.setDate(vence.getDate() + Number(dias))
  return vence
}

function getEstatus(cot) {
  if (cot.convertida) return 'convertida'
  const vence = calcVigencia(cot.fecha, cot.vigencia_dias)
  if (vence && vence < new Date()) return 'expirada'
  return 'vigente'
}

const WA_ICON = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M11.97 0C5.372 0 0 5.373 0 11.97c0 2.11.553 4.09 1.518 5.808L0 24l6.396-1.482A11.935 11.935 0 0011.97 24C18.568 24 24 18.627 24 12.03 24 5.373 18.568 0 11.97 0zm0 21.818a9.845 9.845 0 01-5.022-1.378l-.36-.214-3.737.98.999-3.648-.235-.374a9.849 9.849 0 01-1.51-5.214c0-5.445 4.43-9.876 9.865-9.876 5.445 0 9.875 4.431 9.875 9.876 0 5.446-4.43 9.848-9.875 9.848z"/>
  </svg>
)

const ITEM_VACIO = () => ({ desc: '', cant: 1, precio: 0 })

export default function Cotizaciones() {
  const { clienteActivo, empresaId } = useCliente()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState('lista') // lista | nueva | ver
  const [cotActiva, setCotActiva] = useState(null)
  const [filtro, setFiltro] = useState('Todas')
  const [tipoCliente, setTipoCliente] = useState('completo')
  const [config, setConfig] = useState({})

  // Form nueva cotización
  const [nombre, setNombre] = useState('')
  const [rfc, setRfc] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [vigencia, setVigencia] = useState(15)
  const [ivaRate, setIvaRate] = useState(0.08)
  const [items, setItems] = useState([ITEM_VACIO()])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (empresaId) cargarCotizaciones()
    const saved = localStorage.getItem('config_app')
    if (saved) setConfig(JSON.parse(saved))
  }, [empresaId, clienteActivo])

  useEffect(() => {
    if (tipoCliente === 'generico') {
      setNombre('Público en General')
      setRfc('XAXX010101000')
      setEmail('')
      setTelefono('')
    } else {
      setNombre(clienteActivo?.nombre || '')
      setRfc(clienteActivo?.rfc || '')
      setEmail(clienteActivo?.email || '')
      setTelefono(clienteActivo?.telefono || '')
    }
  }, [tipoCliente, clienteActivo])

  const cargarCotizaciones = async () => {
    setLoading(true)
    let query = supabase.from('cotizaciones').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (clienteActivo) query = query.eq('cliente_id', clienteActivo.id)
    else query = query.is('cliente_id', null)
    const { data } = await query
    setCotizaciones(data || [])
    setLoading(false)
  }

  const subtotal = items.reduce((a, i) => a + (Number(i.cant) * Number(i.precio)), 0)
  const iva = ivaRate === -1 ? 0 : subtotal * ivaRate
  const total = subtotal + iva

  const guardar = async () => {
    if (!empresaId) return
    setGuardando(true)
    const folio = folioNuevo(cotizaciones)
    const payload = {
      empresa_id: empresaId,
      cliente_id: clienteActivo?.id || null,
      folio,
      nombre_cliente: nombre,
      rfc_cliente: rfc,
      email_cliente: email,
      telefono_cliente: telefono,
      tipo_cliente: tipoCliente,
      items: JSON.stringify(items),
      iva_rate: ivaRate,
      subtotal,
      iva,
      total,
      vigencia_dias: vigencia,
      fecha: new Date().toISOString().split('T')[0],
      convertida: false,
    }
    const { data } = await supabase.from('cotizaciones').insert(payload).select().single()
    if (data) {
      setCotizaciones(prev => [data, ...prev])
      setCotActiva(data)
      setModo('ver')
    }
    setGuardando(false)
  }

  const convertirFactura = async (cot) => {
    await supabase.from('cotizaciones').update({ convertida: true }).eq('id', cot.id)
    setCotizaciones(prev => prev.map(c => c.id === cot.id ? { ...c, convertida: true } : c))
    alert(`Cotización ${cot.folio} lista para facturar. Ve al módulo de Facturas para completar el timbrado.`)
  }

  const enviarWhatsApp = (cot) => {
    const tel = cot.telefono_cliente?.replace(/\D/g, '')
    if (!tel || tel.length !== 10) { alert('El número de teléfono no tiene 10 dígitos válidos.'); return }
    const msg = encodeURIComponent(`Hola ${cot.nombre_cliente}, le envío la cotización ${cot.folio} generada desde Audify por un total de ${fmt(cot.total)}. Quedo a sus órdenes.`)
    window.open(`https://wa.me/521${tel}?text=${msg}`, '_blank')
  }

  const enviarCorreo = (cot) => {
    const items = JSON.parse(cot.items || '[]')
    const desglose = items.map(i => `- ${i.desc}: ${fmt(Number(i.cant) * Number(i.precio))}`).join('%0A')
    const asunto = encodeURIComponent(`Cotización de Servicios - ${cot.folio}`)
    const cuerpo = encodeURIComponent(
      `Estimado/a ${cot.nombre_cliente},%0A%0AEn seguimiento a nuestra plática, le compartimos la cotización de servicios:%0A%0AFolio: ${cot.folio}%0AFecha: ${fmtFecha(cot.fecha)}%0AVigente hasta: ${fmtFecha(calcVigencia(cot.fecha, cot.vigencia_dias))}%0A%0AServicios:%0A${desglose}%0A%0ASubtotal: ${fmt(cot.subtotal)}%0AIVA: ${fmt(cot.iva)}%0ATotal: ${fmt(cot.total)}%0A%0AQuedo a sus órdenes para cualquier aclaración.%0A%0ACotización generada por Audify.`
    )
    window.open(`mailto:${cot.email_cliente}?subject=${asunto}&body=${cuerpo}`)
  }

  const generarPDF = (cot) => {
    const items = JSON.parse(cot.items || '[]')
    const vence = calcVigencia(cot.fecha, cot.vigencia_dias)
    const html = `
      <html><head><meta charset="utf-8"/><style>
        body{font-family:system-ui,sans-serif;padding:40px;color:#1f2937;font-size:13px;}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e2a4a;padding-bottom:16px;margin-bottom:20px;}
        .logo{width:44px;height:44px;background:#1e2a4a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:18px;font-weight:700;}
        table{width:100%;border-collapse:collapse;margin:16px 0;}
        th{text-align:left;padding:8px;background:#f8fafc;font-size:11px;border-bottom:1px solid #e5e7eb;}
        td{padding:8px;border-bottom:1px solid #f3f4f6;font-size:12px;}
        .totales{display:flex;justify-content:flex-end;}
        .totales-box{width:220px;}
        .row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;}
        .total-row{font-size:14px;font-weight:600;border-top:1px solid #1e2a4a;padding-top:8px;margin-top:4px;}
        .footer{text-align:center;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin-top:40px;border-top:1px solid #f3f4f6;padding-top:12px;}
      </style></head><body>
        <div class="header">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="logo">A</div>
            <div>
              <div style="font-size:16px;font-weight:600;color:#1e2a4a;">${config.appNombre || 'Audify'}</div>
              <div style="font-size:11px;color:#6b7280;">Despacho Fiscal y Legal · Matamoros, Tam.</div>
              <div style="font-size:11px;color:#6b7280;">RFC: ${config.rfcExtraido || '—'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:700;color:#1e2a4a;">COTIZACIÓN</div>
            <div style="font-size:12px;color:#6b7280;">${cot.folio}</div>
            <div style="font-size:12px;color:#6b7280;">${fmtFecha(cot.fecha)}</div>
            ${vence ? `<div style="font-size:11px;color:#854F0B;margin-top:4px;">Vigente hasta ${fmtFecha(vence)}</div>` : ''}
          </div>
        </div>
        <div style="margin-bottom:16px;">
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Para:</div>
          <div style="font-size:13px;font-weight:500;">${cot.nombre_cliente}</div>
          <div style="font-size:11px;color:#6b7280;">RFC: ${cot.rfc_cliente} ${cot.email_cliente ? '· ' + cot.email_cliente : ''}</div>
        </div>
        <table>
          <thead><tr><th>Descripción</th><th>Cant.</th><th style="text-align:right;">P. Unitario</th><th style="text-align:right;">Importe</th></tr></thead>
          <tbody>
            ${items.map(i => `<tr><td>${i.desc}</td><td>${i.cant}</td><td style="text-align:right;font-family:monospace;">${fmt(i.precio)}</td><td style="text-align:right;font-family:monospace;">${fmt(Number(i.cant)*Number(i.precio))}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="totales">
          <div class="totales-box">
            <div class="row"><span style="color:#6b7280;">Subtotal</span><span style="font-family:monospace;">${fmt(cot.subtotal)}</span></div>
            <div class="row"><span style="color:#6b7280;">IVA ${cot.iva_rate === -1 ? 'Exento' : (cot.iva_rate * 100).toFixed(0) + '%'}${cot.iva_rate === 0.08 ? ' (zona fronteriza)' : ''}</span><span style="font-family:monospace;color:#185FA5;">${fmt(cot.iva)}</span></div>
            <div class="row total-row"><span>Total</span><span style="font-family:monospace;color:#16a34a;">${fmt(cot.total)}</span></div>
          </div>
        </div>
        <div class="footer">COTIZACIÓN GENERADA POR AUDIFY</div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  const cotsFiltradas = cotizaciones.filter(c => {
    if (filtro === 'Todas') return true
    return getEstatus(c) === filtro.toLowerCase()
  })

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }
  const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', ...extra })

  if (modo === 'nueva') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setModo('lista')} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Nueva cotización</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tipo cliente */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Tipo de receptor</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['completo','👤 Datos completos'],['generico','👥 Público en general']].map(([val, lbl]) => (
                <button key={val} onClick={() => setTipoCliente(val)}
                  style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: tipoCliente === val ? '#1e2a4a' : '#f9fafb', color: tipoCliente === val ? 'white' : '#6b7280' }}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Nombre / Razón social', nombre, setNombre],['RFC', rfc, setRfc],['Correo electrónico', email, setEmail],['Teléfono (10 dígitos)', telefono, setTelefono]].map(([lbl, val, set]) => (
                <div key={lbl}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{lbl}</label>
                  <input value={val} onChange={e => set(e.target.value)} disabled={tipoCliente === 'generico' && (lbl.includes('Nombre') || lbl.includes('RFC'))}
                    style={{ width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', background: tipoCliente === 'generico' && (lbl.includes('Nombre') || lbl.includes('RFC')) ? '#f3f4f6' : 'white', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Config cotización */}
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Folio</label>
                <input value={folioNuevo(cotizaciones)} readOnly style={{ width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#9ca3af', background: '#f9fafb', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Vigencia (días)</label>
                <input type="number" value={vigencia} onChange={e => setVigencia(e.target.value)} style={{ width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* IVA */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Tasa de IVA</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {IVA_OPTS.map(o => (
                  <button key={o.label} onClick={() => setIvaRate(o.rate)}
                    style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: ivaRate === o.rate ? '#1e2a4a' : '#f9fafb', color: ivaRate === o.rate ? 'white' : '#6b7280' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Servicios */}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Servicios</div>
            <table style={{ marginBottom: 10, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6' }}>Descripción</th>
                  <th style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6', width: 60 }}>Cant.</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6', width: 100 }}>P. Unitario</th>
                  <th style={{ textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6', width: 100 }}>Importe</th>
                  <th style={{ width: 30, borderBottom: '0.5px solid #f3f4f6' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 10px', borderBottom: '0.5px solid #f9fafb' }}>
                      <input value={item.desc} onChange={e => setItems(prev => prev.map((it, j) => j === i ? { ...it, desc: e.target.value } : it))}
                        placeholder="Descripción del servicio"
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
              <Plus size={12} /> Agregar servicio
            </button>

            {/* Totales */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 220 }}>
                {[['Subtotal', fmt(subtotal)],
                  [`IVA ${ivaRate === -1 ? 'Exento' : (ivaRate * 100).toFixed(0) + '%'}${ivaRate === 0.08 ? ' (fronterizo)' : ''}`, fmt(iva), '#185FA5'],
                ].map(([lbl, val, color]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '0.5px solid #f3f4f6' }}>
                    <span style={{ color: '#6b7280' }}>{lbl}</span>
                    <span style={{ fontFamily: 'monospace', color: color || '#374151' }}>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 15, fontWeight: 600 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: 'monospace', color: '#16a34a' }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Resumen</div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Cliente</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{nombre || '—'}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{rfc}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total cotización</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#16a34a' }}>{fmt(total)}</div>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#185FA5' }}>
              Vigencia: {vigencia} días · Vence {calcVigencia(new Date().toISOString().split('T')[0], vigencia) ? fmtFecha(calcVigencia(new Date().toISOString().split('T')[0], vigencia)) : '—'}
            </div>
            <button onClick={guardar} disabled={guardando}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
              {guardando ? 'Guardando...' : '💾 Guardar cotización'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  if (modo === 'ver' && cotActiva) {
    const est = getEstatus(cotActiva)
    const vence = calcVigencia(cotActiva.fecha, cotActiva.vigencia_dias)
    const tieneContacto = cotActiva.email_cliente || cotActiva.telefono_cliente
    const itemsParsed = JSON.parse(cotActiva.items || '[]')
    const diasVigencia = vence ? Math.ceil((vence - new Date()) / (1000 * 60 * 60 * 24)) : null

    return (
      <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setModo('lista')} style={btn()}>← Volver</button>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{cotActiva.folio}</div>
          {est === 'vigente' && <span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>✓ Vigente · {diasVigencia}d</span>}
          {est === 'expirada' && <span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Expirada</span>}
          {est === 'convertida' && <span style={{ background: '#E6F1FB', color: '#185FA5', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Convertida a factura</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          {/* PDF Preview */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #1e2a4a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: '#1e2a4a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>A</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e2a4a' }}>{config.appNombre || 'Audify'}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Despacho Fiscal · Matamoros, Tam.</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1e2a4a' }}>COTIZACIÓN</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{cotActiva.folio}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{fmtFecha(cotActiva.fecha)}</div>
                {vence && <div style={{ fontSize: 10, color: est === 'expirada' ? '#A32D2D' : '#854F0B', marginTop: 2 }}>Vigente hasta {fmtFecha(vence)}</div>}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 }}>Para:</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{cotActiva.nombre_cliente}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>RFC: {cotActiva.rfc_cliente} {cotActiva.email_cliente && `· ${cotActiva.email_cliente}`}</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Descripción','Cant.','P. Unitario','Importe'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Cant.' || h === 'P. Unitario' || h === 'Importe' ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '7px 10px', borderBottom: '0.5px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemsParsed.map((item, i) => (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background='#f9fafb'} onMouseLeave={e => e.currentTarget.style.background='white'}>
                    <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 13 }}>{item.desc}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right' }}>{item.cant}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.precio)}</td>
                    <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500 }}>{fmt(Number(item.cant)*Number(item.precio))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <div style={{ width: 220 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '0.5px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontFamily: 'monospace' }}>{fmt(cotActiva.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '0.5px solid #f3f4f6' }}>
                  <span style={{ color: '#6b7280' }}>IVA {cotActiva.iva_rate === -1 ? 'Exento' : (cotActiva.iva_rate * 100).toFixed(0) + '%'}{cotActiva.iva_rate === 0.08 ? ' (fronterizo)' : ''}</span>
                  <span style={{ fontFamily: 'monospace', color: '#185FA5' }}>{fmt(cotActiva.iva)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: 16, fontWeight: 600, borderTop: '2px solid #1e2a4a', marginTop: 4 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: 'monospace', color: '#16a34a' }}>{fmt(cotActiva.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 10, color: '#c4c4c4', letterSpacing: '0.1em', borderTop: '0.5px solid #f3f4f6', paddingTop: 10 }}>
              COTIZACIÓN GENERADA POR AUDIFY
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Acciones</div>

              {est === 'vigente' && (
                <div style={{ background: '#EAF3DE', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#3B6D11', fontWeight: 500 }}>
                  ✓ Vigente · {diasVigencia} días restantes
                </div>
              )}
              {est === 'expirada' && (
                <div style={{ background: '#FCEBEB', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#A32D2D', fontWeight: 500 }}>
                  ⚠ Expirada el {fmtFecha(vence)}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => generarPDF(cotActiva)}
                  style={{ width: '100%', ...btn({ justifyContent: 'center' }) }}>
                  <Download size={14} /> Descargar PDF
                </button>

                <div style={{ position: 'relative' }}>
                  <button onClick={() => enviarWhatsApp(cotActiva)}
                    disabled={!cotActiva.telefono_cliente}
                    title={!cotActiva.telefono_cliente ? 'Faltan datos de contacto' : ''}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: cotActiva.telefono_cliente ? 'pointer' : 'not-allowed', background: cotActiva.telefono_cliente ? '#25D366' : '#f3f4f6', color: cotActiva.telefono_cliente ? 'white' : '#9ca3af', border: 'none', opacity: cotActiva.telefono_cliente ? 1 : 0.6 }}>
                    <WA_ICON /> Enviar por WhatsApp
                  </button>
                </div>

                <button onClick={() => enviarCorreo(cotActiva)}
                  disabled={!cotActiva.email_cliente}
                  title={!cotActiva.email_cliente ? 'Faltan datos de contacto' : ''}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: cotActiva.email_cliente ? 'pointer' : 'not-allowed', background: cotActiva.email_cliente ? '#185FA5' : '#f3f4f6', color: cotActiva.email_cliente ? 'white' : '#9ca3af', border: 'none', opacity: cotActiva.email_cliente ? 1 : 0.6 }}>
                  <Mail size={14} /> Enviar por correo
                </button>

                {!cotActiva.convertida && (
                  <button onClick={() => convertirFactura(cotActiva)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: 'white', border: 'none', marginTop: 4 }}>
                    <FileText size={14} /> Convertir en factura
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Cotizaciones</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{clienteActivo ? clienteActivo.nombre : 'Mi Despacho'}</div>
        </div>
        <button onClick={() => { setModo('nueva'); setItems([ITEM_VACIO()]); setTipoCliente('completo') }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
          <Plus size={14} /> Nueva cotización
        </button>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cotizaciones</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Todas','Vigente','Expirada','Convertida'].map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: filtro === f ? '#1e2a4a' : '#f9fafb', color: filtro === f ? 'white' : '#6b7280', fontWeight: filtro === f ? 500 : 400 }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : cotsFiltradas.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 }}>Sin cotizaciones</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Crea tu primera cotización profesional</div>
            <button onClick={() => setModo('nueva')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
              <Plus size={13} /> Nueva cotización
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Folio','Cliente','Fecha','Vigencia','Total','Estatus','Acciones'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotsFiltradas.map(cot => {
                  const est = getEstatus(cot)
                  const vence = calcVigencia(cot.fecha, cot.vigencia_dias)
                  const dias = vence ? Math.ceil((vence - new Date()) / (1000 * 60 * 60 * 24)) : null
                  const estColors = { vigente: ['#EAF3DE','#3B6D11','Vigente'], expirada: ['#FCEBEB','#A32D2D','Expirada'], convertida: ['#E6F1FB','#185FA5','Convertida'] }
                  const [ebg, ec, el] = estColors[est] || ['#f3f4f6','#6b7280','—']

                  return (
                    <tr key={cot.id}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>{cot.folio}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{cot.nombre_cliente}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{cot.rfc_cliente}</div>
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtFecha(cot.fecha)}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 11 }}>
                        {vence && <span style={{ background: est === 'expirada' ? '#FCEBEB' : '#fffbeb', color: est === 'expirada' ? '#A32D2D' : '#854F0B', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                          {est === 'expirada' ? `Expiró ${fmtFecha(vence)}` : `${dias}d · Vence ${fmtFecha(vence)}`}
                        </span>}
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#16a34a' }}>{fmt(cot.total)}</td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <span style={{ background: ebg, color: ec, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>{el}</span>
                      </td>
                      <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => { setCotActiva(cot); setModo('ver') }} style={btn({ padding: '4px 8px', fontSize: 11 })}><Eye size={12} /></button>
                          <button onClick={() => generarPDF(cot)} style={btn({ padding: '4px 8px', fontSize: 11 })}><Download size={12} /></button>
                          {cot.telefono_cliente && (
                            <button onClick={() => enviarWhatsApp(cot)} style={btn({ padding: '4px 8px', fontSize: 11, color: '#25D366', borderColor: '#86efac' })}><WA_ICON /></button>
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