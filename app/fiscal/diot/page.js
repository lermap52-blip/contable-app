'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Download, RefreshCw, Upload, AlertCircle } from 'lucide-react'

function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TIPOS_TERCERO = {
  '04': 'Proveedor Nacional',
  '05': 'Proveedor Extranjero',
  '06': 'Cliente Nacional',
  '15': 'Arrendadora de Bienes',
  '17': 'Prestador de Servicios Profesionales',
}

export default function DIOT() {
  const { empresaId } = useCliente()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [empresaRegimen, setEmpresaRegimen] = useState('General')
  const [config, setConfig] = useState({})

  // Carga manual de XML adicionales
  const [xmlsAdicionales, setXmlsAdicionales] = useState([])
  const [procesandoXml, setProcesandoXml] = useState(false)

  // Vista detalle por proveedor
  const [proveedorDetalle, setProveedorDetalle] = useState(null)

  useEffect(() => {
    if (empresaId) { cargarGastos(); cargarEmpresa() }
    const saved = localStorage.getItem('config_app')
    if (saved) setConfig(JSON.parse(saved))
  }, [empresaId, mes, anio])

  const cargarEmpresa = async () => {
    const { data } = await supabase.from('empresas').select('regimen').eq('id', empresaId).single()
    if (data) setEmpresaRegimen(data.regimen || 'General')
  }

  const cargarGastos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('gastos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('anio', anio)
      .order('created_at', { ascending: false })
    setGastos(data || [])
    setLoading(false)
  }

  // Cargar XML adicional manualmente (sin necesidad de OC)
  const cargarXMLAdicional = async (file) => {
    if (!file) return
    setProcesandoXml(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const doc = new DOMParser().parseFromString(e.target.result, 'text/xml')
        const comp = doc.querySelector('Comprobante') || doc.documentElement
        const totalXML = parseFloat(comp?.getAttribute('Total') || '0')
        const subtotalXML = parseFloat(comp?.getAttribute('SubTotal') || '0')
        const emisor = doc.querySelector('Emisor')?.getAttribute('Nombre') || '—'
        const rfcEmisor = doc.querySelector('Emisor')?.getAttribute('Rfc') || ''
        const folioCFDI = comp?.getAttribute('Folio') || '—'
        const uuid = doc.querySelector('TimbreFiscalDigital')?.getAttribute('UUID') || '—'
        const fechaCFDI = comp?.getAttribute('Fecha')?.split('T')[0] || null

        let iva16 = 0, iva8 = 0
        doc.querySelectorAll('Traslado').forEach(t => {
          const tasa = parseFloat(t.getAttribute('TasaOCuota') || '0')
          const imp = parseFloat(t.getAttribute('Importe') || '0')
          if (Math.abs(tasa - 0.16) < 0.001) iva16 += imp
          else if (Math.abs(tasa - 0.08) < 0.001) iva8 += imp
        })

        // Verificar si ya existe este UUID
        const { data: existe } = await supabase.from('gastos').select('id').eq('uuid_cfdi', uuid).eq('empresa_id', empresaId)
        if (existe && existe.length > 0) {
          alert(`Este CFDI (${uuid.slice(0, 16)}...) ya fue registrado anteriormente.`)
          setProcesandoXml(false)
          return
        }

        const { data } = await supabase.from('gastos').insert({
          empresa_id: empresaId,
          rfc_emisor: rfcEmisor,
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
        }).select().single()

        if (data) {
          setGastos(prev => [data, ...prev])
          setXmlsAdicionales(prev => [...prev, { nombre: file.name, emisor, total: totalXML, uuid: uuid.slice(0, 16) + '...' }])
        }
      } catch {
        alert('No se pudo leer el XML. Verifica que sea un CFDI válido.')
      }
      setProcesandoXml(false)
    }
    reader.readAsText(file)
  }

  const eliminarGasto = async (id) => {
    if (!confirm('¿Eliminar este registro de la DIOT?')) return
    await supabase.from('gastos').delete().eq('id', id)
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  // Agrupar por RFC para tabla DIOT
  const diotAgrupado = gastos.reduce((acc, g) => {
    const key = g.rfc_emisor || 'XAXX010101000'
    if (!acc[key]) {
      acc[key] = {
        rfc: key,
        nombre: g.nombre_emisor || '—',
        tipo_tercero: g.tipo_tercero || '04',
        tipo_operacion: g.tipo_operacion || '85',
        subtotal: 0,
        iva16: 0,
        iva8: 0,
        ivaExento: 0,
        total: 0,
        cfdi: [],
      }
    }
    acc[key].subtotal += Number(g.subtotal || 0)
    acc[key].iva16 += Number(g.iva_16 || 0)
    acc[key].iva8 += Number(g.iva_8 || 0)
    acc[key].total += Number(g.total || 0)
    acc[key].cfdi.push(g)
    return acc
  }, {})

  const filasDIOT = Object.values(diotAgrupado)

  const totales = filasDIOT.reduce((a, r) => ({
    subtotal: a.subtotal + r.subtotal,
    iva16: a.iva16 + r.iva16,
    iva8: a.iva8 + r.iva8,
    total: a.total + r.total,
  }), { subtotal: 0, iva16: 0, iva8: 0, total: 0 })

  // Generar archivo .txt DIM con pipes
  const generarTXT = () => {
    const lineas = filasDIOT.map(r => [
      r.tipo_tercero,          // Tipo de tercero
      r.tipo_operacion,        // Tipo de operación
      r.rfc,                   // RFC
      '',                      // CURP (vacío para morales)
      r.nombre.toUpperCase(),  // Nombre
      '',                      // País (vacío nacional)
      '',                      // Nacionalidad
      Math.round(r.subtotal).toString(),  // Valor actos o actividades
      '0',                     // IVA pagado no acreditable exento
      Math.round(r.iva16).toString(),     // IVA pagado 16%
      '0',                     // IVA no deducible 16%
      '0',                     // IVA no acreditable 16%
      Math.round(r.iva8).toString(),      // IVA pagado 8%
      '0',                     // IVA no deducible 8%
      '0',                     // IVA no acreditable 8%
      '0',                     // IVA 0%
      '0',                     // IVA retenido
      '0',                     // IVA por importaciones exentas
    ].join('|'))

    const contenido = lineas.join('\n')
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `DIOT_${anio}_${String(mes).padStart(2, '0')}_${config.appNombre || 'empresa'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Generar reporte PDF
  const generarPDF = () => {
    const empresa = config.appNombre || 'Audify'
    const html = `
      <html><head><meta charset="utf-8"/><style>
        body{font-family:system-ui,sans-serif;padding:40px;color:#1f2937;font-size:12px;}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e2a4a;padding-bottom:16px;margin-bottom:20px;}
        .logo{width:40px;height:40px;background:#1e2a4a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;font-weight:700;}
        table{width:100%;border-collapse:collapse;margin:16px 0;font-size:11px;}
        th{text-align:left;padding:7px 8px;background:#f8fafc;font-size:10px;border-bottom:1px solid #e5e7eb;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;}
        td{padding:7px 8px;border-bottom:1px solid #f3f4f6;}
        .total-row{font-weight:700;background:#f8fafc;}
        .footer{text-align:center;font-size:10px;color:#9ca3af;letter-spacing:0.1em;margin-top:40px;border-top:1px solid #f3f4f6;padding-top:12px;}
      </style></head><body>
        <div class="header">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="logo">${empresa.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-size:15px;font-weight:600;color:#1e2a4a;">${empresa}</div>
              <div style="font-size:11px;color:#6b7280;">RFC: ${config.rfcExtraido || '—'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:700;color:#1e2a4a;">REPORTE DIOT</div>
            <div style="font-size:12px;color:#6b7280;">${MESES[mes - 1]} ${anio}</div>
            <div style="font-size:11px;color:#6b7280;">${filasDIOT.length} proveedores · ${gastos.length} CFDIs</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>RFC</th>
              <th>Nombre</th>
              <th style="text-align:right;">Subtotal</th>
              <th style="text-align:right;">IVA 16%</th>
              <th style="text-align:right;">IVA 8%</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filasDIOT.map(r => `
              <tr>
                <td>${r.tipo_tercero}/${r.tipo_operacion}</td>
                <td style="font-family:monospace;font-size:10px;">${r.rfc}</td>
                <td>${r.nombre}</td>
                <td style="text-align:right;font-family:monospace;">${fmt(r.subtotal)}</td>
                <td style="text-align:right;font-family:monospace;color:#185FA5;">${fmt(r.iva16)}</td>
                <td style="text-align:right;font-family:monospace;color:#92400E;">${r.iva8 > 0 ? fmt(r.iva8) : '—'}</td>
                <td style="text-align:right;font-family:monospace;font-weight:600;color:#16a34a;">${fmt(r.total)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3">TOTALES</td>
              <td style="text-align:right;font-family:monospace;">${fmt(totales.subtotal)}</td>
              <td style="text-align:right;font-family:monospace;color:#185FA5;">${fmt(totales.iva16)}</td>
              <td style="text-align:right;font-family:monospace;color:#92400E;">${fmt(totales.iva8)}</td>
              <td style="text-align:right;font-family:monospace;color:#16a34a;">${fmt(totales.total)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:24px;">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;margin-bottom:8px;">CFDIs incluidos</div>
          <table>
            <thead><tr><th>RFC Emisor</th><th>Nombre</th><th>Folio CFDI</th><th>Fecha</th><th style="text-align:right;">Total</th><th style="text-align:right;">IVA 16%</th><th style="text-align:right;">IVA 8%</th></tr></thead>
            <tbody>
              ${gastos.map(g => `<tr>
                <td style="font-family:monospace;font-size:10px;">${g.rfc_emisor || '—'}</td>
                <td>${g.nombre_emisor || '—'}</td>
                <td style="font-family:monospace;font-size:10px;">${g.folio_cfdi || '—'}</td>
                <td>${fmtFecha(g.fecha_cfdi)}</td>
                <td style="text-align:right;font-family:monospace;">${fmt(g.total)}</td>
                <td style="text-align:right;font-family:monospace;color:#185FA5;">${fmt(g.iva_16)}</td>
                <td style="text-align:right;font-family:monospace;color:#92400E;">${g.iva_8 > 0 ? fmt(g.iva_8) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">REPORTE DIOT GENERADO POR ${empresa.toUpperCase()}</div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.print()
  }

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }
  const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', ...extra })

  // ── Pantalla RESICO ───────────────────────────────────────────────────────
  if (empresaRegimen?.includes('626') || empresaRegimen?.toLowerCase().includes('resico')) return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>DIOT</div>
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 40, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚖️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>Módulo no requerido para este régimen</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.7 }}>
          Las personas físicas en el Régimen Simplificado de Confianza (RESICO) están exentas de presentar la Declaración Informativa de Operaciones con Terceros.
        </div>
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '14px 18px', fontSize: 12, color: '#185FA5', textAlign: 'left', lineHeight: 1.7 }}>
          <strong>Fundamento legal:</strong> Regla 3.13.19 de la Resolución Miscelánea Fiscal (RMF) vigente. Los contribuyentes del Régimen Simplificado de Confianza no están obligados a presentar la DIOT, al tributar bajo un esquema simplificado que no genera las obligaciones del Título II o IV de la LISR que determinan cuota de IVA trasladado o acreditable en los términos que exige la declaración informativa.
        </div>
        <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#6b7280', textAlign: 'left' }}>
          Si cambiaste de régimen fiscal, actualiza el perfil de la empresa en Configuración para habilitar este módulo.
        </div>
      </div>
    </div>
  )

  // ── Vista detalle proveedor ───────────────────────────────────────────────
  if (proveedorDetalle) {
    const fila = diotAgrupado[proveedorDetalle]
    return (
      <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setProveedorDetalle(null)} style={btn()}>← Volver</button>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{fila?.nombre}</div>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 20 }}>{proveedorDetalle}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>CFDIs de este proveedor — {MESES[mes - 1]} {anio}</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    {['Folio CFDI', 'Fecha', 'Subtotal', 'IVA 16%', 'IVA 8%', 'Total', ''].map(h => (
                      <th key={h} style={{ textAlign: h === 'Folio CFDI' || h === '' ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 10px', borderBottom: '0.5px solid #f3f4f6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fila?.cfdi.map((g, i) => (
                    <tr key={i} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontFamily: 'monospace', fontSize: 11 }}>{g.folio_cfdi || '—'}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right' }}>{fmtFecha(g.fecha_cfdi)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(g.subtotal)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#185FA5' }}>{fmt(g.iva_16)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', color: '#92400E' }}>{g.iva_8 > 0 ? fmt(g.iva_8) : '—'}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, textAlign: 'right', fontFamily: 'monospace', fontWeight: 500, color: '#16a34a' }}>{fmt(g.total)}</td>
                      <td style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'center' }}>
                        <button onClick={() => eliminarGasto(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Datos DIOT</div>
            {[
              ['Tipo tercero', `${fila?.tipo_tercero} — ${TIPOS_TERCERO[fila?.tipo_tercero] || '—'}`],
              ['Tipo operación', fila?.tipo_operacion],
              ['RFC', fila?.rfc],
              ['CFDIs', fila?.cfdi.length + ' comprobantes'],
            ].map(([l, v]) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 500, fontFamily: l === 'RFC' ? 'monospace' : 'inherit' }}>{v}</div>
              </div>
            ))}
            <div style={{ borderTop: '0.5px solid #f3f4f6', paddingTop: 12, marginTop: 4 }}>
              {[['Subtotal', fmt(fila?.subtotal), '#374151'], ['IVA 16%', fmt(fila?.iva16), '#185FA5'], ['IVA 8%', fila?.iva8 > 0 ? fmt(fila?.iva8) : '—', '#92400E'], ['Total', fmt(fila?.total), '#16a34a']].map(([l, v, color]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: '0.5px solid #f9fafb' }}>
                  <span style={{ color: '#6b7280' }}>{l}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500, color }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vista principal ───────────────────────────────────────────────────────
  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>DIOT</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Declaración Informativa de Operaciones con Terceros</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={cargarGastos} style={btn()}>
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={generarPDF} disabled={filasDIOT.length === 0}
            style={{ ...btn(), opacity: filasDIOT.length > 0 ? 1 : 0.5, cursor: filasDIOT.length > 0 ? 'pointer' : 'not-allowed' }}>
            <Download size={13} /> Reporte PDF
          </button>
          <button onClick={generarTXT} disabled={filasDIOT.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: filasDIOT.length > 0 ? 'pointer' : 'not-allowed', background: '#1e2a4a', color: 'white', border: 'none', opacity: filasDIOT.length > 0 ? 1 : 0.5 }}>
            <Download size={14} /> Exportar .txt DIM
          </button>
        </div>
      </div>

      {/* Filtros mes/año */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Mes</label>
            <select value={mes} onChange={e => setMes(Number(e.target.value))}
              style={{ padding: '7px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none', background: 'white' }}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Año</label>
            <select value={anio} onChange={e => setAnio(Number(e.target.value))}
              style={{ padding: '7px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none', background: 'white' }}>
              {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Subir XML adicional */}
          <div style={{ marginLeft: 'auto' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', border: '1.5px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#6b7280', background: 'white' }}>
              <Upload size={14} color="#9ca3af" />
              {procesandoXml ? 'Procesando...' : 'Subir XML adicional'}
              <input type="file" accept=".xml" style={{ display: 'none' }} onChange={e => cargarXMLAdicional(e.target.files[0])} disabled={procesandoXml} />
            </label>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Período activo</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{MESES[mes - 1]} {anio}</div>
          </div>
        </div>

        {xmlsAdicionales.length > 0 && (
          <div style={{ marginTop: 12, borderTop: '0.5px solid #f3f4f6', paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>XMLs subidos manualmente en esta sesión:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {xmlsAdicionales.map((x, i) => (
                <span key={i} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 20, fontSize: 11 }}>
                  ✓ {x.emisor} · {fmt(x.total)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          ['Proveedores', filasDIOT.length + ' registros', '#185FA5', '#EFF6FF'],
          ['Subtotal', fmt(totales.subtotal), '#166534', '#F0FDF4'],
          ['IVA 16%', fmt(totales.iva16), '#185FA5', '#EFF6FF'],
          ['IVA 8% (fronterizo)', fmt(totales.iva8), '#92400E', '#FFFBEB'],
        ].map(([lbl, val, color, bg]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lbl}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Alerta IVA 8% */}
      {totales.iva8 > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#92400E' }}>
          <AlertCircle size={15} color="#92400E" />
          Se detectó IVA al 8% (Estímulo Región Fronteriza Norte). Estos registros se reportan en columna separada en el archivo DIM.
        </div>
      )}

      {/* Tabla DIOT agrupada por proveedor */}
      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tabla DIOT — {MESES[mes - 1]} {anio}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Haz clic en un proveedor para ver sus CFDIs</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : filasDIOT.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 }}>Sin datos para este período</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
              Los gastos se agregan automáticamente al conciliar XMLs en Órdenes de Compra, o puedes subir XMLs manualmente arriba.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Tipo Tercero', 'Tipo Op.', 'RFC', 'Nombre', 'CFDIs', 'Subtotal', 'IVA 16%', 'IVA 8%', 'Total'].map(h => (
                    <th key={h} style={{ textAlign: h === 'RFC' || h === 'Nombre' ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasDIOT.map((r, i) => (
                  <tr key={i}
                    onClick={() => setProveedorDetalle(r.rfc)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right' }}>
                      <span style={{ background: '#EFF6FF', color: '#185FA5', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>{r.tipo_tercero}</span>
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontSize: 12, color: '#6b7280' }}>{r.tipo_operacion}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontFamily: 'monospace', fontSize: 11 }}>{r.rfc}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 12, fontWeight: 500, maxWidth: 200 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</div>
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right' }}>
                      <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{r.cfdi.length}</span>
                    </td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{fmt(r.subtotal)}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#185FA5' }}>{fmt(r.iva16)}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#92400E' }}>{r.iva8 > 0 ? fmt(r.iva8) : '—'}</td>
                    <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{fmt(r.total)}</td>
                  </tr>
                ))}

                {/* Fila totales */}
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={5} style={{ padding: '11px 12px', fontSize: 12, fontWeight: 600, color: '#0f172a' }}>TOTALES — {filasDIOT.length} proveedor{filasDIOT.length !== 1 ? 'es' : ''}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmt(totales.subtotal)}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#185FA5' }}>{fmt(totales.iva16)}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#92400E' }}>{fmt(totales.iva8)}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{fmt(totales.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview formato pipes */}
      {filasDIOT.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Preview — Formato DIM (pipes |)</div>
          <div style={{ background: '#0f172a', borderRadius: 8, padding: 14, overflowX: 'auto' }}>
            <pre style={{ fontSize: 10, color: '#86efac', margin: 0, lineHeight: 2, fontFamily: 'monospace' }}>
              {filasDIOT.slice(0, 5).map(r =>
                `${r.tipo_tercero}|${r.tipo_operacion}|${r.rfc}||${r.nombre.toUpperCase().slice(0, 40)}|||${Math.round(r.subtotal)}|0|${Math.round(r.iva16)}|0|0|${Math.round(r.iva8)}|0|0|0|0|0`
              ).join('\n')}
              {filasDIOT.length > 5 ? `\n... y ${filasDIOT.length - 5} registros más` : ''}
            </pre>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#9ca3af' }}>
            El archivo .txt exportado incluye todos los {filasDIOT.length} registro{filasDIOT.length !== 1 ? 's' : ''} con el formato oficial del sistema DIM del SAT.
          </div>
        </div>
      )}
    </div>
  )
}