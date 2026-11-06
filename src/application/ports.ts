/**
 * Puertos de la arquitectura hexagonal.
 * La aplicación solo conoce estas interfaces; los adaptadores (Supabase, Claude,
 * memoria para pruebas) viven en `src/infrastructure` y se inyectan en `src/main.tsx`.
 */
import type {
  Accion,
  Audiencia,
  ConfigOrg,
  Expediente,
  Id,
  Juzgado,
  Miembro,
  Notificacion,
  Rol,
  Visita,
  VisitaItem,
} from '@/domain/entidades'
import type { AvanceCliente, EnlaceCliente } from '@/domain/avance/avance'
import type { ModeloEscrito } from '@/domain/escritos/plantilla'
import type { CatalogoDrive } from '@/domain/documentos/drive'
import type { Feriado } from '@/domain/plazos/feriados'
import type { FechaISO } from '@/domain/shared/fecha'

export type Nuevo<T> = Omit<T, 'id' | 'orgId' | 'creadoEn' | 'actualizadoEn'>
export type Cambios<T> = Partial<Nuevo<T>>

/** Repositorio genérico de una colección de la organización actual. */
export interface Repositorio<T extends { id: Id }> {
  listar(): Promise<T[]>
  obtener(id: Id): Promise<T | null>
  crear(datos: Nuevo<T>): Promise<T>
  crearVarios(datos: Nuevo<T>[]): Promise<T[]>
  actualizar(id: Id, cambios: Cambios<T>): Promise<T>
  eliminar(id: Id): Promise<void>
}

export interface ExpedienteRepo extends Repositorio<Expediente> {
  porNumero(numero: string): Promise<Expediente | null>
}

export interface AccionRepo extends Repositorio<Accion> {
  /** Marca como cumplidas las próximas acciones abiertas del expediente, salvo `excepto`. */
  cumplirProximasAbiertas(expedienteId: Id, excepto?: Id): Promise<void>
}

export type NotificacionRepo = Repositorio<Notificacion>
export type AudienciaRepo = Repositorio<Audiencia>

export interface VisitaRepo extends Repositorio<Omit<Visita, 'items'> & { items?: VisitaItem[] }> {
  listarConItems(): Promise<Visita[]>
  crearConItems(visita: Nuevo<Omit<Visita, 'items'>>, items: Omit<VisitaItem, 'id' | 'visitaId'>[]): Promise<Visita>
  actualizarItem(id: Id, cambios: Partial<Omit<VisitaItem, 'id' | 'visitaId'>>): Promise<void>
}

export interface JuzgadoRepo {
  listar(): Promise<Juzgado[]>
  guardarSede(clave: string, nombre: string, sede: string): Promise<void>
}

export interface ConfigRepo {
  obtener(): Promise<ConfigOrg>
  guardar(cambios: Partial<Omit<ConfigOrg, 'orgId'>>): Promise<ConfigOrg>
  feriados(): Promise<Feriado[]>
  /** Datos para conectar scripts externos (recordatorio). Solo administradores. */
  datosIntegracion(): Promise<{ supabaseUrl: string; clavePublica: string; claveEstudio: string }>
}

export interface Invitacion {
  id: Id
  email: string
  nombre: string
  rol: Rol
}

/** Miembros e invitaciones del estudio (solo administradores escriben). */
export interface EquipoRepo {
  miembros(): Promise<Miembro[]>
  invitaciones(): Promise<Invitacion[]>
  invitar(datos: Omit<Invitacion, 'id'>): Promise<void>
  quitarInvitacion(id: Id): Promise<void>
  cambiarRol(miembroId: Id, rol: Rol): Promise<void>
  /** Quita a una persona del estudio (su cuenta sigue existiendo, pero ya no ve nada). */
  quitarMiembro(miembroId: Id): Promise<void>
}

export interface RegistroAuditoria {
  id: number
  tabla: string
  filaId: string
  operacion: 'INSERT' | 'UPDATE' | 'DELETE'
  usuario?: Id
  antes?: Record<string, unknown>
  despues?: Record<string, unknown>
  en: string
}

/** Historial de cambios del estudio (solo administradores). */
export interface AuditoriaRepo {
  recientes(limite: number): Promise<RegistroAuditoria[]>
}

/** Cambios en vivo hechos por otros usuarios (RNF-09). */
export interface CanalCambios {
  suscribir(tablas: string[], alCambiar: (tabla: string) => void): () => void
}

export interface Sesion {
  miembro: Miembro
  orgNombre: string
}

