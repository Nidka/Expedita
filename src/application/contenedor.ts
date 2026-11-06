import type {
  AccionRepo,
  AuditoriaRepo,
  AsistenteIA,
  AudienciaRepo,
  AuthPort,
  CanalCambios,
  ConfigRepo,
  DrivePort,
  EnlacesClienteRepo,
  GmailPort,
  GeneradorWord,
  ModeloRepo,
  EquipoRepo,
  ExpedienteRepo,
  JuzgadoRepo,
  LectorExcel,
  NotificacionRepo,
  Reloj,
  VisitaRepo,
} from './ports'

/** Todos los adaptadores que necesita la aplicación. Se arma una sola vez en `main.tsx`. */
export interface Contenedor {
  auth: AuthPort
  expedientes: ExpedienteRepo
  acciones: AccionRepo
  notificaciones: NotificacionRepo
  audiencias: AudienciaRepo
  visitas: VisitaRepo
  juzgados: JuzgadoRepo
  config: ConfigRepo
  equipo: EquipoRepo
  enlaces: EnlacesClienteRepo
  modelos: ModeloRepo
  word: GeneradorWord
  auditoria: AuditoriaRepo
  cambios: CanalCambios
  ia: AsistenteIA
  excel: LectorExcel
  drive: DrivePort
  gmail: GmailPort
  reloj: Reloj
}
