import type { Expediente } from '../entidades'

/** Archivo de Drive tal como lo informa el script del estudio (solo metadatos; el archivo sigue en Drive). */
export interface ArchivoDrive {
  id: string
  nombre: string
  tipo: string
  url: string
  actualizado: string
  tamano?: number
}

export interface CarpetaDrive {
  id: string
  nombre: string
  url: string
  actualizado: string
  archivos: ArchivoDrive[]
  subcarpetas: CarpetaDrive[]
}

export interface CatalogoDrive {
  raiz: string
  generado: string
  carpetas: CarpetaDrive[]
}

const VACIAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'sac', 'sa', 'saa', 'eirl', 'srl', 'scrl', 'cia', 'ficticio'])

/** «María  PÉREZ (ficticio)» → ['maria','perez'] */
export function tokensNombre(nombre: string): string[] {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1 && !VACIAS.has(t))
}

/**
 * Similitud entre dos nombres, de 0 a 1, sin importar el orden de las palabras
 * («Pérez María» = «María Pérez»). 1 si todas las palabras del más corto están en el otro.
 */
export function similitud(a: string, b: string): number {
  const ta = new Set(tokensNombre(a))
  const tb = new Set(tokensNombre(b))
  if (!ta.size || !tb.size) return 0
  let comunes = 0
  for (const t of ta) if (tb.has(t)) comunes++
  const menor = Math.min(ta.size, tb.size)
  // Si el nombre corto tiene una sola palabra, exigir igualdad total para evitar falsos positivos
  if (menor === 1) return ta.size === tb.size && comunes === 1 ? 1 : 0
  return comunes / menor
}

export const UMBRAL_SIMILITUD = 0.75

/** Carpeta de cliente que mejor corresponde al expediente (por cliente o, si no hay, por demandante). */
export function carpetaDeCliente(exp: Pick<Expediente, 'cliente' | 'demandante'>, carpetas: readonly CarpetaDrive[]): CarpetaDrive | undefined {
  const nombre = exp.cliente || exp.demandante
  if (!nombre) return undefined
  let mejor: CarpetaDrive | undefined
  let puntaje = 0
  for (const c of carpetas) {
    const s = similitud(nombre, c.nombre)
    if (s > puntaje) {
      puntaje = s
      mejor = c
    }
  }
  return puntaje >= UMBRAL_SIMILITUD ? mejor : undefined
}

/** Si dentro de la carpeta del cliente hay una subcarpeta con el número del expediente, se usa esa. */
export function carpetaDeExpediente(numero: string, carpetaCliente: CarpetaDrive): CarpetaDrive {
  const clave = numero.slice(0, 10) // «01234-2025»
  const corto = String(Number(numero.slice(0, 5))) + '-' + numero.slice(6, 10) // «1234-2025»
  const sub = carpetaCliente.subcarpetas.find((s) => s.nombre.includes(clave) || s.nombre.includes(corto))
  return sub ?? carpetaCliente
}

/** Busca una carpeta por id en todo el catálogo (para la asignación manual). */
export function buscarCarpeta(catalogo: CatalogoDrive, id: string): CarpetaDrive | undefined {
  const pila = [...catalogo.carpetas]
  while (pila.length) {
    const c = pila.pop()!
    if (c.id === id) return c
    pila.push(...c.subcarpetas)
  }
  return undefined
}

export interface ResultadoEmparejamiento {
  porExpediente: Map<string, CarpetaDrive>
  sinCarpeta: Expediente[]
  carpetasSinExpediente: CarpetaDrive[]
}

/** Empareja todos los expedientes; la asignación manual (driveCarpetaId) tiene prioridad. */
export function emparejar(expedientes: readonly Expediente[], catalogo: CatalogoDrive): ResultadoEmparejamiento {
  const porExpediente = new Map<string, CarpetaDrive>()
  const usadas = new Set<string>()
  const sinCarpeta: Expediente[] = []
  for (const e of expedientes) {
    const manual = e.driveCarpetaId ? buscarCarpeta(catalogo, e.driveCarpetaId) : undefined
    const cliente = manual ?? carpetaDeCliente(e, catalogo.carpetas)
    if (!cliente) {
      sinCarpeta.push(e)
      continue
    }
    const final = manual ?? carpetaDeExpediente(e.numero, cliente)
    porExpediente.set(e.id, final)
    usadas.add(cliente.id)
    usadas.add(final.id)
  }
  return {
    porExpediente,
    sinCarpeta,
    carpetasSinExpediente: catalogo.carpetas.filter((c) => !usadas.has(c.id)),
  }
}
