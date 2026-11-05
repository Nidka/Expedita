import { describe, expect, it } from 'vitest'
import { CalendarioHabil } from './calendario-habil'
import { ACTOS, actosDeVia, VIAS, viaPorEspecialidad } from './catalogo'
import { calcularVencimiento } from './computo'
import { FERIADOS_NACIONALES } from './feriados'

const cal = new CalendarioHabil(FERIADOS_NACIONALES)

describe('CalendarioHabil', () => {
  it('excluye fines de semana y feriados', () => {
    expect(cal.esHabil('2026-10-03')).toBe(false) // sábado
    expect(cal.esHabil('2026-10-04')).toBe(false) // domingo
    expect(cal.esHabil('2026-10-08')).toBe(false) // Angamos
    expect(cal.motivoInhabil('2026-10-08')).toBe('Combate de Angamos')
    expect(cal.esHabil('2026-10-07')).toBe(true)
  })

  it('respeta días inhábiles configurados por el estudio', () => {
    const c = new CalendarioHabil(FERIADOS_NACIONALES, ['2026-10-07'])
    expect(c.esHabil('2026-10-07')).toBe(false)
  })

  it('cuenta hábiles entre fechas', () => {
    expect(cal.habilesEntre('2026-10-05', '2026-10-20')).toBe(10)
    expect(cal.habilesEntre('2026-10-20', '2026-10-05')).toBe(-10)
  })
})

describe('calcularVencimiento', () => {
  it('reproduce el caso del traspaso: casilla 1/10/2026, 10 días hábiles → vence 20/10/2026', () => {
    const r = calcularVencimiento(cal, '2026-10-01', { dias: 10, unidad: 'habiles', norma: 'X' }, true)
    expect(r.efecto).toBe('2026-10-05')
    expect(r.vencimiento).toBe('2026-10-20')
  })

  it('sin casilla el plazo corre desde el día siguiente a la notificación', () => {
    const r = calcularVencimiento(cal, '2026-10-01', { dias: 3, unidad: 'habiles', norma: 'X' }, false)
    expect(r.efecto).toBe('2026-10-01')
    expect(r.vencimiento).toBe('2026-10-06')
  })

  it('plazos en días naturales', () => {
    const r = calcularVencimiento(cal, '2026-01-01', { dias: 120, unidad: 'naturales', norma: 'NCPP' }, false)
    expect(r.vencimiento).toBe('2026-05-01')
  })

  it('salta Semana Santa y Fiestas Patrias', () => {
    // 2026-04-01 (miércoles) + 1 hábil → 2026-04-06 (2 y 3 abr feriados, fin de semana)
    expect(cal.sumarHabiles('2026-04-01', 1)).toBe('2026-04-06')
    expect(cal.sumarHabiles('2026-07-27', 1)).toBe('2026-07-30')
  })
})

describe('catálogo', () => {
  it('todas las vías tienen actos o etapas, y los ids de acto son únicos', () => {
    const ids = ACTOS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const via of Object.values(VIAS)) expect(via.etapas.length).toBeGreaterThan(0)
    expect(actosDeVia('lab-ord').length).toBe(6)
  })

  it('vía por especialidad', () => {
    expect(viaPorEspecialidad('LA')).toBe('lab-ord')
    expect(viaPorEspecialidad('co')).toBe('civ-con')
    expect(viaPorEspecialidad('DC')).toBe('otra')
  })
})
