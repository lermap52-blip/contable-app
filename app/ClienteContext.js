'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

const ClienteContext = createContext(null)

export function ClienteProvider({ children }) {
  const [clientes, setClientes] = useState([])
  const [clienteActivo, setClienteActivo] = useState(null)
  const [perfilMaestro, setPerfilMaestro] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    inicializar()
  }, [])

  const inicializar = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUser(user)

    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', user.id)
      .single()

    if (empresa) {
      const maestro = {
        id: user.id,
        nombre: empresa.razon_social || user.email?.split('@')[0] || 'Mi Despacho',
        rfc: empresa.rfc || '',
        regimen_fiscal: empresa.regimen_fiscal || 'RESICO',
        esMaestro: true,
        empresa_id: user.id,
      }
      setPerfilMaestro(maestro)
    }

    const { data: contactos } = await supabase
      .from('contactos')
      .select('*')
      .eq('empresa_id', user.id)
      .eq('tipo', 'cliente')
      .order('nombre', { ascending: true })

    setClientes(contactos || [])

    const savedId = localStorage.getItem('cliente_activo_id')
    if (savedId && savedId !== 'maestro' && contactos) {
      const encontrado = contactos.find(c => c.id === savedId)
      if (encontrado) {
        setClienteActivo(encontrado)
        setLoading(false)
        return
      }
    }

    setClienteActivo(null)
    setLoading(false)
  }

  const seleccionarCliente = (cliente) => {
    setClienteActivo(cliente)
    if (cliente) {
      localStorage.setItem('cliente_activo_id', cliente.id)
    } else {
      localStorage.removeItem('cliente_activo_id')
    }
  }

  const esModoMaestro = !clienteActivo

  const diasParaVencimiento = (fecha) => {
    if (!fecha) return null
    const hoy = new Date()
    const vence = new Date(fecha)
    return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
  }

  const empresaId = user?.id
  const rfcActivo = clienteActivo?.rfc || null

  return (
    <ClienteContext.Provider value={{
      clientes,
      clienteActivo,
      seleccionarCliente,
      perfilMaestro,
      esModoMaestro,
      loading,
      user,
      empresaId,
      rfcActivo,
      cargarClientes: inicializar,
      diasParaVencimiento,
    }}>
      {children}
    </ClienteContext.Provider>
  )
}

export function useCliente() {
  const ctx = useContext(ClienteContext)
  if (!ctx) throw new Error('useCliente debe usarse dentro de ClienteProvider')
  return ctx
}