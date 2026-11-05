import type { Expediente } from '@/domain/entidades'
import { parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { viaPorEspecialidad } from '@/domain/plazos/catalogo'
import type { Contenedor } from '../contenedor'

export interface AgregarExpedienteCmd {
  numero: string
  codigo?: string
  cliente?: string
  materia?: string
  organo?: string
}

/** Deduce el nombre del distrito judicial a partir de otros expedientes con el mismo código (p. ej. 1801). */
export function distritoConocido(numero: string, expedientes: readonly Expediente[]): string | undefined {
  const n = parsearNumeroExpediente(numero)
  if (!n) return undefined
  return expedientes.find((e) => e.distrito && parsearNumeroExpediente(e.numero)?.distrito === n.distrito)?.distrito
}

/** Alta rápida: basta el número; la vía se deduce de la especialidad. */
export async function agregarExpediente(c: Contenedor, cmd: AgregarExpedienteCmd): Promise<Expediente> {
  const n = parsearNumeroExpediente(cmd.numero)
  if (!n) throw new Error('El número no tiene el formato del Poder Judicial: 00000-0000-0-0000-XX-XX-00.')
  if (await c.expedientes.porNumero(n.valor)) throw new Error('Ese expediente ya está registrado.')
  const todos = await c.expedientes.listar()
  return c.expedientes.crear({
    numero: n.valor,
    codigo: cmd.codigo?.trim() || undefined,
    cliente: cmd.cliente?.trim() || undefined,
    materia: cmd.materia?.trim() || undefined,
    organo: cmd.organo?.trim() || undefined,
    distrito: distritoConocido(n.valor, todos),
    via: viaPorEspecialidad(n.especialidad),
    etapa: 'Postulatoria',
    estado: 'activo',
    origen: 'Alta manual',
  })
}
