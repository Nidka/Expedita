import { describe, expect, it } from 'vitest'
import { domingoDePascua, FERIADOS_NACIONALES, feriadosDelAnio, unirFeriados } from './feriados'

describe('feriados calculados', () => {
  it('Pascua y Semana Santa', () => {
    expect(['2024', '2025', '2026', '2027', '2028', '2030'].map((a) => domingoDePascua(Number(a)))).toEqual([
      '2024-03-31',
      '2025-04-20',
      '2026-04-05',
      '2027-03-28',
      '2028-04-16',
      '2030-04-21',
    ])
    const f2026 = feriadosDelAnio(2026)
    expect(f2026.find((f) => f.nombre === 'Jueves Santo')?.fecha).toBe('2026-04-02')
    expect(f2026.find((f) => f.nombre === 'Viernes Santo')?.fecha).toBe('2026-04-03')
    expect(f2026).toHaveLength(16)
  })

  it('cubre varios años y une sin duplicar', () => {
    expect(FERIADOS_NACIONALES.some((f) => f.fecha === '2035-12-25')).toBe(true)
    const extra = { fecha: '2026-12-24', nombre: 'Día no laborable' }
    const u = unirFeriados([extra], FERIADOS_NACIONALES, [{ fecha: '2026-12-25', nombre: 'Navidad (repetido)' }])
    expect(u.filter((f) => f.fecha === '2026-12-25')).toHaveLength(1)
    expect(u).toContainEqual(extra)
  })
})
