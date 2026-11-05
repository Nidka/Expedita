import type { Expediente } from '@/domain/entidades'
import { aDate, type FechaISO } from '@/domain/shared/fecha'

const FMT_CORTA = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const FMT_LARGA = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const FMT_MES = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const SOLES = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 })

export const fecha = (f?: FechaISO) => (f ? FMT_CORTA.format(aDate(f)).replace('.', '') : '—')
/** «Jueves, 5 de noviembre» (solo la primera letra en mayúscula). */
export const fechaLarga = (f: FechaISO) => {
  const s = FMT_LARGA.format(aDate(f))
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const mes = (f: FechaISO) => {
  const s = FMT_MES.format(aDate(f))
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export const soles = (n?: number) => (n === undefined ? '—' : SOLES.format(n))

export const etiquetaExp = (e?: Pick<Expediente, 'codigo' | 'numero'>) =>
  e ? `${e.codigo ? `${e.codigo} · ` : ''}${e.numero}` : '—'

export const partes = (e: Expediente) =>
  `${e.cliente || e.demandante || 'Cliente sin registrar'}${e.demandado ? ` vs. ${e.demandado}` : ''}`

export function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`
}
