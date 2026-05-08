'use client'
import { useState } from 'react'
import { supabase } from '../../supabase'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCliente } from '../../ClienteContext'
import { Suspense } from 'react'

const tasasIVA = [
  { label: '16% General', valor: 0.16 },
  { label: '8% Frontera', valor: 0.08 },
  { label: '4% Especial', valor: 0.04 },
  { label: '0% Tasa cero', valor: 0 },
  { label: 'Exento', valor: -1 },
]

function NuevoMovimientoForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { clienteActivo, empresaId } = useCliente()
  const tipoInicial = searchParams.get('tipo') || 'ingreso'

  const [tipo, setTipo] = useState(tipoInicial)
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [categoria, setCategoria] = useState('')
  const [formaPago, setFormaPago] = useState('')
  const [tasaIVA, setTasaIVA] = useState(0.16)
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const categoriasPorTipo = {
    ingreso: ['Venta de productos','Prestacion de servicios','Honorarios','Renta','Otros ingresos'],
    egreso: ['Renta','Nomina','Servicios','Compras','Impuestos','Publicidad','Transporte','Otros gastos'],
  }

  const formasPago = ['Efectivo','Transferencia','Cheque','Tarjeta debito','Tarjeta credito']

  const handleGuardar = async () => {
    setError('')
    if (!monto || isNaN(monto) || Number(monto) <= 0) { setError('Ingresa un monto valido'); return }
    if (!descripcion) { setError('Agrega una descripcion'); return }
    if (!fecha) { setError('Selecciona una fecha'); return }
    if (!formaPago) { setError('Selecciona una forma de pago'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No hay sesion activa'); setLoading(false); return }

    const montoNum = Number(monto)
    const { error: err } = await supabase.from('movimientos').insert({
      empresa_id: user.id,
      cliente_id: clienteActivo?.id || null,
      tipo,
      monto: montoNum,
      monto_base: montoNum,
      moneda: 'MXN',
      tipo_cambio: 1,
      fecha_operacion: fecha,
      descripcion,
      referencia,
      notas,
      forma_pago: formaPago,
      es_facturado: false,
      estado: 'confirmado',
    })

    if (err) { setError('Error al guardar: ' + err.message); setLoading(false); return }
    setExito(true)
    setLoading(false)
  }

  const resetForm = () => {
    setExito(false)
    setMonto('')
    setDescripcion('')
    setReferencia('')
    setNotas('')
    setFormaPago('')
    setTasaIVA(0.16)
    setCategoria('')
  }

  if (exito) return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'white',borderRadius:16,border:'0.5px solid #e5e7eb',padding:32,maxWidth:480,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>{tipo==='ingreso'?'💰':'🧾'}</div>
        <h2 style={{fontSize:20,fontWeight:600,color:'#1f2937',marginBottom:8}}>{tipo==='ingreso'?'Ingreso':'Egreso'} registrado</h2>
        {clienteActivo && (
          <p style={{fontSize:13,color:'#6b7280',marginBottom:8}}>Cliente: <strong>{clienteActivo.nombre}</strong></p>
        )}
        <p style={{fontSize:14,color:'#6b7280',marginBottom:24}}>El movimiento se guardo correctamente</p>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button onClick={resetForm}
            style={{padding:'10px 20px',background:'#185FA5',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>
            Registrar otro
          </button>
          <button onClick={() => router.push('/')}
            style={{padding:'10px 20px',background:'white',color:'#374151',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>
            Ir al dashboard
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:4}}>Nuevo movimiento</h1>
        <p style={{fontSize:13,color:'#6b7280'}}>
          {clienteActivo ? `Cliente: ${clienteActivo.nombre} · ${clienteActivo.rfc}` : 'Sin cliente asignado — movimiento general'}
        </p>
      </div>

      {clienteActivo && (
        <div style={{background:'#eff6ff',border:'0.5px solid #bfdbfe',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:28,height:28,borderRadius:8,background:'#185FA5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'white'}}>
            {clienteActivo.nombre.charAt(0)}
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:500,color:'#1e40af'}}>{clienteActivo.nombre}</div>
            <div style={{fontSize:11,color:'#93c5fd',fontFamily:'monospace'}}>{clienteActivo.rfc}</div>
          </div>
        </div>
      )}

      <div style={{background:'white',borderRadius:16,border:'0.5px solid #e5e7eb',padding:28,maxWidth:560}}>

        <div style={{marginBottom:20}}>
          <label style={{display:'block',fontSize:12,fontWeight:500,color:'#6b7280',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'}}>Tipo de movimiento</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {['ingreso','egreso'].map(t => (
              <button key={t} onClick={() => setTipo(t)}
                style={{padding:'12px',border:`0.5px solid ${tipo===t?(t==='ingreso'?'#185FA5':'#A32D2D'):'#e5e7eb'}`,borderRadius:10,background:tipo===t?(t==='ingreso'?'#E6F1FB':'#FCEBEB'):'white',cursor:'pointer',fontSize:14,fontWeight:500,color:tipo===t?(t==='ingreso'?'#185FA5':'#A32D2D'):'#6b7280',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {t==='ingreso'?'💰':'🧾'} {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{background:'#fef2f2',border:'0.5px solid #fecaca',color:'#dc2626',fontSize:13,borderRadius:10,padding:'10px 14px',marginBottom:16}}>{error}</div>}

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Monto</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#9ca3af'}}>$</span>
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)} placeholder="0.00"
              style={{width:'100%',padding:'10px 12px 10px 28px',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:16,fontWeight:500,color:'#1f2937',outline:'none',boxSizing:'border-box'}} />
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Descripcion</label>
          <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej: Pago de honorarios mayo"
            style={{width:'100%',padding:'10px 12px',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:13,color:'#1f2937',outline:'none',boxSizing:'border-box'}} />
        </div>

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{width:'100%',padding:'10px 12px',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:13,color:'#1f2937',outline:'none',boxSizing:'border-box'}} />
        </div>

        {tipo === 'ingreso' && (
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Tasa de IVA</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
              {tasasIVA.map(t => (
                <button key={t.label} onClick={() => setTasaIVA(t.valor)}
                  style={{padding:'8px 4px',border:`0.5px solid ${tasaIVA===t.valor?'#185FA5':'#e5e7eb'}`,borderRadius:8,background:tasaIVA===t.valor?'#E6F1FB':'white',cursor:'pointer',fontSize:11,fontWeight:500,color:tasaIVA===t.valor?'#185FA5':'#6b7280',textAlign:'center'}}>
                  {t.label}
                </button>
              ))}
            </div>
            {monto && tasaIVA !== -1 && (
              <div style={{fontSize:11,color:'#6b7280',marginTop:6,display:'flex',justifyContent:'space-between'}}>
                <span>Subtotal: ${Number(monto).toLocaleString('es-MX')}</span>
                <span>IVA: ${(Number(monto)*tasaIVA).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
                <span style={{fontWeight:500,color:'#1f2937'}}>Total: ${(Number(monto)*(1+tasaIVA)).toLocaleString('es-MX',{minimumFractionDigits:2})}</span>
              </div>
            )}
          </div>
        )}

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Forma de pago</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
            {formasPago.map(f => (
              <button key={f} onClick={() => setFormaPago(f)}
                style={{padding:'8px 6px',border:`0.5px solid ${formaPago===f?'#185FA5':'#e5e7eb'}`,borderRadius:8,background:formaPago===f?'#E6F1FB':'white',cursor:'pointer',fontSize:12,fontWeight:500,color:formaPago===f?'#185FA5':'#6b7280',textAlign:'center'}}>
                {f==='Efectivo'?'💵':f==='Transferencia'?'🏦':f==='Cheque'?'📄':'💳'} {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Categoria</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}
            style={{width:'100%',padding:'10px 12px',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:13,color:'#1f2937',outline:'none',boxSizing:'border-box',background:'white'}}>
            <option value="">Selecciona una categoria</option>
            {categoriasPorTipo[tipo].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{marginBottom:16}}>
          <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Referencia <span style={{color:'#9ca3af',fontWeight:400}}>(opcional)</span></label>
          <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Folio, numero de factura, etc"
            style={{width:'100%',padding:'10px 12px',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:13,color:'#1f2937',outline:'none',boxSizing:'border-box'}} />
        </div>

        <div style={{marginBottom:24}}>
          <label style={{display:'block',fontSize:13,fontWeight:500,color:'#374151',marginBottom:6}}>Notas <span style={{color:'#9ca3af',fontWeight:400}}>(opcional)</span></label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Cualquier detalle adicional..." rows={3}
            style={{width:'100%',padding:'10px 12px',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:13,color:'#1f2937',outline:'none',boxSizing:'border-box',resize:'vertical'}} />
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={() => router.back()}
            style={{padding:'11px 20px',background:'white',color:'#374151',border:'0.5px solid #e5e7eb',borderRadius:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading}
            style={{flex:1,padding:'11px',background:tipo==='ingreso'?'#185FA5':'#A32D2D',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>
            {loading ? 'Guardando...' : `Guardar ${tipo}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NuevoMovimiento() {
  return (
    <Suspense>
      <NuevoMovimientoForm />
    </Suspense>
  )
}