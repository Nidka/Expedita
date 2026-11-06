import { describe, expect, it } from 'vitest'
import type { Accion, Audiencia, Expediente, Notificacion } from './entidades'
import { indiceUltimaAccion } from './agenda/que-toca-hoy'
import { CalendarioHabil } from './plazos/calendario-habil'
import { FERIADOS_NACIONALES } from './plazos/feriados'
import { calcularPanel } from './panel'

const HOY = '2026-11-05'
const exp = (id: string, extra: Partial<Expediente> = {}) =>
  ({ id, numero: id, via: 'lab-ord', estado: 'activo', materia: 'BENEFICIOS SOCIALES', etapa: 'Postulatoria', creadoEn: '2026-01-01T00:00:00Z', ...extra }) as Expediente
const acc = (expedienteId: string, fecha: string, responsable = 'Ana') => ({ id: expedienteId + fecha, expedienteId, fecha, responsable, tipo: 'Escrito de impulso' }) as Accion

describe('panel del estudio', () => {
  const expedientes = [exp('e1'), exp('e2', { etapa: 'Sentencia', materia: 'Despido' }), exp('e3'), exp('e4', { estado: 'archivado' })]
  const acciones = [acc('e1', '2026-11-02'), acc('e2', '2026-09-01', 'Beto'), acc('e1', '2026-08-20')]
  const notificaciones = [
    { id: 'n1', estado: 'pendiente', vencimiento: '2026-11-09' },
    { id: 'n2', estado: 'pendiente', vencimiento: '2026-11-01' },
    { id: 'n3', estado: 'atendida', vencimiento: '2026-11-06' },
  ] as Notificacion[]
  const audiencias = [{ id: 'a1', estado: 'programada', fecha: '2026-11-20' }] as Audiencia[]
  const ctx = { hoy: HOY, calendario: new CalendarioHabil(FERIADOS_NACIONALES), diasSinMovimiento: 30 }
  const p = calcularPanel({ expedientes, acciones, notificaciones, audiencias }, ctx, indiceUltimaAccion(acciones))

  it('indicadores solo de activos', () => {
    expect(p.indicadores).toEqual({ activos: 3, impulsados30: 1, porcentajeImpulsados: 33, sinMovimiento: 2, plazosSemana: 1, vencidos: 1, audiencias30: 1 })
  })

  it('agrupa por etapa, materia y antigüedad', () => {
    expect(p.porEtapa[0]).toEqual({ clave: 'Postulatoria', n: 2 })
    expect(p.porMateria.map((f) => f.clave)).toEqual(['Beneficios sociales', 'Despido'])
    expect(p.antiguedad.reduce((s, t) => s + t.n, 0)).toBe(3)
    expect(p.masQuietos[0].id).toBe('e3') // sin acciones desde su creación
  })

  it('12 semanas con la actual al final', () => {
    expect(p.semanas).toHaveLength(12)
    expect(p.semanas.at(-1)).toEqual({ inicio: '2026-11-02', n: 1 })
  })
})
