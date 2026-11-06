import type { Accion, Audiencia, Expediente, Notificacion } from './entidades'
import { estadoMovimiento, type Contexto, type IndiceUltimaAccion } from './agenda/que-toca-hoy'
import { contar, lunesDe, type FilaConteo } from './reportes'
import { sumarDias, type FechaISO } from './shared/fecha'

/** Panel del estudio: el estado de la cartera de un vistazo (no reemplaza a «Hoy», que es la lista de tareas). */
export interface Panel {
  indicadores: {
    activos: number
    /** Activos con al menos una acción en los últimos 30 días */
    impulsados30: number
    porcentajeImpulsados: number | null
    sinMovimiento: number
    plazosSemana: number
    vencidos: number
    audiencias30: number
  }
  /** Acciones por semana, últimas 12 semanas (incluida la actual) */
  semanas: { inicio: FechaISO; n: number }[]
  porEtapa: FilaConteo[]
  porMateria: FilaConteo[]
  /** Activos según días desde el último movimiento */
  antiguedad: FilaConteo[]
  masQuietos: { id: string; codigo?: string; numero: string; cliente?: string; dias: number }[]
  porResponsable30: FilaConteo[]
}

export const TRAMOS: [string, number, number][] = [
  ['0 a 15 días', 0, 15],
  ['16 a 30 días', 16, 30],
  ['31 a 60 días', 31, 60],
  ['61 a 90 días', 61, 90],
  ['Más de 90 días', 91, Infinity],
]

const materia = (e: Expediente) => {
  const m = (e.materia ?? '').replace(/\s+/g, ' ').trim()
  return m ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : 'Sin materia'
}

export function calcularPanel(
  d: { expedientes: readonly Expediente[]; acciones: readonly Accion[]; notificaciones: readonly Notificacion[]; audiencias: readonly Audiencia[] },
  ctx: Contexto,
  ultimas: IndiceUltimaAccion,
): Panel {
  const { hoy } = ctx
  const activos = d.expedientes.filter((e) => e.estado === 'activo')
  const hace30 = sumarDias(hoy, -29)
  const en7 = sumarDias(hoy, 7)
  const en30 = sumarDias(hoy, 30)

  const movimientos = activos.map((e) => ({ e, m: estadoMovimiento(e, ultimas, ctx) }))
  const impulsados30 = activos.filter((e) => (ultimas.get(e.id) ?? '') >= hace30).length

  const pendientes = d.notificaciones.filter((n) => n.estado === 'pendiente' && n.vencimiento)
  const recientes = d.acciones.filter((a) => a.fecha >= hace30 && a.fecha <= hoy)

  // 12 semanas completas, con ceros
  const inicio = sumarDias(lunesDe(hoy), -7 * 11)
  const semanas = Array.from({ length: 12 }, (_, i) => ({ inicio: sumarDias(inicio, 7 * i), n: 0 }))
  for (const a of d.acciones) {
    if (a.fecha < inicio || a.fecha > hoy) continue
    const i = Math.floor((Date.parse(a.fecha) - Date.parse(inicio)) / (7 * 86400000))
    if (semanas[i]) semanas[i].n++
  }

  const antiguedad = TRAMOS.map(([clave, min, max]) => ({
    clave,
    n: movimientos.filter(({ m }) => m && m.dias >= min && m.dias <= max).length,
  }))

  return {
    indicadores: {
      activos: activos.length,
      impulsados30,
      porcentajeImpulsados: activos.length ? Math.round((impulsados30 / activos.length) * 100) : null,
      sinMovimiento: movimientos.filter(({ m }) => m?.sinMovimiento).length,
      plazosSemana: pendientes.filter((n) => n.vencimiento! >= hoy && n.vencimiento! <= en7).length,
      vencidos: pendientes.filter((n) => n.vencimiento! < hoy).length,
      audiencias30: d.audiencias.filter((a) => a.estado === 'programada' && a.fecha >= hoy && a.fecha <= en30).length,
    },
    semanas,
    porEtapa: contar(activos.map((e) => e.etapa || 'Sin etapa')),
    porMateria: contar(activos.map(materia)),
    antiguedad,
    masQuietos: movimientos
      .filter(({ m }) => m)
      .sort((a, b) => b.m!.dias - a.m!.dias)
      .slice(0, 8)
      .map(({ e, m }) => ({ id: e.id, codigo: e.codigo, numero: e.numero, cliente: e.cliente || e.demandante, dias: m!.dias })),
    porResponsable30: contar(recientes.map((a) => a.responsable || 'Sin responsable')),
  }
}
