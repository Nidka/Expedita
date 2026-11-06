import { describe, expect, it } from 'vitest'
import type { Accion, Expediente, Notificacion } from './entidades'
import { calcularReporte, lunesDe, rangoDePeriodo } from './reportes'

const exp = (id: string, cliente: string) => ({ id, cliente, numero: id }) as Expediente
const acc = (expedienteId: string, fecha: string, responsable: string, tipo = 'Escrito de impulso') =>
  ({ id: `${expedienteId}-${fecha}-${responsable}`, expedienteId, fecha, responsable, tipo }) as Accion
const notif = (expedienteId: string, vencimiento: string, atendidaEn: string) =>
  ({ id: `${expedienteId}${atendidaEn}`, expedienteId, estado: 'atendida', vencimiento, atendidaEn }) as Notificacion

const datos = {
  expedientes: [exp('e1', 'María Pérez'), exp('e2', 'Juan Torres')],
  acciones: [
    acc('e1', '2026-11-02', 'Ana'),
    acc('e1', '2026-11-03', 'Ana', 'Revisión en CEJ'),
    acc('e2', '2026-11-05', 'Beto'),
    acc('e2', '2026-10-20', 'Beto'), // fuera del periodo
  ],
  notificaciones: [notif('e1', '2026-11-04', '2026-11-03'), notif('e2', '2026-11-02', '2026-11-04')],
  audiencias: [],
}

describe('reportes', () => {
  it('cuenta por responsable, tipo, cliente y semana dentro del periodo', () => {
    const r = calcularReporte(datos, { desde: '2026-11-01', hasta: '2026-11-08' })
    expect(r.indicadores).toMatchObject({ acciones: 3, expedientesImpulsados: 2, notificacionesAtendidas: 2, aTiempo: 50 })
    expect(r.porResponsable).toEqual([
      { clave: 'Ana', n: 2 },
      { clave: 'Beto', n: 1 },
    ])
    expect(r.porCliente[0]).toMatchObject({ cliente: 'María Pérez', n: 2, expedientes: 1, ultima: '2026-11-03' })
    // 01/11/2026 es domingo: su semana empieza el lunes 26/10
    expect(r.porSemana.map((s) => [s.inicio, s.n])).toEqual([
      ['2026-10-26', 0],
      ['2026-11-02', 3],
    ])
  })

  it('filtra por responsable y por cliente', () => {
    expect(calcularReporte(datos, { desde: '2026-11-01', hasta: '2026-11-30', responsable: 'Beto' }).indicadores.acciones).toBe(1)
    expect(calcularReporte(datos, { desde: '2026-11-01', hasta: '2026-11-30', cliente: 'María Pérez' }).indicadores.acciones).toBe(2)
  })

  it('periodos', () => {
    expect(lunesDe('2026-11-05')).toBe('2026-11-02')
    expect(rangoDePeriodo('mes-anterior', '2026-01-15')).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' })
    expect(rangoDePeriodo('30', '2026-11-05')).toEqual({ desde: '2026-10-07', hasta: '2026-11-05' })
  })
})
