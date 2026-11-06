import { describe, expect, it } from 'vitest'
import type { Accion, Audiencia, Expediente, Notificacion } from './entidades'
import { calcularPendientes, estadoMovimiento, indiceUltimaAccion } from './agenda/que-toca-hoy'
import { CalendarioHabil } from './plazos/calendario-habil'
import { FERIADOS_NACIONALES } from './plazos/feriados'
import { calcularReporte } from './reportes'
import { sumarDias } from './shared/fecha'

/**
 * RNF-10: las vistas deben responder con hasta 1,000 expedientes. Se mide el cálculo más pesado
 * de cada vista con un volumen 5 veces mayor que el actual (181 expedientes).
 */
const HOY = '2026-11-05'
const N_EXP = 1000
const N_ACC = 20000

const expedientes = Array.from({ length: N_EXP }, (_, i) => ({
  id: `e${i}`,
  numero: `${String(i).padStart(5, '0')}-2026-0-1801-JR-LA-01`,
  codigo: `LA-${i}`,
  via: i % 3 ? 'lab-ord' : 'civ-con',
  estado: i % 10 ? 'activo' : 'archivado',
  cliente: `Cliente ${i % 300}`,
  creadoEn: '2025-01-01T00:00:00Z',
})) as Expediente[]
const acciones = Array.from({ length: N_ACC }, (_, i) => ({
  id: `a${i}`,
  expedienteId: `e${(i * 7919) % N_EXP}`,
  fecha: sumarDias(HOY, -((i * 31) % 400)),
  tipo: 'Escrito de impulso',
  responsable: ['Ana', 'Beto', 'Carla', 'Dani'][i % 4],
  proxima: i % 5 ? undefined : 'Revisar',
  proximaFecha: i % 5 ? undefined : sumarDias(HOY, (i % 20) - 10),
  proximaCumplida: i % 3 === 0,
})) as Accion[]
const notificaciones = Array.from({ length: 400 }, (_, i) => ({
  id: `n${i}`,
  expedienteId: `e${i}`,
  estado: i % 2 ? 'pendiente' : 'atendida',
  vencimiento: sumarDias(HOY, (i % 30) - 10),
  atendidaEn: i % 2 ? undefined : sumarDias(HOY, -(i % 60)),
  asunto: 'Resolución',
})) as Notificacion[]
const audiencias = [] as Audiencia[]

function medir(fn: () => unknown): number {
  fn() // calentamiento
  const t = performance.now()
  for (let i = 0; i < 5; i++) fn()
  return (performance.now() - t) / 5
}

describe('rendimiento con 1,000 expedientes y 20,000 acciones', () => {
  const ctx = { hoy: HOY, calendario: new CalendarioHabil(FERIADOS_NACIONALES), diasSinMovimiento: 30 }

  it('Hoy (qué toca hoy) en menos de 100 ms', () => {
    const ms = medir(() => calcularPendientes({ expedientes, acciones, notificaciones, audiencias, visitas: [] }, ctx))
    expect(ms).toBeLessThan(100)
  })

  it('lista de expedientes con días sin movimiento en menos de 50 ms', () => {
    const ms = medir(() => {
      const indice = indiceUltimaAccion(acciones)
      return expedientes.map((e) => estadoMovimiento(e, indice, ctx))
    })
    expect(ms).toBeLessThan(50)
  })

  it('reportes del año en menos de 100 ms', () => {
    const ms = medir(() => calcularReporte({ expedientes, acciones, notificaciones, audiencias }, { desde: '2026-01-01', hasta: HOY }))
    expect(ms).toBeLessThan(100)
  })

  it('el índice da lo mismo que recorrer todas las acciones', () => {
    const indice = indiceUltimaAccion(acciones)
    for (const e of expedientes.slice(0, 50)) expect(estadoMovimiento(e, indice, ctx)).toEqual(estadoMovimiento(e, acciones, ctx))
  })
})
