'use client'
export default function Ventas() {
  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f8fafc',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Ventas y Facturación</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:24}}>CFDI 4.0, cotizaciones y pedidos</div>
      <div style={{background:'white',borderRadius:12,border:'0.5px solid #e5e7eb',padding:32,textAlign:'center',color:'#9ca3af'}}>
        <div style={{fontSize:40,marginBottom:12}}>🧾</div>
        <div style={{fontSize:15,fontWeight:500,color:'#374151',marginBottom:8}}>Módulo de Ventas</div>
        <div style={{fontSize:13,marginBottom:16}}>Este módulo estará disponible próximamente</div>
        <a href="/facturas" style={{padding:'10px 20px',background:'#185FA5',color:'white',borderRadius:8,textDecoration:'none',fontSize:13,fontWeight:500}}>Ir a Facturas CFDI →</a>
      </div>
    </div>
  )
}