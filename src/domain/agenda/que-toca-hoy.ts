import type { Accion, Audiencia, Expediente, Id, Notificacion, Visita } from '../entidades'
import type { CalendarioHabil } from '../plazos/calendario-habil'
import { VIAS } from '../plazos/catalogo'
import { diferenciaDias, sumarDias, type FechaISO } from '../shared/fecha'

export const ABANDONO_AVISO_DIAS = 90
export const ABANDONO_RIESGO_DIAS = 120

export type Severidad = 'vencido' | 'urgente' | 'proximo' | 'info'
export type TipoPendiente = 'notificacion' | 'proxima' | 'audiencia' | 'visita' | 'abandono' | 'sin-movimiento'

export interface Pendiente {
  clave: string
  tipo: TipoPendiente
  severidad: Severidad
  titulo: string
  detalle: string
  fecha?: FechaISO
  expedienteId?: Id
  /** Para ordenar: menor = más urgente */
  orden: number
}

export interface Indicadores {
  notificacionesPendientes: number
  plazosVencidos: number
  plazosPorVencer: number
  sinMovimiento: number
}

export interface Snapshot {
  expedientes: readonly Expediente[]
  acciones: readonly Accion[]
  notificaciones: readonly Notificacion[]
  audiencias: readonly Audiencia[]
  visitas: readonly Visita[]
}

export interface Contexto {
  hoy: FechaISO
  calendario: CalendarioHabil
  diasSinMovimiento: number
}

const PESO: Record<Severidad, number> = { vencido: 0, urgente: 1000, proximo: 2000, info: 3000 }

function severidadPorHabiles(restantes: number): Severidad {
  if (restantes < 0) return 'vencido'
  if (restantes <= 3) return 'urgente'
  return 'proximo'
}

/** Fecha de la última acción de cada expediente, calculada una sola vez (evita recorrer todas las acciones por expediente). */
export type IndiceUltimaAccion = ReadonlyMap<Id, FechaISO>

export function indiceUltimaAccion(acciones: readonly Accion[]): IndiceUltimaAccion {
  const m = new Map<Id, FechaISO>()
  for (const a of acciones) {
    const previa = m.get(a.expedienteId)
    if (!previa || a.fecha > previa) m.set(a.expedienteId, a.fecha)
  }
  return m
}

/** Fecha del último movimiento conocido: última acción o último acto del cuadro. */
export function ultimoMovimiento(exp: Expediente, acciones: readonly Accion[] | IndiceUltimaAccion): FechaISO | undefined {
  let ultima = exp.fechaUltimoActo
  if (acciones instanceof Map) {
    const f = acciones.get(exp.id)
    if (f && (!ultima || f > ultima)) ultima = f
  } else for (const a of acciones as readonly Accion[]) if (a.expedienteId === exp.id && (!ultima || a.fecha > ultima)) ultima = a.fecha
  return ultima ?? exp.creadoEn?.slice(0, 10)
}

export interface EstadoMovimiento {
  dias: number
  sinMovimiento: boolean
  abandono?: 'aviso' | 'riesgo'
}

export function estadoMovimiento(
  exp: Expediente,
  acciones: readonly Accion[] | IndiceUltimaAccion,
  ctx: Contexto,
): EstadoMovimiento | undefined {
  if (exp.estado !== 'activo') return undefined
  const ultimo = ultimoMovimiento(exp, acciones)
  if (!ultimo) return undefined
  const dias = diferenciaDias(ultimo, ctx.hoy)
  const abandono = VIAS[exp.via]?.abandono
    ? dias >= ABANDONO_RIESGO_DIAS
      ? 'riesgo'
      : dias >= ABANDONO_AVISO_DIAS
        ? 'aviso'
        : undefined
    : undefined
  return { dias, sinMovimiento: dias >= ctx.diasSinMovimiento, abandono }
}

