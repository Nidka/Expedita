import type { Accion, Audiencia, EstadoExpediente, Expediente, ModalidadAudiencia } from '../entidades'
import type { ViaId } from '../plazos/catalogo'
import type { FechaISO } from '../shared/fecha'

/** Enlace privado y revocable para que el cliente vea el avance de su expediente (RF-40). */
export interface EnlaceCliente {
  id: string
  expedienteId: string
  token: string
  expira?: FechaISO
  revocado: boolean
  creadoEn: string
}

/**
 * Lo que ve el cliente: datos generales, tipo y fecha de cada movimiento (nunca el detalle interno,
 * notas ni responsables) y sus audiencias programadas. La misma regla vive en la función SQL `avance_cliente`.
 */
export interface AvanceCliente {
  estudio: string
  numero: string
  cliente?: string
  materia?: string
  via: ViaId
  etapa?: string
  estado: EstadoExpediente
  organo?: string
  expira?: FechaISO
  movimientos: { fecha: FechaISO; tipo: string }[]
  audiencias: { fecha: FechaISO; hora?: string; tipo: string; modalidad: ModalidadAudiencia }[]
}

export const MAX_MOVIMIENTOS = 12

export function enlaceVigente(e: Pick<EnlaceCliente, 'revocado' | 'expira'>, hoy: FechaISO): boolean {
  return !e.revocado && (!e.expira || e.expira >= hoy)
}

export function construirAvance(
  estudio: string,
  exp: Expediente,
  acciones: readonly Accion[],
  audiencias: readonly Audiencia[],
  hoy: FechaISO,
  expira?: FechaISO,
): AvanceCliente {
  return {
    estudio,
    numero: exp.numero,
    cliente: exp.cliente || exp.demandante,
    materia: exp.materia,
    via: exp.via,
    etapa: exp.etapa,
    estado: exp.estado,
    organo: exp.organo,
    expira,
    movimientos: acciones
      .filter((a) => a.expedienteId === exp.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn))
      .slice(0, MAX_MOVIMIENTOS)
      .map((a) => ({ fecha: a.fecha, tipo: a.tipo })),
    audiencias: audiencias
      .filter((a) => a.expedienteId === exp.id && a.estado === 'programada' && a.fecha >= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
      .map((a) => ({ fecha: a.fecha, hora: a.hora, tipo: a.tipo, modalidad: a.modalidad })),
  }
}

/** Token de 256 bits en base64url (43 caracteres): imposible de adivinar. */
export function generarToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
