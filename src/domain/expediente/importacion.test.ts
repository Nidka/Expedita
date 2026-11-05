import { describe, expect, it } from 'vitest'
import { importarCuadro, normalizarCodigo } from './importacion'

const fila = (o: Record<string, unknown>) => ({
  'Nº de expedientes': o.numero,
  CODIGO: o.codigo,
  Cliente: o.cliente,
  'Estado del proceso': o.estado,
  'Último acto procesal': o.acto,
})

describe('importación del cuadro', () => {
  it('normaliza el código interno', () => {
    expect(normalizarCodigo('la - 01 ')).toBe('LA-01')
    expect(normalizarCodigo('LA-135')).toBe('LA-135')
    expect(normalizarCodigo('  ')).toBeUndefined()
  })

  it('combina con el cuadro actualizado sin mezclar etapa y estado', () => {
    const r = importarCuadro(
      [fila({ numero: '06762-2023-0-1801-JP-LA-01', codigo: 'LA - 01', estado: 'Archivado' })],
      [fila({ numero: '06762-2023-0-1801-JP-LA-01', estado: 'En ejecución' }), fila({ numero: '00422-2026-0-1602-JR-LA-02', estado: 'En calificación' })],
    )
    expect(r.expedientes).toHaveLength(1)
    expect(r.expedientes[0]).toMatchObject({ codigo: 'LA-01', estado: 'activo', etapa: 'Ejecución' })
    expect(r.soloEnActualizado.map((e) => e.numero)).toEqual(['00422-2026-0-1602-JR-LA-02'])
  })

  it('fusiona números repetidos uniendo sus códigos', () => {
    const r = importarCuadro([
      fila({ numero: '01727-2018-0-1601-JR-LA-06', codigo: 'LA-135' }),
      fila({ numero: '01727-2018-0-1601-JR-LA-06', codigo: 'LA - 137' }),
    ])
    expect(r.expedientes).toHaveLength(1)
    expect(r.expedientes[0].codigo).toBe('LA-135 / LA-137')
    expect(r.fusionados).toHaveLength(1)
  })
})
