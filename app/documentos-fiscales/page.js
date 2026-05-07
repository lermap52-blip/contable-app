'use client'
import { useState, useRef } from 'react'

const categorias = [
  { id: 'legal', label: 'Legal y Corporativo', sub: 'Actas, Poderes, Titulos', icon: '⚖️' },
  { id: 'laboral', label: 'Laboral', sub: 'Contratos, Reglamentos', icon: '👥' },
  { id: 'comercial', label: 'Contratos Comerciales', sub: 'Arrendamientos, Proveedores', icon: '🤝' },
  { id: 'seguros', label: 'Seguros y Permisos', sub: 'Polizas, Licencias', icon: '🛡️' },
]

function FileIcon({ nombre }) {
  const ext = nombre.split('.').pop().toLowerCase()
  if (ext === 'pdf') return (
    <div style={{width:32,height:32,borderRadius:6,background:'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#A32D2D',flexShrink:0}}>PDF</div>
  )
  if (ext === 'doc' || ext === 'docx') return (
    <div style={{width:32,height:32,borderRadius:6,background:'#E6F1FB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#185FA5',flexShrink:0}}>DOC</div>
  )
  return (
    <div style={{width:32,height:32,borderRadius:6,background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#6b7280',flexShrink:0}}>
      {ext.toUpperCase().slice(0,3)}
    </div>
  )
}

export default function Documentos() {
  const [archivos, setArchivos] = useState({legal:[],laboral:[],comercial:[],seguros:[]})
  const [catActiva, setCatActiva] = useState('legal')
  const [drag, setDrag] = useState(false)
  const [search, setSearch] = useState('')
  const fileRef = useRef()

  const handleFiles = (files, cat) => {
    const nuevos = Array.from(files)
      .filter(f => /\.(pdf|doc|docx)$/i.test(f.name))
      .map(f => ({
        id: Date.now() + Math.random(),
        nombre: f.name,
        tamanio: (f.size / 1024).toFixed(1) + ' KB',
        fecha: new Date().toLocaleDateString('es-MX'),
        url: URL.createObjectURL(f),
      }))
    if (nuevos.length === 0) return
    setArchivos(prev => ({ ...prev, [cat]: [...prev[cat], ...nuevos] }))
  }

  const eliminar = (cat, id) => {
    if (!window.confirm('Eliminar este archivo?')) return
    setArchivos(prev => ({ ...prev, [cat]: prev[cat].filter(a => a.id !== id) }))
  }

  const archivosFiltrados = archivos[catActiva].filter(a =>
    a.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const totalArchivos = Object.values(archivos).reduce((a, v) => a + v.length, 0)

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Documentos fiscales</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:18}}>Repositorio de documentos externos · {totalArchivos} archivos</div>

      <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:16}}>

        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {categorias.map(cat => (
            <div key={cat.id} onClick={() => setCatActiva(cat.id)}
              style={{background:catActiva===cat.id?'white':'transparent',border:`0.5px solid ${catActiva===cat.id?'#e5e7eb':'transparent'}`,borderRadius:10,padding:'12px 14px',cursor:'pointer',borderLeft:catActiva===cat.id?'3px solid #185FA5':'3px solid transparent'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                <span style={{fontSize:18}}>{cat.icon}</span>
                <span style={{fontSize:13,fontWeight:500,color:catActiva===cat.id?'#185FA5':'#1f2937'}}>{cat.label}</span>
              </div>
              <div style={{fontSize:11,color:'#9ca3af',paddingLeft:26}}>{cat.sub}</div>
              <div style={{fontSize:10,color:'#9ca3af',paddingLeft:26,marginTop:2}}>{archivos[cat.id].length} archivos</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flex:1,background:'white',border:'0.5px solid #e5e7eb',borderRadius:999,padding:'10px 18px'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar documentos..." style={{border:'none',outline:'none',fontSize:13,color:'#1f2937',background:'transparent',width:'100%'}} />
            </div>
            <button onClick={() => fileRef.current.click()}
              style={{padding:'9px 16px',background:'#185FA5',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer',whiteSpace:'nowrap'}}>
              + Subir documento
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" multiple style={{display:'none'}}
              onChange={e => { handleFiles(e.target.files, catActiva); e.target.value = '' }} />
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files, catActiva) }}
            onClick={() => fileRef.current.click()}
            style={{border:`2px dashed ${drag?'#185FA5':'#e5e7eb'}`,borderRadius:12,padding:24,textAlign:'center',background:drag?'#E6F1FB':'white',marginBottom:14,cursor:'pointer',transition:'all 0.2s'}}>
            <div style={{fontSize:28,marginBottom:8}}>📁</div>
            <div style={{fontSize:14,fontWeight:500,color:'#1f2937',marginBottom:4}}>
              Arrastra archivos a {categorias.find(c=>c.id===catActiva)?.label}
            </div>
            <div style={{fontSize:12,color:'#9ca3af'}}>Acepta PDF, DOC y DOCX</div>
          </div>

          <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',overflow:'hidden'}}>
            {archivosFiltrados.length === 0 ? (
              <div style={{padding:32,textAlign:'center',color:'#9ca3af',fontSize:13}}>
                No hay documentos en esta categoria — sube el primero
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr>
                    {['Tipo','Nombre','Tamanio','Fecha','Acciones'].map(h => (
                      <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,fontWeight:500,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.06em',borderBottom:'0.5px solid #e5e7eb',background:'#f9fafb'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archivosFiltrados.map((a,i) => (
                    <tr key={a.id} style={{background:i%2===1?'#f9fafb':'white'}}>
                      <td style={{padding:'10px 14px'}}><FileIcon nombre={a.nombre} /></td>
                      <td style={{padding:'10px 14px',fontWeight:500,color:'#1f2937',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.nombre}</td>
                      <td style={{padding:'10px 14px',color:'#6b7280'}}>{a.tamanio}</td>
                      <td style={{padding:'10px 14px',color:'#6b7280'}}>{a.fecha}</td>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{display:'flex',gap:8,alignItems:'center'}}>
                          <a href={a.url} download={a.nombre}
                            style={{fontSize:11,padding:'4px 10px',background:'#E6F1FB',border:'none',borderRadius:6,cursor:'pointer',color:'#185FA5',textDecoration:'none'}}>
                            Descargar
                          </a>
                          <button onClick={() => eliminar(catActiva, a.id)}
                            style={{padding:'4px 6px',background:'none',border:'none',cursor:'pointer'}}
                            onMouseEnter={e => e.currentTarget.querySelector('svg').setAttribute('stroke','#A32D2D')}
                            onMouseLeave={e => e.currentTarget.querySelector('svg').setAttribute('stroke','#9ca3af')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M8 6V4h8v2"/>
                              <rect x="5" y="6" width="14" height="15" rx="2"/>
                              <line x1="9" y1="11" x2="9" y2="17"/>
                              <line x1="12" y1="11" x2="12" y2="17"/>
                              <line x1="15" y1="11" x2="15" y2="17"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}