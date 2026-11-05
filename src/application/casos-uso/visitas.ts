import type { Expediente, Visita } from '@/domain/entidades'
import { juzgadoDe, motivoVisita } from '@/domain/visitas/juzgados'
import type { FechaISO } from '@/domain/shared/fecha'
import type { Contenedor } from '../contenedor'
import { registrarAccion } from './acciones'

/** RF-23: crea una visita por juzgado con los expedientes elegidos. */
export async function programarVisitas(
  c: Contenedor,
  cmd: { expedientes: Expediente[]; fecha: FechaISO; responsable: string; sedes: Map<string, string> },
): Promise<Visita[]> {
  if (!cmd.expedientes.length) throw new Error('Marca al menos un expediente.')
  if (!cmd.responsable.trim()) throw new Error('Indica quién irá.')
  const porJuzgado = new Map<string, Expediente[]>()
  for (const e of cmd.expedientes) {
    const j = juzgadoDe(e)
    porJuzgado.set(j.clave, [...(porJuzgado.get(j.clave) ?? []), e])
  }
  const creadas: Visita[] = []
  for (const [clave, exps] of porJuzgado) {
    const j = juzgadoDe(exps[0])
    creadas.push(
      await c.visitas.crearConItems(
        {
          fecha: cmd.fecha,
          responsable: cmd.responsable.trim(),
          juzgadoClave: clave,
          juzgado: j.nombre,
          distrito: j.distrito,
          sede: cmd.sedes.get(clave),
          estado: 'programada',
        },
        exps.map((e) => ({ expedienteId: e.id, motivo: motivoVisita(e), hecho: false })),
      ),
    )
  }
  return creadas
}

/**
 * RF-24: guarda lo anotado en el juzgado. Cada expediente con resultado genera la acción
 * «Visita al despacho / cita con especialista». La visita queda realizada cuando todo está marcado.
 */
export async function guardarResultadosVisita(
  c: Contenedor,
  visita: Visita,
  borrador: Record<string, { resultado: string; hecho: boolean }>,
): Promise<number> {
  let acciones = 0
  for (const item of visita.items) {
    const b = borrador[item.id]
    if (!b) continue
    const resultado = b.resultado.trim()
    let accionId = item.accionId
    if (resultado && !accionId) {
      const a = await registrarAccion(c, {
        expedienteId: item.expedienteId,
        fecha: visita.fecha,
        tipo: 'Visita al despacho / cita con especialista',
        descripcion: `${visita.juzgado}: ${resultado}`,
        responsable: visita.responsable,
        visitaId: visita.id,
        origen: 'visita',
      })
      accionId = a.id
      acciones++
    }
    await c.visitas.actualizarItem(item.id, { resultado: resultado || undefined, hecho: b.hecho || Boolean(resultado), accionId })
  }
  const todos = visita.items.every((i) => {
    const b = borrador[i.id]
    return b ? b.hecho || Boolean(b.resultado.trim()) : i.hecho
  })
  if (todos) await c.visitas.actualizar(visita.id, { estado: 'realizada' })
  return acciones
}
