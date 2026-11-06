import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { toast } from 'sonner'
import { importarAvisosSinoe, type ResultadoSinoe } from '@/application/casos-uso/sinoe'
import { useContenedor, useDatos } from './contexto'
import { exito } from './notificar'

/**
 * Revisión automática del Gmail del SINOE mientras la app está abierta:
 * al entrar, cada 10 minutos y al volver a la pestaña (si pasaron más de 2 minutos).
 */
const CADA = 10 * 60_000
const AL_VOLVER = 2 * 60_000

interface EstadoSinoe {
  configurado: boolean
  revisando: boolean
  ultima?: Date
  ultimoResultado?: ResultadoSinoe
  error?: string
  revisar: (manual?: boolean) => Promise<void>
}

const Ctx = createContext<EstadoSinoe>({ configurado: false, revisando: false, revisar: async () => {} })
export const useSinoe = () => useContext(Ctx)

export function ProveedorSinoe({ children }: { children: ReactNode }) {
  const c = useContenedor()
  const { config, cargando } = useDatos()

  const url = config.gmailUrl
  const clave = config.gmailToken
  const configurado = Boolean(url && clave)
  const [revisando, setRevisando] = useState(false)
  const [ultima, setUltima] = useState<Date>()
  const [ultimoResultado, setResultado] = useState<ResultadoSinoe>()
  const [error, setError] = useState<string>()
  const enCurso = useRef(false)
  const ultimaRef = useRef(0)

  const revisar = useCallback(
    async (manual = false) => {
      if (!url || !clave || enCurso.current) return
      enCurso.current = true
      setRevisando(true)
      try {
        const r = await importarAvisosSinoe(c, await c.gmail.mensajes(url, clave))
        setResultado(r)
        setError(undefined)
        if (r.nuevas.length) {
          exito(r.nuevas.length === 1 ? 'Llegó 1 aviso del SINOE' : `Llegaron ${r.nuevas.length} avisos del SINOE`, {
            pose: 'documento',
            descripcion: 'Ya están en la bandeja. Define el plazo de cada uno.',
          })
        } else if (manual) {
          toast.info('No hay avisos nuevos del SINOE')
        }
      } catch (e) {
        const m = (e as Error).message
        setError(m)
        if (manual) toast.error(m)
      } finally {
        ultimaRef.current = Date.now()
        setUltima(new Date())
        setRevisando(false)
        enCurso.current = false
      }
    },
    [c, url, clave],
  )

  useEffect(() => {
    if (!configurado || cargando) return
    void revisar()
    const intervalo = window.setInterval(() => void revisar(), CADA)
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimaRef.current > AL_VOLVER) void revisar()
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [configurado, cargando, revisar])


  return <Ctx.Provider value={{ configurado, revisando, ultima, ultimoResultado, error, revisar }}>{children}</Ctx.Provider>
}
