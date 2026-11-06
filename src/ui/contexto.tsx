import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { indiceUltimaAccion, type IndiceUltimaAccion } from '@/domain/agenda/que-toca-hoy'
import type { Contenedor } from '@/application/contenedor'
import type { Sesion } from '@/application/ports'
import type { Accion, Audiencia, ConfigOrg, Expediente, Juzgado, Notificacion, Visita } from '@/domain/entidades'
import { CalendarioHabil } from '@/domain/plazos/calendario-habil'
import type { Feriado } from '@/domain/plazos/feriados'

const ContenedorCtx = createContext<Contenedor | null>(null)

export function ProveedorContenedor({ contenedor, children }: { contenedor: Contenedor; children: ReactNode }) {
  return <ContenedorCtx.Provider value={contenedor}>{children}</ContenedorCtx.Provider>
}

export function useContenedor(): Contenedor {
  const c = useContext(ContenedorCtx)
  if (!c) throw new Error('Falta ProveedorContenedor')
  return c
}

// ---------- Datos del estudio en vivo ----------

export interface Datos {
  cargando: boolean
  sesion: Sesion
  expedientes: Expediente[]
  acciones: Accion[]
  notificaciones: Notificacion[]
  audiencias: Audiencia[]
  visitas: Visita[]
  juzgados: Juzgado[]
  config: ConfigOrg
  feriados: Feriado[]
  calendario: CalendarioHabil
  hoy: string
  expPorId: Map<string, Expediente>
  /** Fecha de la última acción por expediente (se calcula una vez por carga) */
  ultimaAccion: IndiceUltimaAccion
  recargar: (tabla?: string) => Promise<void>
}

const DatosCtx = createContext<Datos | null>(null)

type Tablas = Omit<Datos, 'cargando' | 'sesion' | 'calendario' | 'hoy' | 'expPorId' | 'ultimaAccion' | 'recargar'>

const VACIO: Tablas = {
  expedientes: [],
  acciones: [],
  notificaciones: [],
  audiencias: [],
  visitas: [],
  juzgados: [],
  config: { orgId: '', diasSinMovimiento: 30, diasInhabiles: [], equipoWhatsapp: [] },
  feriados: [],
}

const CARGADORES: Record<string, (c: Contenedor) => Promise<Partial<Tablas>>> = {
  expedientes: async (c) => ({ expedientes: await c.expedientes.listar() }),
  acciones: async (c) => ({ acciones: await c.acciones.listar() }),
  notificaciones: async (c) => ({ notificaciones: await c.notificaciones.listar() }),
  audiencias: async (c) => ({ audiencias: await c.audiencias.listar() }),
  visitas: async (c) => ({ visitas: await c.visitas.listarConItems() }),
  visita_items: async (c) => ({ visitas: await c.visitas.listarConItems() }),
  juzgados: async (c) => ({ juzgados: await c.juzgados.listar() }),
  config: async (c) => ({ config: await c.config.obtener(), feriados: await c.config.feriados() }),
}

export function ProveedorDatos({ sesion, children }: { sesion: Sesion; children: ReactNode }) {
  const c = useContenedor()
  const [tablas, setTablas] = useState<Tablas>(VACIO)
  const [cargando, setCargando] = useState(true)
  const pendientes = useRef(new Set<string>())
  const temporizador = useRef<number | undefined>(undefined)

  const recargar = useCallback(
    async (tabla?: string) => {
      const claves = tabla ? [tabla] : Object.keys(CARGADORES).filter((k) => k !== 'visita_items')
      const partes = await Promise.all(claves.map((k) => (CARGADORES[k] ?? CARGADORES.config)(c)))
      setTablas((t) => Object.assign({ ...t }, ...partes))
    },
    [c],
  )

  useEffect(() => {
    recargar().finally(() => setCargando(false))
    // Cambios de otros usuarios: se agrupan 300 ms para no recargar en ráfaga.
    return c.cambios.suscribir(Object.keys(CARGADORES), (tabla) => {
      pendientes.current.add(tabla === 'config_org' ? 'config' : tabla)
      window.clearTimeout(temporizador.current)
      temporizador.current = window.setTimeout(() => {
        const lote = [...pendientes.current]
        pendientes.current.clear()
        lote.forEach((t) => void recargar(t))
      }, 300)
    })
  }, [c, recargar])

  const valor = useMemo<Datos>(() => {
    const calendario = new CalendarioHabil(tablas.feriados, tablas.config.diasInhabiles)
    return {
      ...tablas,
      cargando,
      sesion,
      calendario,
      hoy: c.reloj.hoy(),
      expPorId: new Map(tablas.expedientes.map((e) => [e.id, e])),
      ultimaAccion: indiceUltimaAccion(tablas.acciones),
      recargar,
    }
  }, [tablas, cargando, sesion, c, recargar])

  return <DatosCtx.Provider value={valor}>{children}</DatosCtx.Provider>
}

export function useDatos(): Datos {
  const d = useContext(DatosCtx)
  if (!d) throw new Error('Falta ProveedorDatos')
  return d
}
