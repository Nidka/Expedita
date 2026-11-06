import { describe, expect, it } from 'vitest'
import type { Expediente } from '../entidades'
import { MODELOS_BASE } from './modelos-base'
import { datosDeExpediente, fechaEnLetras, nombreArchivo, pendientes, rellenar, VARIABLES } from './plantilla'

const exp = { numero: '00123-2026-0-1801-JR-LA-01', codigo: 'LA-01', demandante: 'Ana Ríos', demandado: 'ACME S.A.C.', organo: '5° Juzgado de Trabajo' } as Expediente

describe('plantillas de escritos', () => {
  it('rellena con los datos del expediente y marca lo que falta', () => {
    const datos = datosDeExpediente(exp, { abogado: 'María', hoy: '2026-11-05' })
    const t = rellenar('{{cliente}} contra {{ demandado }} ante el {{juzgado}}; especialista {{especialista}}. {{ciudad}}, {{fecha}}', datos)
    expect(t).toBe('Ana Ríos contra ACME S.A.C. ante el 5° Juzgado de Trabajo; especialista [ESPECIALISTA]. Lima, 5 de noviembre de 2026')
    expect(pendientes(t)).toEqual(['ESPECIALISTA'])
    expect(rellenar('DEL {{JUZGADO}}', datos)).toBe('DEL 5° JUZGADO DE TRABAJO')
  })

  it('los modelos base solo usan variables conocidas', () => {
    for (const m of MODELOS_BASE)
      for (const [, v] of m.contenido.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) expect(Object.keys(VARIABLES)).toContain(v.toLowerCase())
  })

  it('fecha y nombre de archivo', () => {
    expect(fechaEnLetras('2027-01-01')).toBe('1 de enero de 2027')
    expect(nombreArchivo('Pedido de sentencia / urgente', exp)).toBe('Pedido de sentencia - urgente - LA-01.docx')
  })
})
