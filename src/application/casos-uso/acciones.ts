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

export type CambiosAccion = Partial<
  Pick<Accion, 'fecha' | 'tipo' | 'descripcion' | 'responsable' | 'cargo' | 'proxima' | 'proximaFecha' | 'proximaCumplida'>
>

/** RF-13: corrige una acción ya registrada. */
export async function editarAccion(c: Contenedor, id: Id, cambios: CambiosAccion): Promise<Accion> {
  if (cambios.descripcion !== undefined && !cambios.descripcion.trim()) throw new Error('El detalle no puede quedar vacío.')
  if (cambios.proximaFecha && !cambios.proxima?.trim()) throw new Error('Indica cuál es la próxima acción.')
  // Solo se envían los campos presentes: en Supabase un campo presente con `undefined` se borra (null).
  const limpio: CambiosAccion = {}
  for (const [k, v] of Object.entries(cambios) as [keyof CambiosAccion, unknown][]) {
    if (!(k in cambios)) continue
    const valor = typeof v === 'string' ? v.trim() : v
    ;(limpio as Record<string, unknown>)[k] = valor === '' && k !== 'descripcion' && k !== 'responsable' ? undefined : valor
  }
  if (limpio.responsable !== undefined && !limpio.responsable) throw new Error('Indica quién realizó la acción.')
  return c.acciones.actualizar(id, limpio)
}

/**
 * Elimina una acción. Si había atendido una notificación y ninguna otra acción la atiende,
 * la notificación vuelve a quedar pendiente (para no perder su plazo).
 */
export async function eliminarAccion(c: Contenedor, accion: Accion): Promise<{ notificacionReabierta: boolean }> {
  await c.acciones.eliminar(accion.id)
  if (!accion.notificacionId) return { notificacionReabierta: false }
  const otras = (await c.acciones.listar()).some((a) => a.notificacionId === accion.notificacionId)
  if (otras) return { notificacionReabierta: false }
  await c.notificaciones.actualizar(accion.notificacionId, { estado: 'pendiente', atendidaEn: undefined })
  return { notificacionReabierta: true }
}
