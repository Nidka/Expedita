import { BellIcon, BotIcon, CalendarDaysIcon, FolderIcon, MapIcon, PenLineIcon, SettingsIcon, SunriseIcon, type LucideIcon } from 'lucide-react'

export interface ItemNavegacion {
  a: string
  texto: string
  /** Texto corto para la barra de pestañas */
  corto?: string
  icono: LucideIcon
  /** Aparece en la barra de pestañas del celular */
  pestana?: boolean
  insignia?: 'notificaciones'
  soloAdmin?: boolean
}

export const NAVEGACION: ItemNavegacion[] = [
  { a: '/', texto: 'Hoy', icono: SunriseIcon, pestana: true },
  { a: '/bandeja', texto: 'Notificaciones', corto: 'Avisos', icono: BellIcon, pestana: true, insignia: 'notificaciones' },
  { a: '/expedientes', texto: 'Expedientes', icono: FolderIcon, pestana: true },
  { a: '/agenda', texto: 'Agenda', icono: CalendarDaysIcon, pestana: true },
  { a: '/visitas', texto: 'Visitas', icono: MapIcon },
  { a: '/registrar', texto: 'Registrar acción', icono: PenLineIcon },
  { a: '/asistente', texto: 'Asistente', icono: BotIcon },
  { a: '/ajustes', texto: 'Ajustes', icono: SettingsIcon, soloAdmin: true },
]
