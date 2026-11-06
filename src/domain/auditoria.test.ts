import { describe, expect, it } from 'vitest'
import { camposCambiados, describirCambio } from './auditoria'

describe('auditoría legible', () => {
  it('describe altas y bajas con la referencia del registro', () => {
    expect(describirCambio({ tabla: 'expedientes', operacion: 'INSERT', despues: { codigo: 'LA-04', numero: 'x' } })).toBe('Creó el expediente LA-04')
    expect(describirCambio({ tabla: 'acciones', operacion: 'DELETE', antes: { tipo: 'Escrito de impulso' } })).toBe('Eliminó una acción Escrito de impulso')
  })

  it('lista solo los campos que cambiaron, en lenguaje del estudio', () => {
    const r = describirCambio({
      tabla: 'expedientes',
      operacion: 'UPDATE',
      antes: { codigo: 'LA-04', etapa: 'Postulatoria', notas: null, actualizado_en: '1' },
      despues: { codigo: 'LA-04', etapa: 'Sentencia', notas: 'x', actualizado_en: '2' },
    })
    expect(r).toBe('Editó el expediente LA-04: etapa, notas')
  })

  it('ignora marcas de tiempo automáticas', () => {
    expect(camposCambiados({ actualizado_en: 'a' }, { actualizado_en: 'b' })).toEqual([])
  })
})