export function calcularPendientes(s: Snapshot, ctx: Contexto): { pendientes: Pendiente[]; indicadores: Indicadores } {
  const { hoy, calendario: cal } = ctx
  const expPorId = new Map(s.expedientes.map((e) => [e.id, e]))
  const etiqueta = (id?: Id, numero?: string) => {
    const e = id ? expPorId.get(id) : undefined
    return e ? `${e.codigo ? e.codigo + ' · ' : ''}${e.numero}` : (numero ?? '')
  }
  const out: Pendiente[] = []
  let plazosVencidos = 0
  let plazosPorVencer = 0

  for (const n of s.notificaciones) {
    if (n.estado !== 'pendiente') continue
    const restantes = n.vencimiento ? cal.habilesEntre(hoy, n.vencimiento) : undefined
    const sev = restantes === undefined ? 'urgente' : severidadPorHabiles(restantes)
    if (sev === 'vencido') plazosVencidos++
    else if (sev === 'urgente' && restantes !== undefined) plazosPorVencer++
    out.push({
      clave: `n:${n.id}`,
      tipo: 'notificacion',
      severidad: sev,
      titulo: n.asunto || 'Notificación pendiente',
      detalle: etiqueta(n.expedienteId, n.numero),
      fecha: n.vencimiento,
      expedienteId: n.expedienteId,
      orden: PESO[sev] + (restantes ?? 0),
    })
  }

  // Las fechas ISO se comparan como texto: más barato que convertirlas a Date en miles de acciones
  const limite7 = sumarDias(hoy, 7)
  for (const a of s.acciones) {
    if (!a.proximaFecha || a.proximaCumplida || !a.proxima || a.proximaFecha > limite7) continue
    const restantes = cal.habilesEntre(hoy, a.proximaFecha)
    const sev = severidadPorHabiles(restantes)
    if (sev === 'vencido') plazosVencidos++
    else if (sev === 'urgente') plazosPorVencer++
    out.push({
      clave: `p:${a.id}`,
      tipo: 'proxima',
      severidad: sev,
      titulo: a.proxima,
      detalle: etiqueta(a.expedienteId),
      fecha: a.proximaFecha,
      expedienteId: a.expedienteId,
      orden: PESO[sev] + restantes,
    })
  }

  for (const au of s.audiencias) {
    if (au.estado !== 'programada') continue
    const dias = diferenciaDias(hoy, au.fecha)
    if (dias < 0 || dias > 7) continue
    out.push({
      clave: `a:${au.id}`,
      tipo: 'audiencia',
      severidad: dias <= 1 ? 'urgente' : 'proximo',
      titulo: `Audiencia de ${au.tipo.toLowerCase()}`,
      detalle: `${etiqueta(au.expedienteId)}${au.hora ? ` · ${au.hora}` : ''} · ${au.modalidad}`,
      fecha: au.fecha,
      expedienteId: au.expedienteId,
      orden: (dias <= 1 ? PESO.urgente : PESO.proximo) + dias,
    })
  }

  for (const v of s.visitas) {
    if (v.estado !== 'programada') continue
    const dias = diferenciaDias(hoy, v.fecha)
    if (dias < 0 || dias > 3) continue
    out.push({
      clave: `v:${v.id}`,
      tipo: 'visita',
      severidad: 'proximo',
      titulo: `Visita: ${v.juzgado}`,
      detalle: `${v.responsable} · ${v.items.length} ${v.items.length === 1 ? 'expediente' : 'expedientes'}`,
      fecha: v.fecha,
      orden: PESO.proximo + dias,
    })
  }

  let sinMovimiento = 0
  const ultimas = indiceUltimaAccion(s.acciones)
  for (const e of s.expedientes) {
    const m = estadoMovimiento(e, ultimas, ctx)
    if (!m) continue
    if (m.sinMovimiento) sinMovimiento++
    if (m.abandono) {
      out.push({
        clave: `ab:${e.id}`,
        tipo: 'abandono',
        severidad: m.abandono === 'riesgo' ? 'vencido' : 'urgente',
        titulo: m.abandono === 'riesgo' ? 'Riesgo de abandono (CPC art. 346)' : 'Aviso de abandono',
        detalle: `${etiqueta(e.id)} · ${m.dias} días sin impulso`,
        expedienteId: e.id,
        orden: (m.abandono === 'riesgo' ? PESO.vencido : PESO.urgente) - m.dias,
      })
    } else if (m.sinMovimiento) {
      out.push({
        clave: `sm:${e.id}`,
        tipo: 'sin-movimiento',
        severidad: 'info',
        titulo: 'Sin movimiento',
        detalle: `${etiqueta(e.id)} · ${m.dias} días`,
        expedienteId: e.id,
        orden: PESO.info - m.dias,
      })
    }
  }

  out.sort((a, b) => a.orden - b.orden)
  return {
    pendientes: out,
    indicadores: {
      notificacionesPendientes: s.notificaciones.filter((n) => n.estado === 'pendiente').length,
      plazosVencidos,
      plazosPorVencer,
      sinMovimiento,
    },
  }
}
