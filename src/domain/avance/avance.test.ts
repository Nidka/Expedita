import { describe, expect, it } from 'vitest'
import type { Accion, Audiencia, Expediente } from '../entidades'
import { construirAvance, enlaceVigente, generarToken, MAX_MOVIMIENTOS } from './avance'

const exp = { id: 'e1', numero: '00123-2026-0-1801-JR-LA-01', via: 'lab-ord', estado: 'activo', demandante: 'Ana Ríos', etapa: 'Contestación' } as Expediente
const acc = (fecha: string, extra: Partial<Accion> = {}) =>
  ({ id: fecha, expedienteId: 'e1', fecha, tipo: 'Escrito de impulso', descripcion: 'Nota interna', responsable: 'Beto', creadoEn: fecha, ...extra }) as Accion

describe('avance para el cliente', () => {
  it('muestra solo tipo y fecha, del más reciente al más antiguo, sin detalle interno', () => {
    const r = construirAvance('Estudio', exp, [acc('2026-10-01'), acc('2026-11-02'), acc('2026-11-01', { expedienteId: 'otro' })], [], '2026-11-05')
    expect(r.cliente).toBe('Ana Ríos')
    expect(r.movimientos).toEqual([
      { fecha: '2026-11-02', tipo: 'Escrito de impulso' },
      { fecha: '2026-10-01', tipo: 'Escrito de impulso' },
    ])
    expect(JSON.stringify(r)).not.toMatch(/Nota interna|Beto/)
  })

  it('limita los movimientos y solo lista audiencias programadas desde hoy', () => {
    const muchas = Array.from({ length: 20 }, (_, i) => acc(`2026-10-${String(i + 1).padStart(2, '0')}`))
    const aud = (fecha: string, estado = 'programada') => ({ id: fecha, expedienteId: 'e1', fecha, estado, tipo: 'Audiencia única', modalidad: 'virtual' }) as unknown as Audiencia
    const r = construirAvance('Estudio', exp, muchas, [aud('2026-11-04'), aud('2026-11-10'), aud('2026-11-12', 'frustrada')], '2026-11-05')
    expect(r.movimientos).toHaveLength(MAX_MOVIMIENTOS)
    expect(r.audiencias.map((a) => a.fecha)).toEqual(['2026-11-10'])
  })

  it('vigencia y token', () => {
    expect(enlaceVigente({ revocado: false, expira: '2026-11-05' }, '2026-11-05')).toBe(true)
    expect(enlaceVigente({ revocado: false, expira: '2026-11-04' }, '2026-11-05')).toBe(false)
    expect(enlaceVigente({ revocado: true }, '2026-11-05')).toBe(false)
    const t = generarToken()
    expect(t).toMatch(/^[\w-]{43}$/)
    expect(generarToken()).not.toBe(t)
  })
})
