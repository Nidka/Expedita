import type { ViaId } from './plazos/catalogo'
import type { FechaISO } from './shared/fecha'

/** Identificador opaco (uuid en la base de datos). */
export type Id = string

export type Rol = 'admin' | 'abogado'
export type EstadoExpediente = 'activo' | 'archivado'
export type OrigenAccion = 'manual' | 'visita' | 'whatsapp' | 'notificacion' | 'cej'

export interface Miembro {
  id: Id
  userId: Id
  orgId: Id
  nombre: string
  email: string
  telefono?: string
  rol: Rol
}

export interface Expediente {
  id: Id
  orgId: Id
  numero: string
  codigo?: string
  via: ViaId
  etapa?: string
  estado: EstadoExpediente
  distrito?: string
  organo?: string
  especialista?: string
  demandante?: string
  demandado?: string
  cliente?: string
  materia?: string
  montoPetitorio?: number
  montoSentenciado?: number
  estadoProceso?: string
  ultimoActo?: string
  fechaUltimoActo?: FechaISO
  actuacionPendiente?: string
  faltaRealizar?: boolean
  impulsoMau?: string
  documentacion?: string
  ultimaRevisionCej?: FechaISO
  /** Carpeta de Drive asignada a mano (si no, se empareja por nombre del cliente) */
  driveCarpetaId?: string
  notas?: string
  origen?: string
  creadoEn: string
  actualizadoEn: string
}

export const TIPOS_ACCION = [
  'Escrito de impulso',
  'Pedido de sentencia / resolución',
  'Contestación de demanda',
  'Absolución de traslado',
  'Subsanación',
  'Apelación / recurso',
  'Apersonamiento',
  'Alegatos',
  'Revisión en CEJ',
  'Revisión de casilla electrónica',
  'Visita al despacho / cita con especialista',
  'Llamada o correo al juzgado',
  'Audiencia',
  'Pago de arancel / tasa',
  'Otra',
] as const
export type TipoAccion = (typeof TIPOS_ACCION)[number]

export interface Accion {
  id: Id
  orgId: Id
  expedienteId: Id
  fecha: FechaISO
  tipo: TipoAccion
  descripcion: string
  responsable: string
  cargo?: string
  proxima?: string
  proximaFecha?: FechaISO
  proximaCumplida: boolean
  etapaNueva?: string
  notificacionId?: Id
  visitaId?: Id
  mensajeId?: Id
  origen: OrigenAccion
  creadoPor?: Id
  creadoEn: string
}

export type EstadoNotificacion = 'pendiente' | 'atendida'
export type OrigenNotificacion = 'manual' | 'gmail'

export interface Notificacion {
  id: Id
  orgId: Id
  expedienteId?: Id
  numero: string
  asunto: string
  recibido: FechaISO
  casilla: boolean
  actoId?: string
  efecto?: FechaISO
  vencimiento?: FechaISO
  resumen?: string
  texto?: string
  estado: EstadoNotificacion
  atendidaEn?: FechaISO
  origen: OrigenNotificacion
  creadoEn: string
}

export const TIPOS_AUDIENCIA = [
  'Conciliación',
  'Juzgamiento',
  'Única',
  'Pruebas',
  'Preliminar / saneamiento',
  'Vista de la causa',
  'Informe oral',
  'Control de acusación',
  'Prisión preventiva',
  'Juicio oral',
  'Lectura de sentencia',
  'Otra',
] as const
export type TipoAudiencia = (typeof TIPOS_AUDIENCIA)[number]
export type ModalidadAudiencia = 'virtual' | 'presencial' | 'mixta'
export type EstadoAudiencia = 'programada' | 'realizada' | 'reprogramada' | 'frustrada'

export interface Audiencia {
  id: Id
  orgId: Id
  expedienteId: Id
  tipo: TipoAudiencia
  fecha: FechaISO
  hora?: string
  modalidad: ModalidadAudiencia
  estado: EstadoAudiencia
  lugar?: string
  responsable?: string
  resolucion?: string
  notas?: string
  creadoEn: string
}

export interface VisitaItem {
  id: Id
  visitaId: Id
  expedienteId: Id
  motivo: string
  resultado?: string
  hecho: boolean
  accionId?: Id
}

export interface Visita {
  id: Id
  orgId: Id
  fecha: FechaISO
  responsable: string
  juzgadoClave: string
  juzgado: string
  distrito?: string
  sede?: string
  estado: 'programada' | 'realizada'
  items: VisitaItem[]
  creadoEn: string
}

export interface Juzgado {
  clave: string
  orgId: Id
  nombre: string
  sede?: string
}

export interface ConfigOrg {
  orgId: Id
  diasSinMovimiento: number
  diasInhabiles: FechaISO[]
  /** Teléfonos autorizados para WhatsApp: últimos 9 dígitos → nombre */
  equipoWhatsapp: { telefono: string; nombre: string }[]
  /** Dirección del script de Google que lista el Drive del estudio */
  driveUrl?: string
  driveToken?: string
}

export const TIPOS_ESCRITO = [
  'Escrito de impulso (solicita se provea o se dé trámite)',
  'Pedido de sentencia',
  'Solicita se expida auto de saneamiento',
  'Solicita se fijen puntos controvertidos y se admitan medios probatorios',
  'Solicita programación de audiencia',
  'Solicita declaración de rebeldía',
  'Solicita requerimiento de cumplimiento bajo apercibimiento',
  'Solicita elevación de autos al superior',
  'Se tenga presente',
  'Otro',
] as const
