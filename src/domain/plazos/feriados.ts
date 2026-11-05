import type { FechaISO } from '../shared/fecha'

export interface Feriado {
  fecha: FechaISO
  nombre: string
}

function anio(a: number, jueves: string, viernes: string): Feriado[] {
  const f = (md: string, nombre: string): Feriado => ({ fecha: `${a}-${md}`, nombre })
  return [
    f('01-01', 'Año Nuevo'),
    f(jueves, 'Jueves Santo'),
    f(viernes, 'Viernes Santo'),
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
 * Feriados nacionales (anexo B). Mantenimiento anual: agregar el año siguiente.
 * Los días no laborables del Poder Judicial o de cada corte se configuran por organización.
 */
export const FERIADOS_NACIONALES: readonly Feriado[] = [
  ...anio(2026, '04-02', '04-03'),
  ...anio(2027, '03-25', '03-26'),
]
