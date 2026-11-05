import type { ExpedienteImportado } from '@/domain/expediente/importacion'
import type { Contenedor } from '../contenedor'

/** RF-03: crea los expedientes nuevos y omite los que ya existen (por número). */
export async function importarExpedientes(
  c: Contenedor,
  expedientes: ExpedienteImportado[],
): Promise<{ creados: number; omitidos: string[] }> {
  const existentes = new Set((await c.expedientes.listar()).map((e) => e.numero))
  const nuevos = expedientes.filter((e) => !existentes.has(e.numero))
  if (nuevos.length) await c.expedientes.crearVarios(nuevos)
  return { creados: nuevos.length, omitidos: expedientes.filter((e) => existentes.has(e.numero)).map((e) => e.numero) }
}
