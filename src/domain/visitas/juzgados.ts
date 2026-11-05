import type { Expediente } from '../entidades'
import { SUGERENCIA_POR_ETAPA } from '../plazos/catalogo'

/** Distritos que se consideran «juzgados de Lima» para las visitas (supuesto 3). */
export const DISTRITOS_LIMA = ['Lima', 'Lima - Sur', 'Lima - Este', 'Lima - Norte', 'Callao', 'Puente Piedra - Ventanilla']

export function sinTildes(s: string | undefined): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
}

export interface JuzgadoAgrupado {
  clave: string
  nombre: string
  distrito: string
}

/**
 * Unifica nombres escritos de distintas formas («18º Juzgado Especializado…», «18° JUZG. DE TRABAJO»)
 * en un mismo juzgado (supuesto 10 del traspaso).
 */
export function juzgadoDe(e: Pick<Expediente, 'organo' | 'distrito'>): JuzgadoAgrupado {
  const s = sinTildes(e.organo)
  const n = s.match(/^\s*(\d{1,2})/)?.[1] ?? ''
  const sede = /LINCE|SAN ISIDRO/.test(s)
    ? ' · Lince y San Isidro'
    : /SURCO/.test(s)
      ? ' · Surco'
      : /ALZAMORA/.test(s)
        ? ' · Sede Alzamora'
        : ''
  const tipo = /SALA/.test(s)
    ? 'Sala Laboral'
    : /PAZ/.test(s)
      ? 'Juzgado de Paz Letrado Laboral'
      : /CONSTITUCIONAL/.test(s)
        ? 'Juzgado Constitucional'
        : /CIVIL/.test(s)
          ? 'Juzgado Civil'
          : 'Juzgado de Trabajo'
  const trans = /TRANSI/.test(s) ? ' Transitorio' : ''
  const zona = s.match(/ZONA\s*0?(\d+)/)?.[1]
  const distrito = e.distrito || 'Sin distrito'
  const nombre = `${n ? `${Number(n)}.° ` : ''}${tipo}${trans}${zona ? ' · Zona ' + zona.padStart(2, '0') : ''}${sede}`
  return { clave: `${distrito}|${nombre}`, nombre, distrito }
}

export function esSoloImpulso(actuacion: string | undefined): boolean {
  return !actuacion || /^I\.?P\.?$/i.test(actuacion.trim())
}

/** Motivo de visita: actuación pendiente concreta, último acto o sugerencia de la etapa. */
export function motivoVisita(e: Expediente): string {
  const partes: string[] = []
  if (!esSoloImpulso(e.actuacionPendiente)) partes.push(e.actuacionPendiente!.trim())
  if (e.ultimoActo) partes.push(`Último acto: ${e.ultimoActo}${e.fechaUltimoActo ? ` (${e.fechaUltimoActo})` : ''}`)
  if (!partes.length) partes.push((e.etapa && SUGERENCIA_POR_ETAPA[e.etapa]) || 'Revisar el estado y pedir que se provea lo pendiente')
  return partes.join(' · ')
}

export interface GrupoVisita extends JuzgadoAgrupado {
  expedientes: Expediente[]
}

export function agruparPorJuzgado(expedientes: readonly Expediente[]): GrupoVisita[] {
  const grupos = new Map<string, GrupoVisita>()
  for (const e of expedientes) {
    const j = juzgadoDe(e)
    const g = grupos.get(j.clave) ?? { ...j, expedientes: [] }
    g.expedientes.push(e)
    grupos.set(j.clave, g)
  }
  const numCodigo = (c?: string) => parseInt(String(c ?? '').replace(/\D/g, '')) || 999
  for (const g of grupos.values()) g.expedientes.sort((a, b) => numCodigo(a.codigo) - numCodigo(b.codigo))
  return [...grupos.values()].sort(
    (a, b) =>
      a.distrito.localeCompare(b.distrito) ||
      b.expedientes.length - a.expedientes.length ||
      a.nombre.localeCompare(b.nombre, 'es', { numeric: true }),
  )
}

/** Texto de la hoja de ruta para WhatsApp (RF-25). */
export function hojaDeRuta(
  fecha: string,
  visitas: { juzgado: string; sede?: string; responsable: string; items: { codigo?: string; numero: string; motivo: string }[] }[],
): string {
  const lineas = [`*Hoja de ruta · ${fecha}*`]
  for (const v of visitas) {
    lineas.push('', `*${v.juzgado}*${v.sede ? ` — ${v.sede}` : ''} (${v.responsable})`)
    for (const i of v.items) lineas.push(`• ${i.codigo ? i.codigo + ' · ' : ''}${i.numero}: ${i.motivo}`)
  }
  return lineas.join('\n')
}
