import type { Expediente, TipoAccion } from '../entidades'
import type { CalendarioHabil } from '../plazos/calendario-habil'
import { diferenciaDias, type FechaISO } from '../shared/fecha'

export interface Seguimiento {
  /** Qué hacer después */
  proxima: string
  /** En cuántos días hábiles desde la acción */
  dias: number
}

/**
 * Seguimiento habitual tras cada tipo de acción: lo que un procurador anotaría a mano.
 * Es una propuesta; el usuario puede cambiarla o quitarla antes de guardar.
 */
export const SEGUIMIENTO_POR_TIPO: Partial<Record<TipoAccion, Seguimiento>> = {
  'Escrito de impulso': { proxima: 'Revisar si el juzgado proveyó el escrito', dias: 5 },
  'Pedido de sentencia / resolución': { proxima: 'Revisar en el CEJ si se expidió la resolución', dias: 10 },
  'Contestación de demanda': { proxima: 'Revisar si se tuvo por contestada la demanda', dias: 5 },
  'Absolución de traslado': { proxima: 'Revisar si se proveyó la absolución', dias: 5 },
  Subsanación: { proxima: 'Revisar si se admitió tras la subsanación', dias: 5 },
  'Apelación / recurso': { proxima: 'Revisar si se concedió la apelación', dias: 10 },
  Apersonamiento: { proxima: 'Revisar si se tuvo por apersonado y se fijó la casilla', dias: 5 },
  Alegatos: { proxima: 'Revisar en el CEJ si se expidió sentencia', dias: 10 },
  'Visita al despacho / cita con especialista': { proxima: 'Verificar que se cumplió lo conversado con el especialista', dias: 3 },
  'Llamada o correo al juzgado': { proxima: 'Verificar la respuesta del juzgado', dias: 3 },
  'Pago de arancel / tasa': { proxima: 'Presentar el comprobante del arancel', dias: 1 },
}

/** Frases frecuentes por tipo, para no escribir lo mismo cada vez. */
export const FRASES_POR_TIPO: Partial<Record<TipoAccion, readonly string[]>> = {
  'Escrito de impulso': ['Se presentó escrito solicitando se provea lo pendiente.', 'Se presentó escrito solicitando se notifique la resolución.'],
  'Pedido de sentencia / resolución': ['Se presentó escrito solicitando se expida sentencia.', 'Se solicitó se emita pronunciamiento sobre lo pendiente.'],
  'Revisión en CEJ': ['Revisión en CEJ: sin novedad.', 'Revisión en CEJ: hay resolución nueva pendiente de notificar.'],
  'Revisión de casilla electrónica': ['Revisión de casilla: sin notificaciones nuevas.', 'Revisión de casilla: se descargó notificación nueva.'],
  'Visita al despacho / cita con especialista': ['Se visitó el despacho; el especialista indicó que el expediente está en trámite.', 'Se visitó el despacho; el expediente está para resolver.'],
  'Llamada o correo al juzgado': ['Se llamó al juzgado; indicaron que el expediente está en despacho.', 'Se envió correo al juzgado solicitando información.'],
  Apersonamiento: ['Se presentó escrito de apersonamiento y se fijó casilla electrónica.'],
  Alegatos: ['Se presentaron alegatos por escrito.'],
  'Pago de arancel / tasa': ['Se pagó el arancel judicial.'],
}

/** Propuesta de próxima acción con su fecha calculada en días hábiles. */
export function proponerSeguimiento(
  tipo: TipoAccion,
  fecha: FechaISO,
  cal: CalendarioHabil,
): { proxima: string; proximaFecha: FechaISO; dias: number } | undefined {
  const s = SEGUIMIENTO_POR_TIPO[tipo]
  if (!s) return undefined
  return { proxima: s.proxima, proximaFecha: cal.sumarHabiles(fecha, s.dias), dias: s.dias }
}

// ---------- Ronda de revisión en el CEJ ----------

export interface ItemRonda {
  exp: Expediente
  /** Días desde la última revisión; undefined si nunca se revisó */
  dias?: number
}

/**
 * Cola de revisión: expedientes activos no revisados en `cadaDias` días, primero los que nunca
 * se revisaron y luego los más antiguos. Archivados y revisados recientemente quedan fuera.
 */
export function colaRonda(expedientes: readonly Expediente[], hoy: FechaISO, cadaDias = 7): ItemRonda[] {
  return expedientes
    .filter((e) => e.estado === 'activo')
    .map((exp) => ({ exp, dias: exp.ultimaRevisionCej ? diferenciaDias(exp.ultimaRevisionCej, hoy) : undefined }))
    .filter((i) => i.dias === undefined || i.dias >= cadaDias)
    .sort((a, b) => (b.dias ?? Infinity) - (a.dias ?? Infinity) || (a.exp.codigo ?? a.exp.numero).localeCompare(b.exp.codigo ?? b.exp.numero, 'es'))
}

/** URL del buscador público del CEJ (el usuario resuelve el captcha; no se automatiza). */
export const URL_CEJ = 'https://cej.pj.gob.pe/cej/forms/busquedaform.html'
