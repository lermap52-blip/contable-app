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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'Eres un asistente fiscal y contable experto en el sistema tributario mexicano. Ayudas con dudas sobre RESICO, IVA, ISR, CFDI, SAT, declaraciones, e.firma, facturacion electronica, deducciones y retenciones en Mexico. Responde claro, conciso y amigable. Usa emojis.' }]
          },
          contents: historial,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    )

    const data = await response.json()

    if (data.error) {
      console.error('Gemini error:', data.error)
      return NextResponse.json({ texto: 'Error de API: ' + data.error.message }, { status: 500 })
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu pregunta.'
    return NextResponse.json({ texto })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}