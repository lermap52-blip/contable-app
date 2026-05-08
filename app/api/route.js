const enviar = async () => {
  if (!input.trim() || loading) return
  const userMsg = input.trim()
  setInput('')
  setMessages(prev => [...prev, { role: 'user', text: userMsg }])
  setLoading(true)

  try {
    const historial = messages
      .filter((m, i) => i > 0)
      .map(m => ({ role: m.role, content: m.text }))
    historial.push({ role: 'user', content: userMsg })

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: historial })
    })
    const data = await response.json()
    setMessages(prev => [...prev, { role: 'assistant', text: data.texto || 'Ocurrio un error.' }])
  } catch {
    setMessages(prev => [...prev, { role: 'assistant', text: 'Ocurrio un error. Intenta de nuevo.' }])
  }
  setLoading(false)
}