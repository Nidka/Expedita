/**
 * Fechas de calendario sin hora, en formato ISO `AAAA-MM-DD`.
 * Se opera en UTC para que el huso horario del navegador no corra los días.
 */
export type FechaISO = string

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

export function esFechaISO(valor: string): valor is FechaISO {
  if (!RE_FECHA.test(valor)) return false
  const d = aDate(valor)
  return !Number.isNaN(d.getTime()) && aISO(d) === valor
}

export function aDate(fecha: FechaISO): Date {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

export function aISO(d: Date): FechaISO {
  return d.toISOString().slice(0, 10)
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const d = aDate(fecha)
  d.setUTCDate(d.getUTCDate() + dias)
  return aISO(d)
}

/** Días naturales de `desde` a `hasta` (positivo si `hasta` es posterior). */
export function diferenciaDias(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aDate(hasta).getTime() - aDate(desde).getTime()) / 86_400_000)
}

/** 0 = domingo … 6 = sábado */
export function diaSemana(fecha: FechaISO): number {
  return aDate(fecha).getUTCDay()
}

/** Fecha de hoy en Lima (UTC−5, sin horario de verano). */
export function hoyEnLima(ahora: Date = new Date()): FechaISO {
  return aISO(new Date(ahora.getTime() - 5 * 3_600_000))
}
