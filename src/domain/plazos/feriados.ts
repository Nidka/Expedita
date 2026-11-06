import { sumarDias, type FechaISO } from '../shared/fecha'

export interface Feriado {
  fecha: FechaISO
  nombre: string
}

/** Domingo de Pascua (algoritmo anónimo gregoriano, Meeus/Jones/Butcher) */
export function domingoDePascua(a: number): FechaISO {
  const b = a % 19
  const c = Math.floor(a / 100)
  const d = a % 100
  const e = Math.floor(c / 4)
  const f = c % 4
  const g = Math.floor((c + 8) / 25)
  const h = Math.floor((c - g + 1) / 3)
  const i = (19 * b + c - e - h + 15) % 30
  const k = Math.floor(d / 4)
  const l = d % 4
  const m = (32 + 2 * f + 2 * k - i - l) % 7
  const n = Math.floor((b + 11 * i + 22 * m) / 451)
  const mes = Math.floor((i + m - 7 * n + 114) / 31)
  const dia = ((i + m - 7 * n + 114) % 31) + 1
  return `${a}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Feriados nacionales de un año (Jueves y Viernes Santo se calculan desde la Pascua). */
export function feriadosDelAnio(a: number): Feriado[] {
  const pascua = domingoDePascua(a)
  const f = (md: string, nombre: string): Feriado => ({ fecha: `${a}-${md}`, nombre })
  return [
    f('01-01', 'Año Nuevo'),
    { fecha: sumarDias(pascua, -3), nombre: 'Jueves Santo' },
    { fecha: sumarDias(pascua, -2), nombre: 'Viernes Santo' },
    f('05-01', 'Día del Trabajo'),
    f('06-07', 'Batalla de Arica y Día de la Bandera'),
    f('06-29', 'San Pedro y San Pablo'),
    f('07-23', 'Día de la Fuerza Aérea del Perú'),
    f('07-28', 'Fiestas Patrias'),
    f('07-29', 'Fiestas Patrias'),
    f('08-06', 'Batalla de Junín'),
    f('08-30', 'Santa Rosa de Lima'),
    f('10-08', 'Combate de Angamos'),
    f('11-01', 'Todos los Santos'),
    f('12-08', 'Inmaculada Concepción'),
    f('12-09', 'Batalla de Ayacucho'),
    f('12-25', 'Navidad'),
  ]
}

/**
 * Feriados nacionales (anexo B), calculados para varios años: ya no hay que agregarlos cada año.
 * Los feriados extraordinarios que declare el Gobierno se guardan en la tabla `feriados` y se suman a estos.
 * Los días no laborables del Poder Judicial o de cada corte se configuran por organización.
 */
export const FERIADOS_NACIONALES: readonly Feriado[] = Array.from({ length: 15 }, (_, i) => feriadosDelAnio(2024 + i)).flat()

/** Une listas de feriados sin repetir fechas (gana el primero). */
export function unirFeriados(...listas: readonly (readonly Feriado[])[]): Feriado[] {
  const m = new Map<FechaISO, Feriado>()
  for (const l of listas) for (const f of l) if (!m.has(f.fecha)) m.set(f.fecha, f)
  return [...m.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))
}
