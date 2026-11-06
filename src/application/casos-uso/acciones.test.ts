import { describe, expect, it } from 'vitest'
import { contenedorMemoria } from '@/infrastructure/memoria/repositorios'
import { editarAccion, eliminarAccion, registrarAccion, type CambiosAccion } from './acciones'

/** Captura lo que editarAccion envía al repositorio */
async function editarAccionCambios(cambios: CambiosAccion) {
  let enviado: Record<string, unknown> = {}
  const c = contenedorMemoria()
  c.acciones.actualizar = async (_id, x) => ((enviado = x as Record<string, unknown>), {} as never)
  await editarAccion(c, 'x', cambios)
  return enviado
}

async function preparar() {
  const c = contenedorMemoria()
  const exp = await c.expedientes.crear({ numero: '01234-2025-0-1801-JR-LA-05', via: 'lab-ord', estado: 'activo' })
  const n = await c.notificaciones.crear({
    expedienteId: exp.id,
    numero: exp.numero,
    asunto: 'Resolución 4',
    recibido: '2026-11-02',
    casilla: true,
    estado: 'pendiente',
    origen: 'manual',
  })
  return { c, exp, n }
}

describe('acciones', () => {
  it('registrar atiende la notificación; eliminar la vuelve a abrir', async () => {
    const { c, exp, n } = await preparar()
    const a = await registrarAccion(c, {
      expedienteId: exp.id,
      fecha: '2026-11-03',
      tipo: 'Absolución de traslado',
      descripcion: 'Se absolvió el traslado',
      responsable: 'Ana',
      notificacionId: n.id,
    })
    expect((await c.notificaciones.obtener(n.id))?.estado).toBe('atendida')
    const r = await eliminarAccion(c, a)
    expect(r.notificacionReabierta).toBe(true)
    expect((await c.notificaciones.obtener(n.id))?.estado).toBe('pendiente')
    expect(await c.acciones.listar()).toHaveLength(0)
  })

  it('editar corrige y valida', async () => {
    const { c, exp } = await preparar()
    const a = await registrarAccion(c, { expedienteId: exp.id, fecha: '2026-11-03', tipo: 'Escrito de impulso', descripcion: 'Texto', responsable: 'Ana' })
    const e = await editarAccion(c, a.id, { descripcion: '  Texto corregido ', cargo: '' })
    expect(e.descripcion).toBe('Texto corregido')
    expect(e.cargo).toBeUndefined()
    // No toca los campos que no se editaron
    const solo = await editarAccion(c, a.id, { cargo: '123' })
    expect(solo.descripcion).toBe('Texto corregido')
    expect(solo.responsable).toBe('Ana')
    expect(Object.keys(await editarAccionCambios({ cargo: '1' }))).toEqual(['cargo'])
    await expect(editarAccion(c, a.id, { descripcion: '   ' })).rejects.toThrow()
    await expect(editarAccion(c, a.id, { proximaFecha: '2026-11-10', proxima: '' })).rejects.toThrow()
  })
})
