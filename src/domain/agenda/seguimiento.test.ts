import { describe, expect, it } from 'vitest'
import type { Expediente } from '../entidades'
import { CalendarioHabil } from '../plazos/calendario-habil'
import { FERIADOS_NACIONALES } from '../plazos/feriados'
import { colaRonda, proponerSeguimiento } from './seguimiento'

const cal = new CalendarioHabil(FERIADOS_NACIONALES)

const exp = (id: string, extra: Partial<Expediente> = {}): Expediente =>
  ({ id, orgId: 'o', numero: `0000${id}-2025-0-1801-JR-LA-01`, via: 'lab-ord', estado: 'activo', creadoEn: '', actualizadoEn: '', ...extra }) as Expediente

describe('proponerSeguimiento', () => {
  it('propone la próxima acción en días hábiles (salta fin de semana)', () => {
    // viernes 6 nov 2026 + 5 hábiles = viernes 13 nov
    expect(proponerSeguimiento('Escrito de impulso', '2026-11-06', cal)).toEqual({
      proxima: 'Revisar si el juzgado proveyó el escrito',
      proximaFecha: '2026-11-13',
      dias: 5,
    })
  })

  it('no propone nada para tipos sin seguimiento habitual', () => {
    expect(proponerSeguimiento('Revisión en CEJ', '2026-11-06', cal)).toBeUndefined()
    expect(proponerSeguimiento('Otra', '2026-11-06', cal)).toBeUndefined()
  })
})

describe('colaRonda', () => {
  it('pone primero los nunca revisados, luego los más antiguos, y omite los recientes y archivados', () => {
    const cola = colaRonda(
      [
        exp('1', { ultimaRevisionCej: '2026-11-04' }), // hace 2 días: fuera
        exp('2', { ultimaRevisionCej: '2026-10-01' }),
        exp('3'), // nunca
        exp('4', { ultimaRevisionCej: '2026-10-20' }),
        exp('5', { estado: 'archivado' }),
      ],
      '2026-11-06',
      7,
    )
    expect(cola.map((i) => i.exp.id)).toEqual(['3', '2', '4'])
    expect(cola[0].dias).toBeUndefined()
    expect(cola[1].dias).toBe(36)
  })
})
