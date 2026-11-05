import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  BellRingIcon,
  BotIcon,
  CalendarDaysIcon,
  FolderOpenIcon,
  HomeIcon,
  LogOutIcon,
  MapPinnedIcon,
  MoonIcon,
  PenLineIcon,
  SettingsIcon,
  SunIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { modoDemo } from '@/infrastructure/composicion'
import { useContenedor, useDatos } from '../contexto'
import { Logo } from '../componentes/marca'

const NAV = [
  { a: '/', texto: 'Qué toca hoy', icono: HomeIcon },
  { a: '/bandeja', texto: 'Notificaciones', icono: BellRingIcon, badge: 'notificaciones' as const },
  { a: '/registrar', texto: 'Registrar acción', icono: PenLineIcon },
  { a: '/expedientes', texto: 'Expedientes', icono: FolderOpenIcon },
  { a: '/agenda', texto: 'Agenda', icono: CalendarDaysIcon },
  { a: '/visitas', texto: 'Visitas', icono: MapPinnedIcon },
  { a: '/asistente', texto: 'Asistente', icono: BotIcon },
]

function Navegacion() {
  const { notificaciones } = useDatos()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const pendientes = notificaciones.filter((n) => n.estado === 'pendiente').length
  const activo = (a: string) => (a === '/' ? pathname === '/' : pathname.startsWith(a))
  return (
    <SidebarMenu>
      {NAV.map(({ a, texto, icono: Icono, badge }) => (
        <SidebarMenuItem key={a}>
          <SidebarMenuButton
            isActive={activo(a)}
            tooltip={texto}
            render={<NavLink to={a} end={a === '/'} onClick={() => setOpenMobile(false)} />}
          >
            <Icono aria-hidden />
            <span>{texto}</span>
          </SidebarMenuButton>
          {badge && pendientes > 0 && (
            <SidebarMenuBadge aria-label={`${pendientes} pendientes`}>{pendientes}</SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

function BotonTema() {
  const { resolvedTheme, setTheme } = useTheme()
  const oscuro = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(oscuro ? 'light' : 'dark')}
      aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      {oscuro ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

export function Shell() {
  const { sesion } = useDatos()
  const c = useContenedor()
  return (
    <SidebarProvider>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <Sidebar collapsible="icon" aria-label="Navegación principal">
        <SidebarHeader className="px-3 py-4">
          <Logo className="text-sidebar-foreground group-data-[collapsible=icon]:[&>span:last-child]:hidden" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <Navegacion />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {sesion.miembro.rol === 'admin' && (
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Ajustes" render={<NavLink to="/ajustes" />}>
                  <SettingsIcon aria-hidden />
                  <span>Ajustes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Cerrar sesión" onClick={() => void c.auth.cerrarSesion().then(() => location.reload())}>
                <LogOutIcon aria-hidden />
                <span className="truncate">
                  {sesion.miembro.nombre} · Salir
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-6">
          <SidebarTrigger aria-label="Abrir o cerrar menú" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{sesion.orgNombre}</p>
          {modoDemo && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">Modo demo</span>
          )}
          <BotonTema />
        </header>
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6 outline-none sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
