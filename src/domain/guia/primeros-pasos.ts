/**
 * Guía de primeros pasos: qué falta para que el estudio use Expedita completo.
 * Cada paso se marca solo cuando se detecta en los datos; los que no se pueden detectar
 * (p. ej. instalar un script de Google) se marcan a mano.
 */

export type PasoId =
  | 'clave'
  | 'equipo'
  | 'importar'
  | 'plazos'
  | 'membrete'
  | 'sinoe'
  | 'recordatorio'
  | 'drive'
  | 'calendario'
  | 'primera-accion'
  | 'recorrido'

export interface EstadoParaGuia {
  esAdmin: boolean
  expedientes: number
  /** Personas del equipo (incluida quien mira) */
  miembros: number
  invitaciones: number
  /** Acciones registradas por esta persona */
  accionesPropias: number
  claveDefinida: boolean
  config: { membreteTitulo?: string; gmailUrl?: string; driveUrl?: string; diasInhabiles?: readonly string[] }
  /** Pasos marcados a mano */
  marcados: ReadonlySet<string>
}

export interface PasoGuia {
  id: PasoId
  hecho: boolean
  /** Se detecta en los datos (no hace falta marcarlo a mano) */
  automatico: boolean
  opcional: boolean
}

export function pasosDeLaGuia(s: EstadoParaGuia): PasoGuia[] {
  const p = (id: PasoId, detectado: boolean | null, opcional = false): PasoGuia => ({
    id,
    hecho: detectado === true || s.marcados.has(id),
    automatico: detectado !== null,
    opcional,
  })
  const comunes = [
    p('clave', s.claveDefinida),
    p('calendario', null, true),
    p('primera-accion', s.accionesPropias > 0),
    p('recorrido', null, true),
  ]
  if (!s.esAdmin) return comunes
  return [
    p('clave', s.claveDefinida),
    p('importar', s.expedientes > 0),
    p('equipo', s.miembros > 1 || s.invitaciones > 0),
    p('plazos', (s.config.diasInhabiles?.length ?? 0) > 0 ? true : null),
    p('membrete', Boolean(s.config.membreteTitulo?.trim())),
    p('sinoe', Boolean(s.config.gmailUrl), true),
    p('recordatorio', null, true),
    p('drive', Boolean(s.config.driveUrl), true),
    p('calendario', null, true),
    p('primera-accion', s.accionesPropias > 0),
    p('recorrido', null, true),
  ]
}

export function progreso(pasos: readonly PasoGuia[]): { hechos: number; total: number; completo: boolean } {
  const hechos = pasos.filter((x) => x.hecho).length
  // La guía se da por terminada cuando están todos los obligatorios
  const completo = pasos.every((x) => x.hecho || x.opcional)
  return { hechos, total: pasos.length, completo }
}

/** Primer paso sin hacer, empezando por los obligatorios */
export function siguientePaso(pasos: readonly PasoGuia[]): PasoGuia | undefined {
  return pasos.find((x) => !x.hecho && !x.opcional) ?? pasos.find((x) => !x.hecho)
}
