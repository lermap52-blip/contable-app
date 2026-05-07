'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n) { return '$'+Math.round(n).toLocaleString('es-MX') }

const tasaResico = (ing) => {
  if (ing <= 25000) return 0.01
  if (ing <= 50000) return 0.011
  if (ing <= 83333) return 0.015
  if (ing <= 208333) return 0.02
  return 0.025
}

export default function Impuestos() {
  const [mesActivo, setMesActivo] = useState(new Date().getMonth())
  const [anio] = useState(new Date().getFullYear())
  const [datosMes, setDatosMes] = useState([])
  const [estatusMes, setEstatusMes] = useState(Array(12).fill('pendiente'))
  const [loading, setLoading] = useState(true)
  const chartRef = useRef()
  const chartInstance = useRef()

  useEffect(() => { cargarDatos() }, [])
  useEffect(() => { if (!loading) renderChart() }, [mesActivo, datosMes, loading])

  const cargarDatos = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const inicio = `${anio}-01-01`
    const fin = `${anio}-12-31`
    const { data: movs } = await supabase
      .from('movimientos')
      .select('*')
      .eq('empresa_id', user.id)
      .gte('fecha_operacion', inicio)
      .lte('fecha_operacion', fin)

    const mesesData = Array(12).fill(null).map((_,i) => {
      const mesMovs = (movs||[]).filter(m => new Date(m.fecha_operacion).getMonth() === i)
      const ingresos = mesMovs.filter(m => m.tipo === 'ingreso').reduce((a,m) => a+Number(m.monto), 0)
      const egresos = mesMovs.filter(m => m.tipo === 'egreso').reduce((a,m) => a+Number(m.monto), 0)
      const ivaCobrado = ingresos * 0.16
      const ivaPagado = egresos * 0.16
      const isr = ingresos * tasaResico(ingresos)
      return { ing: ingresos, egr: egresos, iva_cobrado: ivaCobrado, iva_pagado: ivaPagado, isr }
    })

    setDatosMes(mesesData)
    setLoading(false)
  }

  const renderChart = () => {
    if (!chartRef.current) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: MESES.map(m => m+' '+String(anio).slice(2)),
        datasets: [
          {
            label: 'IVA a pagar',
            data: datosMes.map(d => Math.round(d ? d.iva_cobrado - d.iva_pagado : 0)),
            backgroundColor: datosMes.map((_,i) => i===mesActivo ? '#185FA5' : '#B5D4F4'),
            borderRadius: 4,
            barPercentage: 0.4,
            categoryPercentage: 0.6,
          },
          {
            label: 'ISR estimado',
            data: datosMes.map(d => Math.round(d ? d.isr : 0)),
            backgroundColor: datosMes.map((_,i) => i===mesActivo ? '#3B6D11' : '#C0DD97'),
            borderRadius: 4,
            barPercentage: 0.4,
            categoryPercentage: 0.6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 11 }, autoSkip: false }, grid: { display: false } },
          y: { ticks: { callback: v => '$'+Math.round(v).toLocaleString('es-MX'), font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    })
  }

  const cambiarEstatus = () => {
    const opts = ['pendiente','declarado','pagado']
    const nuevo = [...estatusMes]
    nuevo[mesActivo] = opts[(opts.indexOf(nuevo[mesActivo])+1)%3]
    setEstatusMes(nuevo)
  }

  const badgeStyle = (e) => {
    if (e==='pagado') return {background:'#EAF3DE',color:'#3B6D11'}
    if (e==='declarado') return {background:'#E6F1FB',color:'#185FA5'}
    return {background:'#FAEEDA',color:'#854F0B'}
  }

  const badgeLabel = (e) => e==='pagado'?'Pagado':e==='declarado'?'Declarado':'Pendiente de declarar'

  const d = datosMes[mesActivo] || { ing:0, egr:0, iva_cobrado:0, iva_pagado:0, isr:0 }
  const ivaDif = d.iva_cobrado - d.iva_pagado
  const tasa = tasaResico(d.ing)
  const estatus = estatusMes[mesActivo]

  return (
    <div style={{padding:28,fontFamily:'system-ui,sans-serif',background:'#f3f4f6',minHeight:'100vh'}}>
      <div style={{fontSize:18,fontWeight:600,color:'#1f2937',marginBottom:2}}>Impuestos</div>
      <div style={{fontSize:13,color:'#6b7280',marginBottom:18}}>Resumen de liquidacion mensual · {anio}</div>

      {/* Tabs meses */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:18}}>
        {MESES.map((m,i) => (
          <button key={m} onClick={() => setMesActivo(i)}
            style={{padding:'6px 14px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:13,cursor:'pointer',background:mesActivo===i?'#185FA5':'white',color:mesActivo===i?'#E6F1FB':'#6b7280',borderColor:mesActivo===i?'#185FA5':'#e5e7eb'}}>
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:48,color:'#9ca3af'}}>Cargando datos...</div>
      ) : (
        <>
          {/* Tarjetas */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
            {[
              {label:'Total ingresos',val:fmt(d.ing),color:'#3B6D11'},
              {label:'Total egresos',val:fmt(d.egr),color:'#A32D2D'},
              {label:'IVA a pagar al SAT',val:fmt(ivaDif),color:'#A32D2D'},
              {label:'ISR estimado RESICO',val:fmt(d.isr),color:'#185FA5'},
            ].map(c => (
              <div key={c.label} style={{background:'#f9fafb',borderRadius:8,padding:'12px 14px'}}>
                <div style={{fontSize:11,color:'#6b7280',marginBottom:4}}>{c.label}</div>
                <div style={{fontSize:22,fontWeight:500,color:c.color}}>{c.val}</div>
              </div>
            ))}
          </div>

          {/* IVA */}
          <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',padding:'16px 18px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:14,fontWeight:500,color:'#1f2937'}}>Calculo de IVA</span>
              <span onClick={cambiarEstatus} style={{...badgeStyle(estatus),fontSize:11,padding:'4px 12px',borderRadius:20,fontWeight:500,cursor:'pointer'}}>
                {badgeLabel(estatus)}
              </span>
            </div>
            {[
              {lbl:'IVA cobrado a clientes',val:fmt(d.iva_cobrado),color:'#A32D2D'},
              {lbl:'IVA pagado a proveedores',val:fmt(d.iva_pagado),color:'#3B6D11'},
            ].map(r => (
              <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid #f3f4f6',fontSize:13}}>
                <span style={{color:'#6b7280'}}>{r.lbl}</span>
                <span style={{fontWeight:500,color:r.color}}>{r.val}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'#f9fafb',borderRadius:8,marginTop:10}}>
              <span style={{fontSize:13,color:'#6b7280'}}>Diferencia a pagar al SAT</span>
              <span style={{fontSize:20,fontWeight:500,color:'#A32D2D'}}>{fmt(ivaDif)}</span>
            </div>
          </div>

          {/* ISR */}
          <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',padding:'16px 18px',marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:500,color:'#1f2937',marginBottom:10}}>Calculo de ISR (RESICO)</div>
            {[
              {lbl:'Ingresos acumulables',val:fmt(d.ing),color:'#1f2937'},
              {lbl:'Deducciones autorizadas',val:fmt(d.egr),color:'#3B6D11'},
              {lbl:'Tasa RESICO aplicable',val:(tasa*100).toFixed(2)+'%',color:'#185FA5'},
            ].map(r => (
              <div key={r.lbl} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'0.5px solid #f3f4f6',fontSize:13}}>
                <span style={{color:'#6b7280'}}>{r.lbl}</span>
                <span style={{fontWeight:500,color:r.color}}>{r.val}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'#f9fafb',borderRadius:8,marginTop:10}}>
              <span style={{fontSize:13,color:'#6b7280'}}>ISR estimado a pagar</span>
              <span style={{fontSize:20,fontWeight:500,color:'#185FA5'}}>{fmt(d.isr)}</span>
            </div>
          </div>

          {/* Acuse */}
          <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',padding:'16px 18px',marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <span style={{fontSize:14,fontWeight:500,color:'#1f2937'}}>Acuse de declaracion</span>
              <button style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',border:'0.5px solid #e5e7eb',borderRadius:8,fontSize:12,cursor:'pointer',background:'white',color:'#6b7280'}}>
                ↑ Subir PDF del acuse
              </button>
            </div>
            <div style={{border:'1.5px dashed #e5e7eb',borderRadius:8,padding:20,textAlign:'center',color:'#9ca3af',fontSize:13}}>
              <div style={{fontSize:28,marginBottom:6}}>📄</div>
              Sin acuse cargado · Da clic en Subir PDF
            </div>
          </div>

          {/* Grafica */}
          <div style={{background:'white',borderRadius:10,border:'0.5px solid #e5e7eb',padding:'16px 18px'}}>
            <div style={{fontSize:14,fontWeight:500,color:'#1f2937',marginBottom:12}}>Comparativa de impuestos {anio}</div>
            <div style={{display:'flex',gap:16,marginBottom:12,fontSize:12,color:'#6b7280'}}>
              <span style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{width:10,height:10,borderRadius:2,background:'#185FA5',display:'inline-block'}}></span>IVA a pagar
              </span>
              <span style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{width:10,height:10,borderRadius:2,background:'#3B6D11',display:'inline-block'}}></span>ISR estimado
              </span>
            </div>
            <div style={{position:'relative',width:'100%',height:200}}>
              <canvas ref={chartRef} role="img" aria-label="Comparativa de IVA e ISR por mes"></canvas>
            </div>
          </div>
        </>
      )}
    </div>
  )
}