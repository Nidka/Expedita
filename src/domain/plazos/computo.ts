import { sumarDias, type FechaISO } from '../shared/fecha'
import type { CalendarioHabil } from './calendario-habil'
import type { ActoPlazo } from './catalogo'

export interface Computo {
  notificacion: FechaISO
  /** Fecha en que surte efecto la notificación */
  efecto: FechaISO
  vencimiento: FechaISO
  dias: number
  unidad: ActoPlazo['unidad']
  norma: string
  /** Explicación legible, p. ej. para mostrar en el plazo (RNF-13) */
  detalle: string
}

/** Días hábiles tras los cuales surte efecto la notificación en casilla electrónica (CPC art. 155-C). */
export const DIAS_EFECTO_CASILLA = 2

export function fechaEfecto(cal: CalendarioHabil, notificacion: FechaISO, casilla: boolean): FechaISO {
  return casilla ? cal.sumarHabiles(notificacion, DIAS_EFECTO_CASILLA) : notificacion
}

export function calcularVencimiento(
  cal: CalendarioHabil,
  notificacion: FechaISO,
  plazo: Pick<ActoPlazo, 'dias' | 'unidad' | 'norma'>,
  casilla: boolean,
): Computo {
  const efecto = fechaEfecto(cal, notificacion, casilla)
  const vencimiento =
    plazo.unidad === 'naturales' ? sumarDias(efecto, plazo.dias) : cal.sumarHabiles(efecto, plazo.dias)
  const unidadTxt = plazo.unidad === 'naturales' ? 'días naturales' : 'días hábiles'
  const efectoTxt = casilla
    ? `Notificada por casilla el ${notificacion}; surte efecto el ${efecto} (2.º día hábil, CPC art. 155-C).`
    : `Notificada el ${notificacion}.`
  return {
    notificacion,
    efecto,
    vencimiento,
    dias: plazo.dias,
    unidad: plazo.unidad,
    norma: plazo.norma,
    detalle: `${efectoTxt} Plazo: ${plazo.dias} ${unidadTxt} (${plazo.norma}), vence el ${vencimiento}.`,
  }
}
