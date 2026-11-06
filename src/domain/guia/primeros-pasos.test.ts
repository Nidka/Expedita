import { describe, expect, it } from 'vitest'
import { pasosDeLaGuia, progreso, siguientePaso, type EstadoParaGuia } from './primeros-pasos'

const base: EstadoParaGuia = {
  esAdmin: true,
  expedientes: 0,
  miembros: 1,
  invitaciones: 0,
  accionesPropias: 0,
  claveDefinida: false,
  config: {},
  marcados: new Set(),
}

describe('primeros pasos', () => {
  it('un estudio nuevo empieza por la contraseña y luego por importar', () => {
    const pasos = pasosDeLaGuia(base)
    expect(progreso(pasos)).toMatchObject({ hechos: 0, completo: false })
    expect(siguientePaso(pasos)?.id).toBe('clave')
    expect(siguientePaso(pasosDeLaGuia({ ...base, claveDefinida: true }))?.id).toBe('importar')
  })

  it('detecta lo hecho en los datos y respeta lo marcado a mano', () => {
    const pasos = pasosDeLaGuia({
      ...base,
      claveDefinida: true,
      expedientes: 181,
      invitaciones: 3,
      accionesPropias: 1,
      config: { membreteTitulo: 'Estudio' },
      marcados: new Set(['plazos']),
    })
    const hecho = Object.fromEntries(pasos.map((p) => [p.id, p.hecho]))
    expect(hecho).toMatchObject({ importar: true, equipo: true, membrete: true, plazos: true, sinoe: false })
    // Lo que falta es opcional: la guía queda completa
    expect(progreso(pasos).completo).toBe(true)
    expect(siguientePaso(pasos)?.opcional).toBe(true)
  })

  it('un abogado ve solo sus pasos', () => {
    expect(pasosDeLaGuia({ ...base, esAdmin: false }).map((p) => p.id)).toEqual(['clave', 'calendario', 'primera-accion', 'recorrido'])
  })
})
