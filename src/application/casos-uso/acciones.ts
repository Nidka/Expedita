import type { Accion, Id, OrigenAccion, TipoAccion } from '@/domain/entidades'
import type { FechaISO } from '@/domain/shared/fecha'
import type { Contenedor } from '../contenedor'

export interface RegistrarAccionCmd {
  expedienteId: Id
  fecha: FechaISO
  tipo: TipoAccion
  descripcion: string
  responsable: string
  cargo?: string
  proxima?: string
  proximaFecha?: FechaISO
  etapaNueva?: string
  notificacionId?: Id
  visitaId?: Id
  mensajeId?: Id
  origen?: OrigenAccion
}

/**
 * RF-12, RF-13, RF-14, RF-10:
 * crea la acción, cumple las próximas acciones abiertas del expediente,
 * cambia la etapa si corresponde y marca atendida la notificación que origina.
 */
export async function registrarAccion(c: Contenedor, cmd: RegistrarAccionCmd): Promise<Accion> {
  if (!cmd.descripcion.trim()) throw new Error('Escribe el detalle de la acción.')
  if (cmd.proximaFecha && !cmd.proxima?.trim()) throw new Error('Indica cuál es la próxima acción.')

  const accion = await c.acciones.crear({
    expedienteId: cmd.expedienteId,
    fecha: cmd.fecha,
    tipo: cmd.tipo,
    descripcion: cmd.descripcion.trim(),
    responsable: cmd.responsable.trim(),
    cargo: cmd.cargo?.trim() || undefined,
    proxima: cmd.proxima?.trim() || undefined,
    proximaFecha: cmd.proximaFecha,
    proximaCumplida: false,
    etapaNueva: cmd.etapaNueva,
    notificacionId: cmd.notificacionId,
    visitaId: cmd.visitaId,
    mensajeId: cmd.mensajeId,
    origen: cmd.origen ?? 'manual',
  })

  await c.acciones.cumplirProximasAbiertas(cmd.expedienteId, accion.id)

  const cambiosExp: Parameters<Contenedor['expedientes']['actualizar']>[1] = {}
  if (cmd.etapaNueva) cambiosExp.etapa = cmd.etapaNueva
  if (cmd.tipo === 'Revisión en CEJ') cambiosExp.ultimaRevisionCej = cmd.fecha
  if (Object.keys(cambiosExp).length) await c.expedientes.actualizar(cmd.expedienteId, cambiosExp)

  if (cmd.notificacionId) {
    await c.notificaciones.actualizar(cmd.notificacionId, { estado: 'atendida', atendidaEn: cmd.fecha })
  }
  return accion
}