export interface AuthPort {
  sesionActual(): Promise<Sesion | null>
  iniciarSesion(email: string, password: string): Promise<void>
  enviarEnlaceMagico(email: string): Promise<void>
  cerrarSesion(): Promise<void>
  alCambiar(cb: () => void): () => void
  /** Usuario autenticado que todavía no pertenece a ningún estudio (primer ingreso). */
  usuarioSinEstudio(): Promise<{ email: string } | null>
  /**
   * Crea la cuenta con contraseña (sin correo). Devuelve false si Supabase aún exige confirmar el correo.
   */
  registrar(email: string, password: string): Promise<boolean>
  /** Define o cambia la contraseña del usuario actual (para no depender del enlace por correo). */
  cambiarClave(nueva: string): Promise<void>
  /** Envía un correo para crear una contraseña nueva (abre «Mi cuenta» al volver). */
  recuperarClave(email: string): Promise<void>
  /** Crea el estudio y deja al usuario actual como administrador. */
  crearEstudio(nombreEstudio: string, nombreUsuario: string): Promise<void>
}

/** Enlaces de avance para clientes (RF-40). `avance` es público: funciona sin sesión, solo con el token. */
export interface EnlacesClienteRepo {
  delExpediente(expedienteId: Id): Promise<EnlaceCliente[]>
  crear(expedienteId: Id, expira?: FechaISO): Promise<EnlaceCliente>
  revocar(id: Id): Promise<void>
  avance(token: string): Promise<AvanceCliente>
}

/** Membrete del estudio para los escritos en Word (RF-36). */
export interface Membrete {
  titulo?: string
  /** Dirección, teléfono, correo… una línea por renglón */
  detalle?: string
}

export interface GeneradorWord {
  generar(texto: string, membrete: Membrete, titulo?: string): Blob
}

/** Biblioteca de modelos de escritos y jurisprudencia del estudio (RF-37). */
export type ModeloRepo = Repositorio<ModeloEscrito>

// ---------- Asistente de IA ----------

export interface AnalisisNotificacion {
  numero?: string
  asunto?: string
  recibido?: FechaISO
  /** id de acto del catálogo */
  actoId?: string
  /** Fecha fijada por la propia resolución, si la hay */
  plazoFijado?: FechaISO
  resumen?: string
}

export interface ResumenExpedienteIA {
  id: Id
  etiqueta: string
  via: string
  etapa?: string
  diasSinMovimiento?: number
  proximoPlazo?: string
  alertas: string[]
  ultimasAcciones: string[]
}

export interface AccionPropuestaIA {
  mensajeId: string
  telefono: string
  numero?: string
  tipo?: string
  descripcion?: string
  cargo?: string
  fecha?: FechaISO
  proxima?: string
  proximaFecha?: FechaISO
  proximaDiasHabiles?: number
  duda?: string
}

export interface AsistenteIA {
  analizarNotificacion(texto: string, actos: { id: string; nombre: string }[]): Promise<AnalisisNotificacion>
  /** RF-35: lee el PDF de una resolución (base64) y propone acto, plazo y resumen */
  analizarResolucion(pdfBase64: string, actos: { id: string; nombre: string }[]): Promise<AnalisisNotificacion>
  sugerirImpulsos(expedientes: ResumenExpedienteIA[]): Promise<string>
  redactarEscrito(datos: { expediente: Expediente; tipo: string; indicaciones: string }): Promise<string>
  interpretarMensajes(
    mensajes: { id: string; telefono: string; texto: string; fecha: string }[],
    expedientes: { numero: string; codigo?: string; cliente?: string }[],
  ): Promise<AccionPropuestaIA[]>
}

/** Lee una hoja de un archivo de Excel como filas con encabezado. */
export interface LectorExcel {
  leerHoja(archivo: File, hoja: string): Promise<Record<string, unknown>[]>
  /** Nombres de las hojas del libro, sin leer su contenido */
  hojas(archivo: File): Promise<string[]>
}

/** Correo de aviso (SINOE) leído por el script de Gmail del estudio */
export interface MensajeCorreo {
  id: string
  /** Fecha y hora ISO */
  fecha: string
  de: string
  asunto: string
  texto: string
}

export interface GmailPort {
  mensajes(url: string, clave: string): Promise<MensajeCorreo[]>
}

/** Catálogo del Drive del estudio (solo metadatos de carpetas y archivos). */
export interface DrivePort {
  catalogo(url: string, clave: string, fresco?: boolean): Promise<CatalogoDrive>
}

export interface Reloj {
  hoy(): FechaISO
}
