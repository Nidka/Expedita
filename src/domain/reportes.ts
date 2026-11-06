import type { Accion, Audiencia, Expediente, Notificacion } from './entidades'
import { diaSemana, sumarDias, type FechaISO } from './shared/fecha'

export interface FiltrosReporte {
  desde: FechaISO
  hasta: FechaISO
  responsable?: string
  cliente?: string
}

export interface FilaConteo {
  clave: string
  n: number
}

export interface Reporte {
  acciones: Accion[]
  indicadores: {
    acciones: number
    expedientesImpulsados: number
    notificacionesAtendidas: number
    /** % de notificaciones atendidas el día del vencimiento o antes (de las que tenían vencimiento) */
    aTiempo: number | null
    audienciasRealizadas: number
  }
  porSemana: { inicio: FechaISO; n: number }[]
  porResponsable: FilaConteo[]
  porTipo: FilaConteo[]
  porCliente: { cliente: string; n: number; expedientes: number; ultima: FechaISO }[]
}

const SIN_CLIENTE = 'Sin cliente'

/** Lunes de la semana de una fecha */
export function lunesDe(f: FechaISO): FechaISO {
  return sumarDias(f, -((diaSemana(f) + 6) % 7))
}

function contar(valores: string[]): FilaConteo[] {
  const m = new Map<string, number>()
  for (const v of valores) m.set(v, (m.get(v) ?? 0) + 1)
  return [...m.entries()].map(([clave, n]) => ({ clave, n })).sort((a, b) => b.n - a.n || a.clave.localeCompare(b.clave, 'es'))
}

export function calcularReporte(
  datos: { acciones: readonly Accion[]; notificaciones: readonly Notificacion[]; audiencias: readonly Audiencia[]; expedientes: readonly Expediente[] },
  f: FiltrosReporte,
): Reporte {
  const expPorId = new Map(datos.expedientes.map((e) => [e.id, e]))
  const clienteDe = (id?: string) => {
    const e = id ? expPorId.get(id) : undefined
    return e?.cliente || e?.demandante || SIN_CLIENTE
  }
  const enPeriodo = (d?: FechaISO) => Boolean(d && d >= f.desde && d <= f.hasta)
  const delCliente = (expId?: string) => !f.cliente || clienteDe(expId) === f.cliente

  const acciones = datos.acciones.filter(
    (a) => enPeriodo(a.fecha) && (!f.responsable || a.responsable === f.responsable) && delCliente(a.expedienteId),
  )
  const atendidas = datos.notificaciones.filter((n) => n.estado === 'atendida' && enPeriodo(n.atendidaEn) && delCliente(n.expedienteId))
  const conPlazo = atendidas.filter((n) => n.vencimiento)
  const aTiempo = conPlazo.length ? Math.round((conPlazo.filter((n) => n.atendidaEn! <= n.vencimiento!).length / conPlazo.length) * 100) : null

  // Semanas completas del periodo, aunque no tengan acciones (el cero también informa)
  const porSemanaMapa = new Map<FechaISO, number>()
  for (let s = lunesDe(f.desde); s <= f.hasta; s = sumarDias(s, 7)) porSemanaMapa.set(s, 0)
  for (const a of acciones) {
    const s = lunesDe(a.fecha)
    porSemanaMapa.set(s, (porSemanaMapa.get(s) ?? 0) + 1)
  }

  const clientes = new Map<string, { n: number; exps: Set<string>; ultima: FechaISO }>()
  for (const a of acciones) {
    const k = clienteDe(a.expedienteId)
    const x = clientes.get(k) ?? { n: 0, exps: new Set<string>(), ultima: a.fecha }
    x.n++
    x.exps.add(a.expedienteId)
    if (a.fecha > x.ultima) x.ultima = a.fecha
    clientes.set(k, x)
  }

  return {
    acciones,
    indicadores: {
      acciones: acciones.length,
      expedientesImpulsados: new Set(acciones.map((a) => a.expedienteId)).size,
      notificacionesAtendidas: atendidas.length,
      aTiempo,
      audienciasRealizadas: datos.audiencias.filter((a) => a.estado === 'realizada' && enPeriodo(a.fecha) && delCliente(a.expedienteId)).length,
    },
    porSemana: [...porSemanaMapa.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([inicio, n]) => ({ inicio, n })),
    porResponsable: contar(acciones.map((a) => a.responsable || 'Sin responsable')),
    porTipo: contar(acciones.map((a) => a.tipo)),
    porCliente: [...clientes.entries()]
      .map(([cliente, x]) => ({ cliente, n: x.n, expedientes: x.exps.size, ultima: x.ultima }))
      .sort((a, b) => b.n - a.n || a.cliente.localeCompare(b.cliente, 'es')),
  }
}

export type Periodo = 'este-mes' | 'mes-anterior' | '30' | '90' | 'este-anio'

export function rangoDePeriodo(p: Periodo, hoy: FechaISO): { desde: FechaISO; hasta: FechaISO } {
  const [a, m] = hoy.split('-').map(Number)
  const primero = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, '0')}-01`
  switch (p) {
    case 'este-mes':
      return { desde: primero(a, m), hasta: hoy }
    case 'mes-anterior': {
      const [aa, mm] = m === 1 ? [a - 1, 12] : [a, m - 1]
      return { desde: primero(aa, mm), hasta: sumarDias(primero(a, m), -1) }
    }
    case '30':
      return { desde: sumarDias(hoy, -29), hasta: hoy }
    case '90':
      return { desde: sumarDias(hoy, -89), hasta: hoy }
    case 'este-anio':
      return { desde: `${a}-01-01`, hasta: hoy }
  }
}
