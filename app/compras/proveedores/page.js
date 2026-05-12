'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useCliente } from '../../ClienteContext'
import { Plus, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

const REGIMENES = [
  '601 - General de Ley Personas Morales',
  '603 - Personas Morales con Fines no Lucrativos',
  '605 - Sueldos y Salarios',
  '606 - Arrendamiento',
  '607 - Régimen de Enajenación o Adquisición de Bienes',
  '608 - Demás ingresos',
  '609 - Consolidación',
  '610 - Residentes en el Extranjero',
  '611 - Ingresos por Dividendos',
  '612 - Personas Físicas con Actividades Empresariales',
  '614 - Ingresos por intereses',
  '615 - Régimen de los ingresos por obtención de premios',
  '616 - Sin obligaciones fiscales',
  '620 - Sociedades Cooperativas de Producción',
  '621 - Incorporación Fiscal',
  '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623 - Opcional para Grupos de Sociedades',
  '624 - Coordinados',
  '625 - Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626 - Simplificado de Confianza (RESICO)',
]

const TIPOS_TERCERO = [
  { val: '04', label: '04 - Proveedor Nacional' },
  { val: '05', label: '05 - Proveedor Extranjero' },
  { val: '06', label: '06 - Cliente Nacional' },
  { val: '15', label: '15 - Arrendadora de Bienes' },
  { val: '17', label: '17 - Prestador de Servicios Profesionales' },
]

function validarRFC(rfc) {
  if (!rfc) return null
  const personaMoral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/i
  const personaFisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i
  if (personaMoral.test(rfc)) return 'moral'
  if (personaFisica.test(rfc)) return 'fisica'
  return 'invalido'
}

export default function Proveedores() {
  const { empresaId } = useCliente()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState('lista')
  const [provActivo, setProvActivo] = useState(null)

  const [nombre, setNombre] = useState('')
  const [rfc, setRfc] = useState('')
  const [regimenFiscal, setRegimenFiscal] = useState('')
  const [clabe, setClabe] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tipoTercero, setTipoTercero] = useState('04')
  const [tipoOperacion, setTipoOperacion] = useState('85')
  const [esEfos, setEsEfos] = useState(false)
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const rfcValido = validarRFC(rfc)

  useEffect(() => { if (empresaId) cargar() }, [empresaId])

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId).order('nombre')
    setProveedores(data || [])
    setLoading(false)
  }

  const guardar = async () => {
    if (!empresaId || !nombre) return
    setGuardando(true)
    const payload = { empresa_id: empresaId, nombre, rfc: rfc.toUpperCase(), regimen_fiscal: regimenFiscal, clabe, email, telefono, tipo_tercero: tipoTercero, tipo_operacion: tipoOperacion, es_efos: esEfos, notas }
    let data
    if (provActivo) {
      const res = await supabase.from('proveedores').update(payload).eq('id', provActivo.id).select().single()
      data = res.data
      setProveedores(prev => prev.map(p => p.id === provActivo.id ? data : p))
    } else {
      const res = await supabase.from('proveedores').insert(payload).select().single()
      data = res.data
      setProveedores(prev => [data, ...prev])
    }
    setModo('lista')
    setGuardando(false)
  }

  const resetForm = () => { setNombre(''); setRfc(''); setRegimenFiscal(''); setClabe(''); setEmail(''); setTelefono(''); setTipoTercero('04'); setTipoOperacion('85'); setEsEfos(false); setNotas(''); setProvActivo(null) }

  const abrirEditar = (p) => {
    setProvActivo(p); setNombre(p.nombre); setRfc(p.rfc || ''); setRegimenFiscal(p.regimen_fiscal || ''); setClabe(p.clabe || ''); setEmail(p.email || ''); setTelefono(p.telefono || ''); setTipoTercero(p.tipo_tercero || '04'); setTipoOperacion(p.tipo_operacion || '85'); setEsEfos(p.es_efos || false); setNotas(p.notas || ''); setModo('form')
  }

  const card = { background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 18 }
  const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151', ...extra })
  const inp = { width: '100%', padding: '8px 11px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 12, color: '#374151', outline: 'none', boxSizing: 'border-box' }

  if (modo === 'form') return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => { setModo('lista'); resetForm() }} style={btn()}>← Volver</button>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#0f172a' }}>{provActivo ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Datos generales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Nombre / Razón Social *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} style={inp} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>RFC</label>
                <input value={rfc} onChange={e => { setRfc(e.target.value.toUpperCase()); if (validarRFC(e.target.value) !== 'invalido') { setTipoTercero('04'); setTipoOperacion('85') } }} style={{ ...inp, borderColor: rfc ? (rfcValido === 'invalido' ? '#fca5a5' : '#86efac') : '#e5e7eb' }} />
                {rfc && (
                  <div style={{ fontSize: 10, marginTop: 4, color: rfcValido === 'invalido' ? '#dc2626' : '#16a34a' }}>
                    {rfcValido === 'moral' ? '✓ Persona Moral' : rfcValido === 'fisica' ? '✓ Persona Física' : '✗ RFC con formato inválido'}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>CLABE Interbancaria</label>
                <input value={clabe} onChange={e => setClabe(e.target.value)} maxLength={18} style={{ ...inp, borderColor: clabe && clabe.length !== 18 ? '#fca5a5' : '#e5e7eb' }} />
                {clabe && clabe.length !== 18 && <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4 }}>La CLABE debe tener 18 dígitos ({clabe.length}/18)</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Correo electrónico</label>
                <input value={email} onChange={e => setEmail(e.target.value)} style={inp} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Teléfono</label>
                <input value={telefono} onChange={e => setTelefono(e.target.value)} style={inp} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Régimen Fiscal</label>
                <select value={regimenFiscal} onChange={e => setRegimenFiscal(e.target.value)} style={{ ...inp, background: 'white' }}>
                  <option value="">Seleccionar régimen...</option>
                  {REGIMENES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Datos DIOT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Tipo de Tercero</label>
                <select value={tipoTercero} onChange={e => setTipoTercero(e.target.value)} style={{ ...inp, background: 'white' }}>
                  {TIPOS_TERCERO.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Tipo de Operación</label>
                <input value={tipoOperacion} onChange={e => setTipoOperacion(e.target.value)} style={inp} placeholder="85" />
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>85 = Servicios profesionales (default)</div>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Semáforo Legal — Lista 69-B (EFOS)</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                [false, '✅ Proveedor Verificado', '#f0fdf4', '#16a34a', '#bbf7d0'],
                [true,  '🚨 Marcado como EFOS',   '#FCEBEB', '#A32D2D', '#FECACA'],
              ].map(([val, lbl, bg, color, border]) => (
                <button key={String(val)} onClick={() => setEsEfos(val)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1.5px solid ${esEfos === val ? border : '#e5e7eb'}`, background: esEfos === val ? bg : 'white', color: esEfos === val ? color : '#6b7280' }}>
                  {lbl}
                </button>
              ))}
            </div>
            {esEfos && (
              <div style={{ marginTop: 10, background: '#FCEBEB', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#A32D2D' }}>
                ⚠️ Este proveedor aparece en la Lista 69-B del CFF (EFOS). Las operaciones con este proveedor pueden no ser deducibles y generan responsabilidad solidaria. Se recomienda no realizar operaciones hasta aclarar su situación fiscal.
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 5 }}>Notas internas</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Resumen</div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>RFC</div>
            <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{rfc || '—'}</div>
            {rfcValido && rfcValido !== 'invalido' && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>✓ {rfcValido === 'moral' ? 'Persona Moral' : 'Persona Física'}</div>}
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>DIOT</div>
            <div style={{ fontSize: 12 }}>Tercero: <strong>{tipoTercero}</strong> · Operación: <strong>{tipoOperacion}</strong></div>
          </div>
          <div style={{ background: esEfos ? '#FCEBEB' : '#f0fdf4', borderRadius: 8, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: esEfos ? '#A32D2D' : '#16a34a' }}>
              {esEfos ? '🚨 EFOS — Riesgo alto' : '✅ Sin alertas legales'}
            </div>
          </div>
          <button onClick={guardar} disabled={guardando || !nombre}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: nombre ? 'pointer' : 'not-allowed', background: '#1e2a4a', color: 'white', border: 'none', opacity: nombre ? 1 : 0.5 }}>
            {guardando ? 'Guardando...' : '💾 Guardar proveedor'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 28, background: '#F8F9FA', minHeight: '100vh', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Catálogo de Proveedores</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{proveedores.length} proveedores registrados</div>
        </div>
        <button onClick={() => { resetForm(); setModo('form') }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Cargando...</div>
        ) : proveedores.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', marginBottom: 6 }}>Sin proveedores</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Agrega tu primer proveedor al catálogo</div>
            <button onClick={() => { resetForm(); setModo('form') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: '#1e2a4a', color: 'white', border: 'none' }}>
              <Plus size={13} /> Nuevo proveedor
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Proveedor','RFC','Régimen','DIOT','CLABE','Estatus','Acciones'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '9px 12px', borderBottom: '0.5px solid #f3f4f6', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores.map(p => (
                <tr key={p.id} onMouseEnter={e => e.currentTarget.style.background='#f9fafb'} onMouseLeave={e => e.currentTarget.style.background='white'}>
                  <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a' }}>{p.nombre}</div>
                    {p.email && <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.email}</div>}
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontFamily: 'monospace', fontSize: 11 }}>{p.rfc || '—'}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 11, color: '#6b7280', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.regimen_fiscal?.split(' - ')[0] || '—'}</div>
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontSize: 11, color: '#6b7280' }}>{p.tipo_tercero} / {p.tipo_operacion}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6', fontFamily: 'monospace', fontSize: 10, color: '#6b7280' }}>{p.clabe ? `****${p.clabe.slice(-4)}` : '—'}</td>
                  <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                    {p.es_efos
                      ? <span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>🚨 EFOS</span>
                      : <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500 }}>✅ OK</span>}
                  </td>
                  <td style={{ padding: '11px 12px', borderBottom: '0.5px solid #f3f4f6' }}>
                    <button onClick={() => abrirEditar(p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 8, fontSize: 11, cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#374151' }}>
                      <Eye size={12} /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}