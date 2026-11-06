import { describe, expect, it } from 'vitest'
import type { Contenedor } from '@/application/contenedor'
import { conCambiosLocales } from './cambios-locales'

class RepoFalso {
  filas = [1]
  async listar() {
    return this.filas
  }
  async crear(n: number) {
    this.filas.push(n)
    return n
  }
}

function armar() {
  const remotos: string[] = []
  const base = {
    acciones: new RepoFalso(),
    cambios: { suscribir: (_t: string[], cb: (t: string) => void) => (remotos.push('suscrito'), void cb, () => remotos.push('fuera')) },
  } as unknown as Contenedor
  return { c: conCambiosLocales(base), remotos }
}

describe('conCambiosLocales', () => {
  it('avisa al escribir y no al leer', async () => {
    const { c } = armar()
    const vistos: string[] = []
    c.cambios.suscribir(['acciones'], (t) => vistos.push(t))
    await c.acciones.listar()
    expect(vistos).toEqual([])
    await (c.acciones as unknown as RepoFalso).crear(2)
    expect(vistos).toEqual(['acciones'])
    expect(await c.acciones.listar()).toEqual([1, 2])
  })

  it('ignora tablas no suscritas y libera también la suscripción remota', async () => {
    const { c, remotos } = armar()
    const vistos: string[] = []
    const quitar = c.cambios.suscribir(['expedientes'], (t) => vistos.push(t))
    await (c.acciones as unknown as RepoFalso).crear(3)
    expect(vistos).toEqual([])
    quitar()
    expect(remotos).toEqual(['suscrito', 'fuera'])
  })
})
