import { describe, expect, it } from 'vitest'
import { puedeEliminar } from './permisos'

describe('permisos', () => {
  it('el administrador elimina todo; el abogado solo lo suyo', () => {
    expect(puedeEliminar({ rol: 'admin', userId: 'a' }, { creadoPor: 'b' })).toBe(true)
    expect(puedeEliminar({ rol: 'abogado', userId: 'b' }, { creadoPor: 'b' })).toBe(true)
    expect(puedeEliminar({ rol: 'abogado', userId: 'b' }, { creadoPor: 'c' })).toBe(false)
    expect(puedeEliminar({ rol: 'abogado', userId: 'b' }, {})).toBe(false)
  })
})
