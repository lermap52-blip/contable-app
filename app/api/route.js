import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { messages } = await req.json()

    const historial = messages
      .filter(m => m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    if (historial.length === 0) {
      return NextResponse.json({ texto: 'Escribe tu pregunta.' })
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

    const body = {
      system_instruction: {
        parts: [{ text: 'Eres un asistente fiscal y contable experto en el sistema tributario mexicano. Ayudas con dudas sobre RESICO, IVA, ISR, CFDI, SAT, declaraciones, e.firma, facturacion electronica, deducciones y retenciones en Mexico. Responde claro, conciso y amigable. Usa emojis.' }]
      },
      contents: historial,
      generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data))
      return NextResponse.json({ texto: `Error ${response.status}: ${data?.error?.message || 'Error desconocido'}` })
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta.'
    return NextResponse.json({ texto })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ texto: 'Error interno: ' + error.message }, { status: 500 })
  }
}