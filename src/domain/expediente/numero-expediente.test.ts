import { describe, expect, it } from 'vitest'
import { extraerNumeroExpediente, extraerTodos, parsearNumeroExpediente } from './numero-expediente'

describe('número de expediente', () => {
  it('normaliza ceros y mayúsculas', () => {
    const n = parsearNumeroExpediente('5328-2022-0-1801-jp-la-4')
    expect(n?.valor).toBe('05328-2022-0-1801-JP-LA-04')
    expect(n?.especialidad).toBe('LA')
    expect(n?.instancia).toBe('JP')
  })

  it('acepta incidentes de varios dígitos y espacios alrededor de guiones', () => {
    expect(parsearNumeroExpediente('11417 - 2026 - 90 - 1801 - JR - DC - 06')?.valor).toBe('11417-2026-90-1801-JR-DC-06')
  })

  it('rechaza números incompletos', () => {
    expect(parsearNumeroExpediente('05328-2022-1801-JP-LA-04')).toBeNull()
  })

  it('separa el texto sobrante de una celda del cuadro', () => {
    const r = extraerNumeroExpediente('01727-2018-0-1601-JR-LA-06 (cc 406007)')
    expect(r?.numero.valor).toBe('01727-2018-0-1601-JR-LA-06')
    expect(r?.resto).toBe('(cc 406007)')
    expect(extraerNumeroExpediente('05139-2025-0-1864-JR-LA-09 / Cod. Cautelar 043502')?.resto).toBe('Cod. Cautelar 043502')
  })

  it('encuentra el número dentro de un correo del SINOE', () => {
    const correo = 'Se le notifica en el EXPEDIENTE N° 00422-2026-0-1602-JR-LA-02 la RESOLUCIÓN 3'
    expect(extraerTodos(correo).map((n) => n.valor)).toEqual(['00422-2026-0-1602-JR-LA-02'])
  })
})
