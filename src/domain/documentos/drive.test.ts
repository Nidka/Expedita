import { describe, expect, it } from 'vitest'
import type { Expediente } from '../entidades'
import { carpetaDeCliente, carpetaDeExpediente, emparejar, similitud, type CarpetaDrive } from './drive'

const carpeta = (nombre: string, subcarpetas: CarpetaDrive[] = []): CarpetaDrive => ({
  id: nombre,
  nombre,
  url: `https://drive.google.com/${encodeURIComponent(nombre)}`,
  actualizado: '2026-11-01T00:00:00Z',
  archivos: [],
  subcarpetas,
})

describe('similitud de nombres', () => {
  it('ignora tildes, mayúsculas, orden y formas societarias', () => {
    expect(similitud('María Pérez', 'PEREZ MARIA')).toBe(1)
    expect(similitud('Comercial Demo E.I.R.L.', 'comercial demo')).toBe(1)
    expect(similitud('Juan Torres Ramos', 'Juan Torres')).toBe(1)
  })
  it('no confunde nombres distintos', () => {
    expect(similitud('María Pérez', 'María Quispe')).toBe(0.5)
    expect(similitud('Rosa', 'Rosa Quispe')).toBe(0)
  })
})

describe('emparejamiento con carpetas de Drive', () => {
  const carpetas = [
    carpeta('Pérez María', [carpeta('01234-2025 Beneficios sociales')]),
    carpeta('QUISPE ROSA'),
    carpeta('Inversiones Norte S.A.C.'),
  ]
  const exp = (id: string, cliente: string, numero = '09999-2024-0-1801-JR-LA-01'): Expediente =>
    ({ id, cliente, numero }) as Expediente

  it('encuentra la carpeta del cliente', () => {
    expect(carpetaDeCliente({ cliente: 'Rosa Quispe' }, carpetas)?.nombre).toBe('QUISPE ROSA')
    expect(carpetaDeCliente({ cliente: 'Cliente Inexistente' }, carpetas)).toBeUndefined()
  })

  it('prefiere la subcarpeta con el número del expediente', () => {
    expect(carpetaDeExpediente('01234-2025-0-1801-JR-LA-05', carpetas[0]).nombre).toBe('01234-2025 Beneficios sociales')
    expect(carpetaDeExpediente('05555-2023-0-1801-JR-LA-05', carpetas[0]).nombre).toBe('Pérez María')
  })

  it('informa lo que quedó sin emparejar y respeta la asignación manual', () => {
    const r = emparejar(
      [exp('a', 'María Pérez', '01234-2025-0-1801-JR-LA-05'), exp('b', 'Nadie'), { ...exp('c', 'Otro nombre'), driveCarpetaId: 'Inversiones Norte S.A.C.' }],
      { raiz: 'Clientes', generado: '', carpetas },
    )
    expect(r.porExpediente.get('a')?.nombre).toBe('01234-2025 Beneficios sociales')
    expect(r.porExpediente.get('c')?.nombre).toBe('Inversiones Norte S.A.C.')
    expect(r.sinCarpeta.map((e) => e.id)).toEqual(['b'])
    expect(r.carpetasSinExpediente.map((c) => c.nombre)).toEqual(['QUISPE ROSA'])
  })
})
