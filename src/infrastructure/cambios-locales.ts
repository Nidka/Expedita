import type { Contenedor } from '@/application/contenedor'
import type { CanalCambios } from '@/application/ports'

/** Repositorio del contenedor → tabla que hay que recargar en la interfaz cuando se escribe en él. */
const TABLA_DE: Partial<Record<keyof Contenedor, string>> = {
  expedientes: 'expedientes',
  acciones: 'acciones',
  notificaciones: 'notificaciones',
  audiencias: 'audiencias',
  visitas: 'visitas',
  juzgados: 'juzgados',
  config: 'config',
}

/** Métodos que solo leen: no disparan recarga. Todo lo demás se considera escritura. */
const LECTURAS = new Set(['listar', 'obtener', 'porNumero', 'listarConItems', 'feriados', 'datosIntegracion', 'constructor'])

/**
 * Las escrituras propias se reflejan al instante, sin depender de que Realtime devuelva el evento
 * (puede tardar, perder la conexión o no enviar los borrados filtrados). Realtime sigue trayendo
 * los cambios de los demás usuarios.
 */
export function conCambiosLocales(c: Contenedor): Contenedor {
  const oyentes = new Set<(tabla: string) => void>()
  const avisar = (tabla: string) => oyentes.forEach((f) => f(tabla))

  const envolver = <T extends object>(repo: T, tabla: string): T =>
    new Proxy(repo, {
      get(objetivo, prop, receptor) {
        const valor = Reflect.get(objetivo, prop, receptor)
        if (typeof valor !== 'function' || typeof prop !== 'string' || LECTURAS.has(prop)) return valor
        return (...args: unknown[]) => {
          const r = valor.apply(objetivo, args)
          if (r instanceof Promise) return r.then((x) => (avisar(tabla), x))
          avisar(tabla)
          return r
        }
      },
    })

  const remoto = c.cambios
  const cambios: CanalCambios = {
    suscribir(tablas, alCambiar) {
      const local = (t: string) => {
        if (tablas.includes(t)) alCambiar(t)
      }
      oyentes.add(local)
      const quitarRemoto = remoto.suscribir(tablas, alCambiar)
      return () => {
        oyentes.delete(local)
        quitarRemoto()
      }
    },
  }

  const out = { ...c, cambios } as Contenedor
  for (const [clave, tabla] of Object.entries(TABLA_DE) as [keyof Contenedor, string][]) {
    const repo = c[clave]
    if (repo && typeof repo === 'object') (out as unknown as Record<string, unknown>)[clave] = envolver(repo, tabla)
  }
  return out
}
