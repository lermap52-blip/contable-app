'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Plus, Download, Eye, Send, ChevronDown, ChevronUp, Upload, AlertCircle, RefreshCw, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

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

const ESTADO_COLORS = {
  'pendiente':      { bg: '#FFF7ED', color: '#C2500A', border: '#FED7AA', label: 'Pendiente' },
  'programado':     { bg: '#EFF6FF', color: '#185FA5', border: '#BFDBFE', label: 'Programado' },
  'pagado':         { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0', label: 'Pagado' },
  'vencido':        { bg: '#FCEBEB', color: '#A32D2D', border: '#FECACA', label: 'Vencido' },
  'esperando_rep':  { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A', label: 'Esperando REP' },
}

const TIPO_COLORS = {
  'proveedor':  { bg: '#EFF6FF', color: '#185FA5' },
  'nomina':     { bg: '#F5F3FF', color: '#6D28D9' },
  'impuesto':   { bg: '#FCEBEB', color: '#A32D2D' },
  'sat':        { bg: '#FCEBEB', color: '#A32D2D' },
}

export default function CuentasPorPagar() {
  const { empresaId } = useCliente()
  const [cxp, setCxp] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [saldosBanco, setSaldosBanco] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('tablero') // tablero | lista | nueva | ver | bancos | nomina | dashboard
  const [cxpActiva, setCxpActiva] = useState(null)
  const [config, setConfig] = useState({})

  // Form nueva CxP
  const [proveedorId, setProveedorId] = useState('')
  const [nombreProveedor, setNombreProveedor] = useState('')
  const [rfcProveedor, setRfcProveedor] = useState('')
  const [clabeProveedor, setClabeProveedor] = useState('')
  const [tipo, setTipo] = useState('proveedor')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaFactura, setFechaFactura] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [uuidCfdi, setUuidCfdi] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  // XML upload
  const [xmlNombre, setXmlNombre] = useState('')
  const [xmlResult, setXmlResult] = useState(null)
  const [procesandoXml, setProcesandoXml] = useState(false)

  // REP
  const [repNombre, setRepNombre] = useState('')
  const [procesandoRep, setProcesandoRep] = useState(false)

  // Bancos
  const [movimientosBanco, setMovimientosBanco] = useState([])
  const [csvNombre, setCsvNombre] = useState('')
  const [procesandoCsv, setProcesandoCsv] = useState(false)
  const [conciliaciones, setConciliaciones] = useState([])

  // Nómina
  const [nominaPeriodo, setNominaPeriodo] = useState('')
  const [nominaFechaInicio, setNominaFechaInicio] = useState('')
  const [nominaFechaFin, setNominaFechaFin] = useState('')
  const [nominaFechaPago, setNominaFechaPago] = useState('')
  const [nominaSueldos, setNominaSueldos] = useState('')
  const [nominaImss, setNominaImss] = useState('')
  const [nominaInfonavit, setNominaInfonavit] = useState('')
  const [nominaIsr, setNominaIsr] = useState('')
  const [guardandoNomina, setGuardandoNomina] = useState(false)

  // Saldo banco form
  const [nuevoBanco, setNuevoBanco] = useState('')
  const [nuevoCuenta, setNuevoCuenta] = useState('')
  const [nuevoClabe, setNuevoClabe] = useState('')
  const [nuevoSaldo, setNuevoSaldo] = useState('')
  const [guardandoSaldo, setGuardandoSaldo] = useState(false)

  // Chat
  const [chatAbierto, setChatAbierto] = useState(false)
  const [chatMsgs, setChatMsgs] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatCargando, setChatCargando] = useState(false)

  useEffect(() => {
    if (empresaId) { cargarTodo() }
    const saved = localStorage.getItem('config_app')
    if (saved) setConfig(JSON.parse(saved))
  }, [empresaId])

  const cargarTodo = async () => {
    setLoading(true)
    await Promise.all([cargarCxP(), cargarProveedores(), cargarSaldos(), cargarMovimientos()])
    setLoading(false)
  }

  const cargarCxP = async () => {
    const { data } = await supabase.from('cuentas_por_pagar').select('*').eq('empresa_id', empresaId).order('fecha_vencimiento', { ascending: true })
    // Auto-actualizar vencidos
    const hoy = new Date()
    const actualizados = (data || []).map(c => ({
      ...c,
      estado: c.estado === 'pendiente' && c.fecha_vencimiento && new Date(c.fecha_vencimiento) < hoy ? 'vencido' : c.estado
    }))
    setCxp(actualizados)
  }

  const cargarProveedores = async () => {
    const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId).order('nombre')
    setProveedores(data || [])
  }

  const cargarSaldos = async () => {
    const { data } = await supabase.from('saldos_banco').select('*').eq('empresa_id', empresaId)
    setSaldosBanco(data || [])
  }

  const cargarMovimientos = async () => {
    const { data } = await supabase.from('movimientos_banco').select('*').eq('empresa_id', empresaId).order('fecha', { ascending: false }).limit(100)
    setMovimientosBanco(data || [])
  }

  const seleccionarProveedor = (id) => {
    const p = proveedores.find(p => p.id === id)
    if (!p) return
    setProveedorId(p.id); setNombreProveedor(p.nombre); setRfcProveedor(p.rfc || ''); setClabeProveedor(p.clabe || '')
  }

  // ── Triple Match XML ──────────────────────────────────────────────────────
  const procesarXML = async (file) => {
    if (!file) return
    setXmlNombre(file.name)
    setProcesandoXml(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const doc = new DOMParser().parseFromString(e.target.result, 'text/xml')
        const comp = doc.querySelector('Comprobante') || doc.documentElement
        const totalXML = parseFloat(comp?.getAttribute('Total') || '0')
        const rfcEmisor = doc.querySelector('Emisor')?.getAttribute('Rfc') || ''
        const nombreEmisor = doc.querySelector('Emisor')?.getAttribute('Nombre') || '—'
        const folio = comp?.getAttribute('Folio') || '—'
        const uuid = doc.querySelector('TimbreFiscalDigital')?.getAttribute('UUID') || ''
        const fecha = comp?.getAttribute('Fecha')?.split('T')[0] || null
        let iva16 = 0, iva8 = 0
        doc.querySelectorAll('Traslado').forEach(t => {
          const tasa = parseFloat(t.getAttribute('TasaOCuota') || '0')
          const imp = parseFloat(t.getAttribute('Importe') || '0')
          if (Math.abs(tasa - 0.16) < 0.001) iva16 += imp
          else if (Math.abs(tasa - 0.08) < 0.001) iva8 += imp
        })

        // Buscar OC con mismo monto y RFC (Triple Match)
        const { data: ocs } = await supabase.from('ordenes_compra').select('*')
          .eq('empresa_id', empresaId).eq('rfc_proveedor', rfcEmisor)
        const ocMatch = ocs?.find(oc => Math.abs(oc.total - totalXML) < 1)

        // Buscar si ya existe CxP con este UUID
        const { data: cxpExiste } = await supabase.from('cuentas_por_pagar').select('id').eq('uuid_cfdi', uuid).eq('empresa_id', empresaId)

        setXmlResult({ totalXML, rfcEmisor, nombreEmisor, folio, uuid, fecha, iva16, iva8, ocMatch, yaRegistrado: cxpExiste && cxpExiste.length > 0 })

        // Auto-crear CxP si hay match
        if (ocMatch && (!cxpExiste || cxpExiste.length === 0)) {
          const proveedor = proveedores.find(p => p.rfc === rfcEmisor)
          const vencimiento = new Date()
          vencimiento.setDate(vencimiento.getDate() + 30)

          const { data: nuevaCxP } = await supabase.from('cuentas_por_pagar').insert({
            empresa_id: empresaId,
            proveedor_id: proveedor?.id || null,
            orden_compra_id: ocMatch.id,
            tipo: 'proveedor',
            concepto: `Factura ${folio} — ${nombreEmisor}`,
            rfc_proveedor: rfcEmisor,
            nombre_proveedor: nombreEmisor,
            clabe_proveedor: proveedor?.clabe || '',
            monto: totalXML,
            fecha_factura: fecha,
            fecha_vencimiento: vencimiento.toISOString().split('T')[0],
            estado: 'programado',
            uuid_cfdi: uuid,
            folio_cfdi: folio,
          }).select().single()

          if (nuevaCxP) {
            setCxp(prev => [...prev, nuevaCxP])
            // Marcar OC como conciliada
            await supabase.from('ordenes_compra').update({ estado: 'Recibida y Validada', conciliada: true }).eq('id', ocMatch.id)
          }
        }
      } catch { setXmlResult({ error: 'No se pudo leer el XML.' }) }
      setProcesandoXml(false)
    }
    reader.readAsText(file)
  }

  // ── Guardar CxP manual ────────────────────────────────────────────────────
  const guardar = async () => {
    if (!empresaId || !monto || !concepto) return
    setGuardando(true)
    const { data } = await supabase.from('cuentas_por_pagar').insert({
      empresa_id: empresaId,
      proveedor_id: proveedorId || null,
      tipo,
      concepto,
      rfc_proveedor: rfcProveedor,
      nombre_proveedor: nombreProveedor,
      clabe_proveedor: clabeProveedor,
      monto: parseFloat(monto),
      fecha_factura: fechaFactura || null,
      fecha_vencimiento: fechaVencimiento || null,
      uuid_cfdi: uuidCfdi || null,
      notas,
      estado: 'pendiente',
    }).select().single()
    if (data) { setCxp(prev => [...prev, data]); setVista('tablero') }
    setGuardando(false)
  }

  // ── Programar pago ────────────────────────────────────────────────────────
  const programarPago = (c) => {
    const empresa = config.appNombre || 'Audify'
    const contenido = [
      `INSTRUCCIÓN DE TRANSFERENCIA — ${empresa}`,
      `Generado: ${new Date().toLocaleDateString('es-MX')}`,
      '',
      `Beneficiario: ${c.nombre_proveedor}`,
      `RFC: ${c.rfc_proveedor}`,
      `CLABE: ${c.clabe_proveedor || 'NO REGISTRADA — Actualizar en Catálogo de Proveedores'}`,
      `Monto: ${fmt(c.monto)}`,
      `Concepto: ${c.concepto}`,
      `Referencia: ${c.folio_cfdi || c.id.slice(0, 8).toUpperCase()}`,
      '',
      `IMPORTANTE: Al realizar el pago, solicitar XML de Complemento de Pago (REP) al proveedor.`,
      `Fecha límite REP: ${fmtFecha(new Date(new Date().setDate(new Date().getDate() + 5)))}`,
    ].join('\n')

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pago_${c.rfc_proveedor}_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Marcar como pagado ────────────────────────────────────────────────────
  const marcarPagado = async (c) => {
    const fechaLimiteRep = new Date()
    fechaLimiteRep.setDate(fechaLimiteRep.getDate() + 5)
    await supabase.from('cuentas_por_pagar').update({
      estado: 'esperando_rep',
      fecha_pago: new Date().toISOString().split('T')[0],
      monto_pagado: c.monto,
      fecha_limite_rep: fechaLimiteRep.toISOString().split('T')[0],
    }).eq('id', c.id)
    setCxp(prev => prev.map(x => x.id === c.id ? { ...x, estado: 'esperando_rep', fecha_pago: new Date().toISOString().split('T')[0], fecha_limite_rep: fechaLimiteRep.toISOString().split('T')[0] } : x))
    if (cxpActiva?.id === c.id) setCxpActiva(prev => ({ ...prev, estado: 'esperando_rep' }))
  }

  // ── Vincular REP ──────────────────────────────────────────────────────────
  const vincularREP = async (file, cxpId) => {
    if (!file) return
    setRepNombre(file.name)
    setProcesandoRep(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const doc = new DOMParser().parseFromString(e.target.result, 'text/xml')
        const uuid = doc.querySelector('TimbreFiscalDigital')?.getAttribute('UUID') || ''
        await supabase.from('cuentas_por_pagar').update({ estado: 'pagado', rep_recibido: true, uuid_rep: uuid }).eq('id', cxpId)
        setCxp(prev => prev.map(x => x.id === cxpId ? { ...x, estado: 'pagado', rep_recibido: true, uuid_rep: uuid } : x))
        if (cxpActiva?.id === cxpId) setCxpActiva(prev => ({ ...prev, estado: 'pagado', rep_recibido: true }))
        alert('✅ REP vinculado correctamente. Cuenta marcada como Pagada.')
      } catch { alert('No se pudo leer el XML del REP.') }
      setProcesandoRep(false)
    }
    reader.readAsText(file)
  }

  // ── Conciliación bancaria ─────────────────────────────────────────────────
  const procesarCSV = async (file) => {
    if (!file) return
    setCsvNombre(file.name)
    setProcesandoCsv(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const lineas = e.target.result.split('\n').slice(1).filter(l => l.trim())
        const movs = lineas.map(l => {
          const cols = l.split(',').map(c => c.trim().replace(/"/g, ''))
          return { fecha: cols[0], descripcion: cols[1], monto: parseFloat(cols[2] || '0'), rfc: cols[3] || '' }
        }).filter(m => m.monto > 0)

        const matches = []
        for (const mov of movs) {
          const cxpMatch = cxp.find(c =>
            c.estado === 'pendiente' || c.estado === 'programado' &&
            Math.abs(c.monto - mov.monto) < 1 &&
            (c.rfc_proveedor === mov.rfc || !mov.rfc)
          )
          if (cxpMatch) {
            matches.push({ mov, cxp: cxpMatch })
            await supabase.from('cuentas_por_pagar').update({
              estado: 'esperando_rep',
              fecha_pago: mov.fecha,
              monto_pagado: mov.monto,
              fecha_limite_rep: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
            }).eq('id', cxpMatch.id)
          }
        }

        setConciliaciones(matches)
        if (matches.length > 0) await cargarCxP()
        alert(`✅ Conciliación completada. ${matches.length} pagos identificados automáticamente.`)
      } catch { alert('Error al procesar el estado de cuenta. Verifica el formato CSV.') }
      setProcesandoCsv(false)
    }
    reader.readAsText(file)
  }

  // ── Cerrar nómina ─────────────────────────────────────────────────────────
  const cerrarNomina = async () => {
    if (!nominaPeriodo || !nominaSueldos) return
    setGuardandoNomina(true)
    const totalNomina = parseFloat(nominaSueldos || 0) + parseFloat(nominaImss || 0) + parseFloat(nominaInfonavit || 0) + parseFloat(nominaIsr || 0)

    const { data: nom } = await supabase.from('nominas').insert({
      empresa_id: empresaId,
      periodo: nominaPeriodo,
      fecha_inicio: nominaFechaInicio,
      fecha_fin: nominaFechaFin,
      fecha_pago: nominaFechaPago,
      total_sueldos: parseFloat(nominaSueldos || 0),
      total_imss: parseFloat(nominaImss || 0),
      total_infonavit: parseFloat(nominaInfonavit || 0),
      total_isr: parseFloat(nominaIsr || 0),
      total: totalNomina,
      estado: 'cerrada',
    }).select().single()

    if (nom) {
      // Crear CxP automáticas por nómina
      const cxpNomina = [
        { concepto: `Sueldos y Salarios — ${nominaPeriodo}`, monto: parseFloat(nominaSueldos || 0), tipo: 'nomina', nombre_proveedor: 'Nómina Empleados', rfc_proveedor: '' },
        parseFloat(nominaImss) > 0 && { concepto: `Cuotas IMSS — ${nominaPeriodo}`, monto: parseFloat(nominaImss), tipo: 'impuesto', nombre_proveedor: 'IMSS', rfc_proveedor: 'IMD930714788' },
        parseFloat(nominaInfonavit) > 0 && { concepto: `Aportaciones Infonavit — ${nominaPeriodo}`, monto: parseFloat(nominaInfonavit), tipo: 'impuesto', nombre_proveedor: 'Infonavit', rfc_proveedor: 'INF920324B86' },
        parseFloat(nominaIsr) > 0 && { concepto: `ISR Retenciones Nómina — ${nominaPeriodo}`, monto: parseFloat(nominaIsr), tipo: 'sat', nombre_proveedor: 'SAT — ISR Nómina', rfc_proveedor: 'SAT' },
      ].filter(Boolean)

      for (const item of cxpNomina) {
        const { data: nuevaCxP } = await supabase.from('cuentas_por_pagar').insert({
          empresa_id: empresaId,
          tipo: item.tipo,
          concepto: item.concepto,
          nombre_proveedor: item.nombre_proveedor,
          rfc_proveedor: item.rfc_proveedor,
          monto: item.monto,
          fecha_vencimiento: nominaFechaPago,
          estado: 'pendiente',
        }).select().single()
        if (nuevaCxP) setCxp(prev => [...prev, nuevaCxP])
      }

      alert(`✅ Nómina ${nominaPeriodo} cerrada. Se crearon ${cxpNomina.length} cuentas por pagar automáticamente.`)
      setVista('tablero')
    }
    setGuardandoNomina(false)
  }

  // ── Guardar saldo banco ───────────────────────────────────────────────────
  const guardarSaldo = async () => {
    if (!nuevoBanco || !nuevoSaldo) return
    setGuardandoSaldo(true)
    const { data } = await supabase.from('saldos_banco').insert({
      empresa_id: empresaId,
      banco: nuevoBanco,
      cuenta: nuevoCuenta,
      clabe: nuevoClabe,
      saldo: parseFloat(nuevoSaldo),
      fecha_corte: new Date().toISOString().split('T')[0],
    }).select().single()
    if (data) setSaldosBanco(prev => [...prev, data])
    setNuevoBanco(''); setNuevoCuenta(''); setNuevoClabe(''); setNuevoSaldo('')
    setGuardandoSaldo(false)
  }

  // ── Asistente de flujo ────────────────────────────────────────────────────
  const enviarChat = async () => {
    if (!chatInput.trim()) return
    const userMsg = { role: 'user', content: chatInput }
    const msgs = [...chatMsgs, userMsg]
    setChatMsgs(msgs); setChatInput(''); setChatCargando(true)

    const totalPendiente = cxp.filter(c => ['pendiente','programado','vencido','esperando_rep'].includes(c.estado)).reduce((a, c) => a + Number(c.monto), 0)
    const totalVencido = cxp.filter(c => c.estado === 'vencido').reduce((a, c) => a + Number(c.monto), 0)
    const totalSemana = cxp.filter(c => { const d = diasRestantes(c.fecha_vencimiento); return d !== null && d >= 0 && d <= 7 }).reduce((a, c) => a + Number(c.monto), 0)
    const saldoTotal = saldosBanco.reduce((a, s) => a + Number(s.saldo), 0)
    const sinRep = cxp.filter(c => c.estado === 'esperando_rep').length

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `Eres un asistente de flujo de caja para un despacho fiscal mexicano llamado ${config.appNombre || 'Audify'}.
Tienes acceso a los siguientes datos financieros en tiempo real:
- Total CxP pendiente de pago: ${fmt(totalPendiente)}
- Total vencido: ${fmt(totalVencido)}
- Por vencer esta semana: ${fmt(totalSemana)}
- Saldo total en bancos: ${fmt(saldoTotal)}
- Facturas esperando REP: ${sinRep}
- Número de cuentas por pagar: ${cxp.length}
- Proveedores: ${[...new Set(cxp.map(c=>c.nombre_proveedor))].join(', ')}
Responde preguntas sobre flujo de caja, prioridad de pagos y obligaciones fiscales. Sé conciso y usa los números reales.`,
          messages: msgs,
        }),
      })
      const data = await res.json()
      setChatMsgs(prev => [...prev, { role: 'assistant', content: data.content?.[0]?.text || 'Sin respuesta.' }])
    } catch {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }])
    }
    setChatCargando(false)
  }

  // ── Cálculos tablero ──────────────────────────────────────────────────────
  const hoy = new Date()
  const finSemana = new Date(); finSemana.setDate(finSemana.getDate() + 7)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

  const vencidas = cxp.filter(c => c.estado === 'vencido')
  const estaSemana = cxp.filter(c => { const d = diasRestantes(c.fecha_vencimiento); return d !== null && d >= 0 && d <= 7 && c.estado !== 'pagado' })
  const esteMes = cxp.filter(c => { const d = diasRestantes(c.fecha_vencimiento); return d !== null && d > 7 && d <= 31 && c.estado !== 'pagado' })
  const sinRep = cxp.filter(c => c.estado === 'esperando_rep')
  const totalPendiente = cxp.filter(c => !['pagado'].includes(c.estado)).reduce((a, c) => a + Number(c.monto), 0)
  const saldoTotal = saldosBanco.reduce((a, s) => a + Number(s.saldo), 0)
  const alcanza = saldoTotal >= totalPendiente

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }
  const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', ...extra })
  const inp = { width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', boxSizing: 'border-box' }

  // ── Columna antigüedad ────────────────────────────────────────────────────
  const ColumnaAntig = ({ titulo, items, colorBorde, colorTitulo, colorBg }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: colorBg, border: `1px solid ${colorBorde}`, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: colorTitulo, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{titulo}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: colorTitulo, marginTop: 4 }}>{fmt(items.reduce((a, c) => a + Number(c.monto), 0))}</div>
        <div style={{ fontSize: 11, color: colorTitulo, opacity: 0.7 }}>{items.length} factura{items.length !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: '#9ca3af', background: 'white', borderRadius: 8, border: '0.5px solid #f3f4f6' }}>Sin facturas</div>
        ) : items.map(c => {
          const dias = diasRestantes(c.fecha_vencimiento)
          const ec = ESTADO_COLORS[c.estado] || ESTADO_COLORS['pendiente']
          const tc = TIPO_COLORS[c.tipo] || TIPO_COLORS['proveedor']
          return (
            <div key={c.id} onClick={() => { setCxpActiva(c); setVista('ver') }}
              style={{ background: 'white', borderRadius: 8, border: `0.5px solid ${colorBorde}`, padding: '12px 14px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre_proveedor}</div>
                <span style={{ background: tc.bg, color: tc.color, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500, flexShrink: 0 }}>{c.tipo}</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.concepto}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{fmt(c.monto)}</span>
                <span style={{ background: ec.bg, color: ec.color, border: `1px solid ${ec.border}`, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>
                  {c.estado === 'vencido' ? `Vencida ${Math.abs(dias)}d` : dias !== null ? `${dias}d` : ec.label}
                </span>
              </div>
              {c.estado === 'esperando_rep' && (
                <div style={{ marginTop: 6, fontSize: 10, color: '#92400E', background: '#FFFBEB', padding: '3px 8px', borderRadius: 6 }}>
                  ⏰ REP pendiente — límite {fmtFecha(c.fecha_limite_rep)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── VISTA: TABLERO ────────────────────────────────────────────────────────
  if (vista === 'tablero') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Cuentas por Pagar</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Control de pagos y flujo de caja — {config.appNombre || 'Audify'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['📤 Subir XML', 'xml'], ['💰 Nómina', 'nomina'], ['🏦 Bancos', 'bancos'], ['📊 Dashboard', 'dashboard'], ['+ Nueva CxP', 'nueva']].map(([lbl, v]) => (
            <button key={v} onClick={() => setVista(v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: v === 'nueva' ? '#1e2a4a' : 'white', color: v === 'nueva' ? 'white' : '#374151', border: v === 'nueva' ? 'none' : '0.5px solid #e5e7eb' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['Total por pagar', fmt(totalPendiente), '#A32D2D', '#FCEBEB', <DollarSign size={16}/>],
          ['Vencidas', fmt(vencidas.reduce((a,c)=>a+Number(c.monto),0)), '#A32D2D', '#FCEBEB', <AlertTriangle size={16}/>],
          ['Esta semana', fmt(estaSemana.reduce((a,c)=>a+Number(c.monto),0)), '#92400E', '#FFFBEB', <Clock size={16}/>],
          ['Saldo bancos', fmt(saldoTotal), alcanza ? '#166534' : '#A32D2D', alcanza ? '#F0FDF4' : '#FCEBEB', <CheckCircle size={16}/>],
          ['Sin REP', sinRep.length + ' facturas', '#92400E', '#FFFBEB', <AlertCircle size={16}/>],
        ].map(([lbl, val, color, bg, icon]) => (
          <div key={lbl} style={{ background: bg, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color }}>
              {icon}
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lbl}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Alerta REP */}
      {sinRep.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertCircle size={16} color="#92400E" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
              ⚠️ {sinRep.length} pago{sinRep.length !== 1 ? 's' : ''} sin Complemento de Pago (REP)
            </div>
            <div style={{ fontSize: 12, color: '#92400E' }}>
              Sin el XML del REP, estos pagos no son deducibles. El SAT puede rechazar el acreditamiento del IVA y la deducción del ISR. Exige el comprobante a tu proveedor.
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {sinRep.slice(0, 3).map(c => (
                <span key={c.id} onClick={() => { setCxpActiva(c); setVista('ver') }}
                  style={{ background: '#FDE68A', color: '#92400E', padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                  {c.nombre_proveedor} · {fmt(c.monto)}
                </span>
              ))}
              {sinRep.length > 3 && <span style={{ fontSize: 11, color: '#92400E', padding: '3px 0' }}>+{sinRep.length - 3} más</span>}
            </div>
          </div>
        </div>
      )}

      {/* Alerta saldo insuficiente */}
      {saldosBanco.length > 0 && !alcanza && (
        <div style={{ background: '#FCEBEB', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="#A32D2D" />
          <div style={{ fontSize: 13, color: '#A32D2D' }}>
            <strong>Saldo insuficiente:</strong> Tienes {fmt(saldoTotal)} en bancos pero {fmt(totalPendiente)} en CxP pendientes. Déficit de {fmt(totalPendiente - saldoTotal)}.
          </div>
        </div>
      )}

      {/* Tablero antigüedad */}
      <div style={{ display: 'flex', gap: 14 }}>
        <ColumnaAntig titulo="🔴 Vencidas" items={vencidas} colorBorde="#FECACA" colorTitulo="#A32D2D" colorBg="#FCEBEB" />
        <ColumnaAntig titulo="🟡 Esta semana" items={estaSemana} colorBorde="#FDE68A" colorTitulo="#92400E" colorBg="#FFFBEB" />
        <ColumnaAntig titulo="🔵 Este mes" items={esteMes} colorBorde="#BFDBFE" colorTitulo="#185FA5" colorBg="#EFF6FF" />
      </div>

      {/* Footer branding */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: '0.1em', marginTop: 32 }}>
        CUENTAS POR PAGAR — {(config.appNombre || 'AUDIFY').toUpperCase()}
      </div>
    </div>
  )

  // ── VISTA: SUBIR XML ──────────────────────────────────────────────────────
  if (vista === 'xml') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => { setVista('tablero'); setXmlResult(null); setXmlNombre('') }} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Triple Match — Subir XML de Gasto</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>¿Cómo funciona el Triple Match?</div>
            <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
              {[
                ['1', 'Subir XML', 'Carga el CFDI de tu proveedor', '#185FA5', '#EFF6FF'],
                ['2', 'Match automático', 'Busca la OC con mismo monto y RFC', '#166534', '#F0FDF4'],
                ['3', 'CxP creada', 'Se crea la cuenta por pagar lista para pago', '#92400E', '#FFFBEB'],
              ].map(([num, titulo, desc, color, bg], i) => (
                <div key={num} style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{num}</div>
                    {i < 2 && <div style={{ width: 1, height: 30, background: '#e5e7eb', margin: '4px 0' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{titulo}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px', border: '2px dashed #d1d5db', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#6b7280', background: '#fafafa', flexDirection: 'column' }}>
              <Upload size={28} color="#9ca3af" />
              <div style={{ fontWeight: 500 }}>{procesandoXml ? 'Procesando XML...' : xmlNombre || 'Arrastra o selecciona el XML del CFDI'}</div>
              <div style={{ fontSize: 11 }}>Solo archivos .xml de CFDIs válidos del SAT</div>
              <input type="file" accept=".xml" style={{ display: 'none' }} onChange={e => procesarXML(e.target.files[0])} disabled={procesandoXml} />
            </label>
          </div>

          {xmlResult && !xmlResult.error && (
            <div style={{ ...card, border: `1px solid ${xmlResult.ocMatch ? '#bbf7d0' : xmlResult.yaRegistrado ? '#BFDBFE' : '#FDE68A'}`, background: xmlResult.ocMatch ? '#f0fdf4' : xmlResult.yaRegistrado ? '#EFF6FF' : '#FFFBEB' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: xmlResult.ocMatch ? '#166534' : xmlResult.yaRegistrado ? '#185FA5' : '#92400E' }}>
                {xmlResult.ocMatch ? '✅ Triple Match exitoso — CxP creada automáticamente' : xmlResult.yaRegistrado ? 'ℹ️ Este CFDI ya estaba registrado' : '⚠️ XML válido — Sin Orden de Compra relacionada'}
              </div>
              {[
                ['Emisor', xmlResult.nombreEmisor],
                ['RFC', xmlResult.rfcEmisor],
                ['Folio', xmlResult.folio],
                ['UUID', xmlResult.uuid?.slice(0, 20) + '...'],
                ['Fecha', fmtFecha(xmlResult.fecha)],
                ['IVA 16%', fmt(xmlResult.iva16)],
                ['IVA 8%', xmlResult.iva8 > 0 ? fmt(xmlResult.iva8) : '—'],
                ['Total', fmt(xmlResult.totalXML)],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ color: '#6b7280' }}>{l}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              {xmlResult.ocMatch && (
                <div style={{ marginTop: 10, background: 'white', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                  <strong>OC relacionada:</strong> {xmlResult.ocMatch.folio} · {fmt(xmlResult.ocMatch.total)}
                </div>
              )}
              {!xmlResult.ocMatch && !xmlResult.yaRegistrado && (
                <button onClick={() => { setNombreProveedor(xmlResult.nombreEmisor); setRfcProveedor(xmlResult.rfcEmisor); setMonto(xmlResult.totalXML); setFechaFactura(xmlResult.fecha); setUuidCfdi(xmlResult.uuid); setVista('nueva') }}
                  style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
                  + Crear CxP manualmente con estos datos
                </button>
              )}
            </div>
          )}
          {xmlResult?.error && <div style={{ ...card, background: '#FCEBEB', border: '1px solid #FECACA', fontSize: 12, color: '#A32D2D' }}>{xmlResult.error}</div>}
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Últimas CxP registradas</div>
          {cxp.slice(0, 8).map(c => {
            const ec = ESTADO_COLORS[c.estado] || ESTADO_COLORS['pendiente']
            return (
              <div key={c.id} onClick={() => { setCxpActiva(c); setVista('ver') }}
                style={{ padding: '10px 0', borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{c.nombre_proveedor}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#16a34a' }}>{fmt(c.monto)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{fmtFecha(c.fecha_vencimiento)}</span>
                  <span style={{ background: ec.bg, color: ec.color, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>{ec.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: '0.1em', marginTop: 32 }}>
        TRIPLE MATCH — {(config.appNombre || 'AUDIFY').toUpperCase()}
      </div>
    </div>
  )

  // ── VISTA: VER CxP ────────────────────────────────────────────────────────
  if (vista === 'ver' && cxpActiva) {
    const c = cxpActiva
    const ec = ESTADO_COLORS[c.estado] || ESTADO_COLORS['pendiente']
    const tc = TIPO_COLORS[c.tipo] || TIPO_COLORS['proveedor']
    const dias = diasRestantes(c.fecha_vencimiento)
    const diasRep = diasRestantes(c.fecha_limite_rep)

    return (
      <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setVista('tablero'); setRepNombre('') }} style={btn()}>← Volver</button>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{c.nombre_proveedor}</div>
          <span style={{ background: ec.bg, color: ec.color, border: `1px solid ${ec.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{ec.label}</span>
          <span style={{ background: tc.bg, color: tc.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{c.tipo}</span>
        </div>

        {/* Alerta REP urgente */}
        {c.estado === 'esperando_rep' && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertCircle size={16} color="#92400E" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 3 }}>
                {diasRep !== null && diasRep <= 0 ? '🚨 Plazo REP vencido' : `⏰ REP pendiente — ${diasRep}d restantes`}
              </div>
              <div style={{ fontSize: 12, color: '#92400E' }}>
                Sin el Complemento de Pago (REP), este pago no es deducible (Art. 27 LISR). Exige el XML a {c.nombre_proveedor} antes del {fmtFecha(c.fecha_limite_rep)}.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Detalle cuenta */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 14, borderBottom: '2px solid #1e2a4a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: '#1e2a4a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>
                    {(config.appNombre || 'A').charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e2a4a' }}>{config.appNombre || 'Audify'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Cuenta por Pagar</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1e2a4a' }}>{fmt(c.monto)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Vence {fmtFecha(c.fecha_vencimiento)}{dias !== null ? ` · ${dias >= 0 ? dias + 'd' : 'Vencida'}` : ''}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {[
                  ['Proveedor', c.nombre_proveedor],
                  ['RFC', c.rfc_proveedor || '—'],
                  ['CLABE', c.clabe_proveedor ? `****${c.clabe_proveedor.slice(-4)}` : 'No registrada'],
                  ['Concepto', c.concepto],
                  ['Fecha factura', fmtFecha(c.fecha_factura)],
                  ['UUID CFDI', c.uuid_cfdi ? c.uuid_cfdi.slice(0, 16) + '...' : '—'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, fontFamily: l === 'RFC' || l === 'UUID CFDI' ? 'monospace' : 'inherit' }}>{v}</div>
                  </div>
                ))}
              </div>

              {c.notas && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#374151' }}>
                  <strong>Notas:</strong> {c.notas}
                </div>
              )}

              {/* REP Section */}
              {(c.estado === 'esperando_rep' || c.estado === 'pagado') && (
                <div style={{ marginTop: 14, borderTop: '0.5px solid #f3f4f6', paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Complemento de Pago (REP)
                  </div>
                  {c.rep_recibido ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#166534' }}>
                      ✅ REP recibido · UUID: {c.uuid_rep?.slice(0, 16)}...
                    </div>
                  ) : (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1.5px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
                      <Upload size={16} color="#9ca3af" />
                      {procesandoRep ? 'Procesando REP...' : repNombre || 'Subir XML del Complemento de Pago (REP)'}
                      <input type="file" accept=".xml" style={{ display: 'none' }} onChange={e => vincularREP(e.target.files[0], c.id)} disabled={procesandoRep} />
                    </label>
                  )}
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: 10, color: '#c4c4c4', letterSpacing: '0.1em', borderTop: '0.5px solid #f3f4f6', paddingTop: 10, marginTop: 14 }}>
                CUENTA POR PAGAR — {(config.appNombre || 'AUDIFY').toUpperCase()}
              </div>
            </div>

            {/* Asistente de flujo */}
            <div style={card}>
              <button onClick={() => setChatAbierto(v => !v)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🤖 Asistente de Flujo</div>
                {chatAbierto ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
              </button>
              {chatAbierto && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 100, maxHeight: 240, overflowY: 'auto', marginBottom: 10 }}>
                    {chatMsgs.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af' }}>Pregúntame sobre flujo de caja, prioridad de pagos o cuánto necesitas para pagar el viernes.</div>}
                    {chatMsgs.map((m, i) => (
                      <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                        <span style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 10, fontSize: 12, background: m.role === 'user' ? '#1e2a4a' : 'white', color: m.role === 'user' ? 'white' : '#374151', border: m.role === 'assistant' ? '0.5px solid #e5e7eb' : 'none', maxWidth: '85%', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </span>
                      </div>
                    ))}
                    {chatCargando && <div style={{ fontSize: 12, color: '#9ca3af' }}>Calculando...</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarChat()}
                      placeholder="Ej: ¿Cuánto necesito para pagar el viernes?" style={{ flex: 1, padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                    <button onClick={enviarChat} disabled={chatCargando} style={{ padding: '8px 14px', borderRadius: 8, background: '#1e2a4a', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
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
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Acciones</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(c.estado === 'pendiente' || c.estado === 'programado') && (
                  <>
                    <button onClick={() => programarPago(c)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
                      <Download size={14} /> Programar Pago (.txt)
                    </button>
                    <button onClick={() => marcarPagado(c)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                      <CheckCircle size={14} /> Marcar como Pagado
                    </button>
                  </>
                )}

                {/* Cambio de estado */}
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>Cambiar estado</div>
                  {Object.entries(ESTADO_COLORS).map(([key, ec]) => (
                    <button key={key} onClick={async () => {
                      await supabase.from('cuentas_por_pagar').update({ estado: key }).eq('id', c.id)
                      setCxpActiva(prev => ({ ...prev, estado: key }))
                      setCxp(prev => prev.map(x => x.id === c.id ? { ...x, estado: key } : x))
                    }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', textAlign: 'left', border: `1px solid ${c.estado === key ? ec.border : '#e5e7eb'}`, background: c.estado === key ? ec.bg : 'white', color: c.estado === key ? ec.color : '#6b7280', marginBottom: 5 }}>
                      {c.estado === key ? '●' : '○'} {ec.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Info CLABE */}
            {c.clabe_proveedor && (
              <div style={{ ...card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#166534', marginBottom: 8 }}>CLABE para transferencia</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: '#0f172a', letterSpacing: '0.05em' }}>
                  {c.clabe_proveedor.replace(/(\d{6})(\d{6})(\d{5})(\d{1})/, '$1 $2 $3 $4')}
                </div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 4 }}>{c.nombre_proveedor}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: '0.1em', marginTop: 32 }}>
          CUENTAS POR PAGAR — {(config.appNombre || 'AUDIFY').toUpperCase()}
        </div>
      </div>
    )
  }

  // ── VISTA: NUEVA CxP ──────────────────────────────────────────────────────
  if (vista === 'nueva') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setVista('tablero')} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Nueva Cuenta por Pagar</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Tipo</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['proveedor','🏢 Proveedor'],['nomina','👥 Nómina'],['impuesto','🏛 Impuesto'],['sat','⚖️ SAT']].map(([val, lbl]) => (
                <button key={val} onClick={() => setTipo(val)}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: tipo === val ? '#1e2a4a' : 'white', color: tipo === val ? 'white' : '#6b7280' }}>
                  {lbl}
                </button>
              ))}
            </div>

            {tipo === 'proveedor' && proveedores.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Seleccionar del catálogo</label>
                <select value={proveedorId} onChange={e => seleccionarProveedor(e.target.value)} style={{ ...inp, background: 'white' }}>
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.rfc}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Nombre / Proveedor', nombreProveedor, setNombreProveedor],
                ['RFC', rfcProveedor, setRfcProveedor],
                ['CLABE', clabeProveedor, setClabeProveedor],
                ['Concepto', concepto, setConcepto],
              ].map(([lbl, val, set]) => (
                <div key={lbl} style={{ gridColumn: lbl === 'Concepto' ? '1/-1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{lbl}</label>
                  <input value={val} onChange={e => set(e.target.value)} style={inp} />
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Importes y fechas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Monto *</label>
                <input type="number" value={monto} onChange={e => setMonto(e.target.value)} style={inp} placeholder="0.00" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>UUID CFDI</label>
                <input value={uuidCfdi} onChange={e => setUuidCfdi(e.target.value)} style={inp} placeholder="Opcional" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Fecha factura</label>
                <input type="date" value={fechaFactura} onChange={e => setFechaFactura(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Fecha vencimiento</label>
                <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} style={inp} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Resumen</div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Acreedor</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{nombreProveedor || '—'}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{rfcProveedor}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Monto</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#A32D2D' }}>{monto ? fmt(parseFloat(monto)) : '—'}</div>
          </div>
          {fechaVencimiento && (
            <div style={{ background: '#fffbeb', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#92400E' }}>
              ⏰ Vence {fmtFecha(fechaVencimiento)} · {diasRestantes(fechaVencimiento)}d
            </div>
          )}
          <button onClick={guardar} disabled={guardando || !monto || !concepto}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: (monto && concepto) ? 'pointer' : 'not-allowed', background: '#1e2a4a', color: 'white', border: 'none', opacity: (monto && concepto) ? 1 : 0.5 }}>
            {guardando ? 'Guardando...' : '💾 Guardar CxP'}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: '0.1em', marginTop: 32 }}>
        CUENTAS POR PAGAR — {(config.appNombre || 'AUDIFY').toUpperCase()}
      </div>
    </div>
  )

  // ── VISTA: NÓMINA ─────────────────────────────────────────────────────────
  if (vista === 'nomina') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setVista('tablero')} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Cerrar Nómina</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Datos del período</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Período *</label>
              <input value={nominaPeriodo} onChange={e => setNominaPeriodo(e.target.value)} placeholder="Ej: Quincena 1 Enero 2026" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Fecha inicio</label>
              <input type="date" value={nominaFechaInicio} onChange={e => setNominaFechaInicio(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Fecha fin</label>
              <input type="date" value={nominaFechaFin} onChange={e => setNominaFechaFin(e.target.value)} style={inp} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Fecha de pago</label>
              <input type="date" value={nominaFechaPago} onChange={e => setNominaFechaPago(e.target.value)} style={inp} />
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 20, marginBottom: 12 }}>Importes</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Sueldos y Salarios *', nominaSueldos, setNominaSueldos, '#6D28D9'],
              ['Cuotas IMSS', nominaImss, setNominaImss, '#A32D2D'],
              ['Aportaciones Infonavit', nominaInfonavit, setNominaInfonavit, '#A32D2D'],
              ['ISR Retenciones', nominaIsr, setNominaIsr, '#A32D2D'],
            ].map(([lbl, val, set, color]) => (
              <div key={lbl}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{lbl}</label>
                <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="0.00" style={{ ...inp, borderColor: val ? color : '#e5e7eb' }} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, background: '#F5F3FF', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#6D28D9', marginBottom: 4 }}>Total nómina</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#6D28D9' }}>
              {fmt((parseFloat(nominaSueldos || 0) + parseFloat(nominaImss || 0) + parseFloat(nominaInfonavit || 0) + parseFloat(nominaIsr || 0)))}
            </div>
          </div>

          <div style={{ marginTop: 14, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#185FA5' }}>
            ℹ️ Al cerrar la nómina se crearán automáticamente las Cuentas por Pagar correspondientes a sueldos, IMSS, Infonavit e ISR.
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>CxP que se crearán</div>
          {[
            ['Sueldos y Salarios', nominaSueldos, '#6D28D9', '#F5F3FF', 'nomina'],
            ['Cuotas IMSS', nominaImss, '#A32D2D', '#FCEBEB', 'impuesto'],
            ['Aportaciones Infonavit', nominaInfonavit, '#A32D2D', '#FCEBEB', 'impuesto'],
            ['ISR Retenciones', nominaIsr, '#A32D2D', '#FCEBEB', 'sat'],
          ].filter(([, val]) => parseFloat(val || 0) > 0).map(([lbl, val, color, bg]) => (
            <div key={lbl} style={{ background: bg, borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color, fontWeight: 600 }}>{lbl}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color, fontFamily: 'monospace' }}>{fmt(parseFloat(val || 0))}</div>
            </div>
          ))}
          <button onClick={cerrarNomina} disabled={guardandoNomina || !nominaPeriodo || !nominaSueldos}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginTop: 14, cursor: (nominaPeriodo && nominaSueldos) ? 'pointer' : 'not-allowed', background: '#1e2a4a', color: 'white', border: 'none', opacity: (nominaPeriodo && nominaSueldos) ? 1 : 0.5 }}>
            {guardandoNomina ? 'Cerrando...' : '✅ Cerrar Nómina y Crear CxP'}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: '0.1em', marginTop: 32 }}>
        NÓMINA — {(config.appNombre || 'AUDIFY').toUpperCase()}
      </div>
    </div>
  )

  // ── VISTA: BANCOS ─────────────────────────────────────────────────────────
  if (vista === 'bancos') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setVista('tablero')} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Bancos y Conciliación</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Saldos */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Saldos en Bancos</div>
          {saldosBanco.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{s.banco}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{s.cuenta}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#16a34a', fontFamily: 'monospace' }}>{fmt(s.saldo)}</div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>{fmtFecha(s.fecha_corte)}</div>
              </div>
            </div>
          ))}
          <div style={{ paddingTop: 12, borderTop: '2px solid #1e2a4a', display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
            <span>Total</span>
            <span style={{ fontFamily: 'monospace', color: saldoTotal >= totalPendiente ? '#16a34a' : '#A32D2D' }}>{fmt(saldoTotal)}</span>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 16, marginBottom: 10 }}>Agregar cuenta</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['Banco', nuevoBanco, setNuevoBanco], ['Cuenta', nuevoCuenta, setNuevoCuenta], ['CLABE', nuevoClabe, setNuevoClabe], ['Saldo actual', nuevoSaldo, setNuevoSaldo]].map(([lbl, val, set]) => (
              <div key={lbl}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{lbl}</label>
                <input value={val} onChange={e => set(e.target.value)} type={lbl === 'Saldo actual' ? 'number' : 'text'} style={inp} />
              </div>
            ))}
          </div>
          <button onClick={guardarSaldo} disabled={guardandoSaldo || !nuevoBanco || !nuevoSaldo}
            style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
            {guardandoSaldo ? 'Guardando...' : '+ Agregar cuenta'}
          </button>
        </div>

        {/* Conciliación CSV */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Conciliación Automática</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>
            Sube el estado de cuenta en formato CSV. La app comparará los egresos con las CxP pendientes y marcará los pagos automáticamente.
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#6b7280', marginBottom: 14, fontFamily: 'monospace' }}>
            Formato CSV esperado:<br />
            fecha, descripcion, monto, rfc
          </div>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px', border: '2px dashed #d1d5db', borderRadius: 10, cursor: 'pointer', fontSize: 12, color: '#6b7280', flexDirection: 'column', background: '#fafafa', marginBottom: 14 }}>
            <Upload size={24} color="#9ca3af" />
            <div style={{ fontWeight: 500 }}>{procesandoCsv ? 'Procesando...' : csvNombre || 'Subir estado de cuenta (.csv)'}</div>
            <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => procesarCSV(e.target.files[0])} disabled={procesandoCsv} />
          </label>

          {conciliaciones.length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 10 }}>✅ {conciliaciones.length} pagos conciliados</div>
              {conciliaciones.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '0.5px solid #bbf7d0' }}>
                  <span>{c.cxp.nombre_proveedor}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{fmt(c.mov.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: '0.1em', marginTop: 16 }}>
        BANCOS — {(config.appNombre || 'AUDIFY').toUpperCase()}
      </div>
    </div>
  )

  // ── VISTA: DASHBOARD ──────────────────────────────────────────────────────
  if (vista === 'dashboard') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setVista('tablero')} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>Dashboard de Flujo de Caja</div>
      </div>

      {/* Cash Burn por tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Desglose por tipo</div>
          {[
            ['🏢 Proveedores', cxp.filter(c=>c.tipo==='proveedor'&&c.estado!=='pagado').reduce((a,c)=>a+Number(c.monto),0), '#185FA5', '#EFF6FF'],
            ['👥 Nómina', cxp.filter(c=>c.tipo==='nomina'&&c.estado!=='pagado').reduce((a,c)=>a+Number(c.monto),0), '#6D28D9', '#F5F3FF'],
            ['🏛 Impuestos', cxp.filter(c=>c.tipo==='impuesto'&&c.estado!=='pagado').reduce((a,c)=>a+Number(c.monto),0), '#A32D2D', '#FCEBEB'],
            ['⚖️ SAT', cxp.filter(c=>c.tipo==='sat'&&c.estado!=='pagado').reduce((a,c)=>a+Number(c.monto),0), '#A32D2D', '#FCEBEB'],
          ].map(([lbl, val, color, bg]) => (
            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: bg, borderRadius: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color }}>{lbl}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 600, color }}>{fmt(val)}</span>
            </div>
          ))}
          <div style={{ borderTop: '2px solid #1e2a4a', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600 }}>
            <span>Total CxP</span>
            <span style={{ fontFamily: 'monospace', color: '#A32D2D' }}>{fmt(totalPendiente)}</span>
          </div>
        </div>

        {/* Semáforo de liquidez */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Semáforo de Liquidez</div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>{alcanza ? '🟢' : saldoTotal >= totalPendiente * 0.5 ? '🟡' : '🔴'}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: alcanza ? '#166534' : '#A32D2D', marginBottom: 8 }}>
              {alcanza ? 'Liquidez suficiente' : 'Liquidez insuficiente'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              {alcanza
                ? `Tienes ${fmt(saldoTotal - totalPendiente)} de excedente`
                : `Déficit de ${fmt(totalPendiente - saldoTotal)}`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['Saldo en bancos', fmt(saldoTotal), '#166534'],
              ['Total por pagar', fmt(totalPendiente), '#A32D2D'],
              ['Balance', fmt(saldoTotal - totalPendiente), saldoTotal >= totalPendiente ? '#166534' : '#A32D2D'],
            ].map(([l, v, color]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{l}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Barra Cash Burn visual */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Cash Burn — Distribución de Pagos Pendientes</div>
        {[
          ['Proveedores', cxp.filter(c=>c.tipo==='proveedor'&&c.estado!=='pagado').reduce((a,c)=>a+Number(c.monto),0), '#185FA5'],
          ['Nómina', cxp.filter(c=>c.tipo==='nomina'&&c.estado!=='pagado').reduce((a,c)=>a+Number(c.monto),0), '#6D28D9'],
          ['Impuestos / SAT', cxp.filter(c=>['impuesto','sat'].includes(c.tipo)&&c.estado!=='pagado').reduce((a,c)=>a+Number(c.monto),0), '#A32D2D'],
        ].filter(([,val]) => val > 0).map(([lbl, val, color]) => {
          const pct = totalPendiente > 0 ? (val / totalPendiente) * 100 : 0
          return (
            <div key={lbl} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#374151' }}>{lbl}</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 500, color }}>{fmt(val)} ({pct.toFixed(1)}%)</span>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                <div style={{ height: 10, borderRadius: 999, background: color, width: `${pct}%`, transition: 'width 0.5s' }} />
              </div>
            </div>
          )
        })}

        {/* Barra saldo vs deuda */}
        <div style={{ marginTop: 20, borderTop: '0.5px solid #f3f4f6', paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Saldo bancario vs Total CxP</div>
          <div style={{ background: '#f3f4f6', borderRadius: 999, height: 16, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: 16, borderRadius: 999, background: alcanza ? '#16a34a' : '#dc2626', width: `${Math.min((saldoTotal / Math.max(totalPendiente, saldoTotal)) * 100, 100)}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
            <span style={{ color: '#16a34a', fontFamily: 'monospace' }}>Saldo: {fmt(saldoTotal)}</span>
            <span style={{ color: '#A32D2D', fontFamily: 'monospace' }}>CxP: {fmt(totalPendiente)}</span>
          </div>
        </div>
      </div>

      {/* Asistente de flujo */}
      <div style={{ ...card, marginTop: 16 }}>
        <button onClick={() => setChatAbierto(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🤖 Asistente de Flujo de Caja</div>
          {chatAbierto ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
        </button>
        {chatAbierto && (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, minHeight: 100, maxHeight: 260, overflowY: 'auto', marginBottom: 10 }}>
              {chatMsgs.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af' }}>Pregúntame: "¿Cuánto necesito para pagar el viernes?" o "¿Tengo liquidez suficiente este mes?"</div>}
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 10, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  <span style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 10, fontSize: 12, background: m.role === 'user' ? '#1e2a4a' : 'white', color: m.role === 'user' ? 'white' : '#374151', border: m.role === 'assistant' ? '0.5px solid #e5e7eb' : 'none', maxWidth: '85%', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </span>
                </div>
              ))}
              {chatCargando && <div style={{ fontSize: 12, color: '#9ca3af' }}>Calculando...</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviarChat()}
                placeholder="Ej: ¿Cuánto necesito para pagar el viernes?" style={{ flex: 1, padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, outline: 'none' }} />
              <button onClick={enviarChat} disabled={chatCargando} style={{ padding: '8px 14px', borderRadius: 8, background: '#1e2a4a', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <Send size={13} /> Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#d1d5db', letterSpacing: '0.1em', marginTop: 32 }}>
        DASHBOARD — {(config.appNombre || 'AUDIFY').toUpperCase()}
      </div>
    </div>
  )

  return null
}