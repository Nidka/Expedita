import type { Expediente, Notificacion, OrigenNotificacion } from '@/domain/entidades'
import { parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { CalendarioHabil } from '@/domain/plazos/calendario-habil'
import { buscarActo, viaPorEspecialidad } from '@/domain/plazos/catalogo'
import { calcularVencimiento, fechaEfecto, type Computo } from '@/domain/plazos/computo'
import type { FechaISO } from '@/domain/shared/fecha'
import type { Contenedor } from '../contenedor'

export async function calendarioDeOrg(c: Contenedor): Promise<CalendarioHabil> {
  const [feriados, config] = await Promise.all([c.config.feriados(), c.config.obtener()])
  return new CalendarioHabil(feriados, config.diasInhabiles)
}

export interface RegistrarNotificacionCmd {
  numero: string
  asunto: string
  recibido: FechaISO
  casilla: boolean
  actoId?: string
  /** Si la resolución fija su propio plazo, prevalece sobre el catálogo. */
  vencimientoManual?: FechaISO
  resumen?: string
  texto?: string
  origen?: OrigenNotificacion
}

/** Previsualiza el cómputo sin guardar (para el formulario). */
export function previsualizarPlazo(cal: CalendarioHabil, cmd: Pick<RegistrarNotificacionCmd, 'recibido' | 'casilla' | 'actoId'>): Computo | null {
  const acto = cmd.actoId ? buscarActo(cmd.actoId) : undefined
  if (!acto) return null
  return calcularVencimiento(cal, cmd.recibido, acto, cmd.casilla)
}

/** RF-07 a RF-09: registra la notificación, calcula el plazo y crea el expediente si no existía. */
export async function registrarNotificacion(
  c: Contenedor,
  cmd: RegistrarNotificacionCmd,
): Promise<{ notificacion: Notificacion; expedienteCreado?: Expediente }> {
  const num = parsearNumeroExpediente(cmd.numero)
  if (!num) throw new Error('El número de expediente no tiene el formato del Poder Judicial.')

  let expediente = await c.expedientes.porNumero(num.valor)
  let expedienteCreado: Expediente | undefined
  if (!expediente) {
    expediente = expedienteCreado = await c.expedientes.crear({
      numero: num.valor,
      via: viaPorEspecialidad(num.especialidad),
      estado: 'activo',
      origen: 'Notificación',
    })
  }

  const cal = await calendarioDeOrg(c)
  const computo = previsualizarPlazo(cal, cmd)
  const efecto = computo?.efecto ?? fechaEfecto(cal, cmd.recibido, cmd.casilla)

  const notificacion = await c.notificaciones.crear({
    expedienteId: expediente.id,
    numero: num.valor,
    asunto: cmd.asunto.trim() || 'Notificación',
    recibido: cmd.recibido,
    casilla: cmd.casilla,
    actoId: cmd.actoId,
    efecto,
    vencimiento: cmd.vencimientoManual ?? computo?.vencimiento,
    resumen: cmd.resumen,
    texto: cmd.texto?.slice(0, 20_000),
    estado: 'pendiente',
    origen: cmd.origen ?? 'manual',
  })
  return { notificacion, expedienteCreado }
}
