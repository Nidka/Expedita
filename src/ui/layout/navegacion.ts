import {
  BellIcon,
  BotIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FileDocIcon,
  FolderIcon,
  LifebuoyIcon,
  MapIcon,
  PenLineIcon,
  SettingsIcon,
  SquaresFourIcon,
  SunriseIcon,
  type Icono,
} from '@/ui/iconos'

export type GrupoNavegacion = 'Día a día' | 'Casos' | 'Estudio'

export interface ItemNavegacion {
  a: string
  texto: string
  /** Texto corto para la barra de pestañas */
  corto?: string
  icono: Icono
  grupo: GrupoNavegacion
  /** Atajo de teclado: «G» y luego esta tecla */
  tecla?: string
  /** Aparece en la barra de pestañas del celular */
  pestana?: boolean
  insignia?: 'notificaciones'
  soloAdmin?: boolean
}

export const GRUPOS: GrupoNavegacion[] = ['Día a día', 'Casos', 'Estudio']

export const NAVEGACION: ItemNavegacion[] = [
  { a: '/', texto: 'Hoy', icono: SunriseIcon, grupo: 'Día a día', tecla: 'h', pestana: true },
  { a: '/bandeja', texto: 'Notificaciones', corto: 'Avisos', icono: BellIcon, grupo: 'Día a día', tecla: 'n', pestana: true, insignia: 'notificaciones' },
  { a: '/agenda', texto: 'Agenda', icono: CalendarDaysIcon, grupo: 'Día a día', tecla: 'a', pestana: true },
  { a: '/visitas', texto: 'Visitas', icono: MapIcon, grupo: 'Día a día', tecla: 'v' },
  { a: '/expedientes', texto: 'Expedientes', icono: FolderIcon, grupo: 'Casos', tecla: 'e', pestana: true },
  { a: '/registrar', texto: 'Registrar acción', icono: PenLineIcon, grupo: 'Casos' },
  { a: '/escritos', texto: 'Escritos', icono: FileDocIcon, grupo: 'Casos', tecla: 's' },
  { a: '/panel', texto: 'Panel', icono: SquaresFourIcon, grupo: 'Estudio', tecla: 'p' },
  { a: '/reportes', texto: 'Reportes', icono: ChartBarIcon, grupo: 'Estudio', tecla: 'r' },
  { a: '/asistente', texto: 'Asistente', icono: BotIcon, grupo: 'Estudio', tecla: 'i' },
  { a: '/ajustes', texto: 'Ajustes', icono: SettingsIcon, grupo: 'Estudio', tecla: 'c', soloAdmin: true },
]

/** Fuera de los grupos: va al pie de la barra lateral */
export const AYUDA: ItemNavegacion = { a: '/ayuda', texto: 'Ayuda', icono: LifebuoyIcon, grupo: 'Estudio', tecla: 'y' }
