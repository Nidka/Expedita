import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { EllipsisIcon, LogOutIcon, PenLineIcon, SearchIcon } from 'lucide-react'
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
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { modoDemo } from '@/infrastructure/composicion'
import { cn } from '@/lib/utils'
import { useContenedor, useDatos } from '../contexto'
import { BotonEnlace } from '../componentes/base'
import { BuscadorGlobal } from '../componentes/BuscadorGlobal'
import { Logo, Michi } from '../componentes/marca'
import { NAVEGACION, type ItemNavegacion } from './navegacion'

function usePendientes() {
  const { notificaciones } = useDatos()
  return notificaciones.filter((n) => n.estado === 'pendiente').length
}

function useActivo() {
  const { pathname } = useLocation()
  return (a: string) => (a === '/' ? pathname === '/' : pathname.startsWith(a))
}

function useVisibles(): ItemNavegacion[] {
  const { sesion } = useDatos()
  return NAVEGACION.filter((n) => !n.soloAdmin || sesion.miembro.rol === 'admin')
}

function Usuario({ compacto = false }: { compacto?: boolean }) {
  const { sesion } = useDatos()
  const c = useContenedor()
  const iniciales = sesion.miembro.nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div className="flex items-center gap-3 px-2 py-1.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground" aria-hidden>
        {iniciales}
      </span>
      {!compacto && (
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-sm font-medium">{sesion.miembro.nombre}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {sesion.miembro.rol === 'admin' ? 'Administrador' : 'Abogado'} · {sesion.orgNombre}
          </span>
        </span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="group-data-[collapsible=icon]:hidden"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => void c.auth.cerrarSesion().then(() => location.reload())}
      >
        <LogOutIcon />
      </Button>
    </div>
  )
}

/** Barra lateral de escritorio (un solo nivel). */
function BarraLateral() {
  const pendientes = usePendientes()
  const activo = useActivo()
  const items = useVisibles()
  return (
    <Sidebar collapsible="icon" aria-label="Navegación principal" className="border-r-0">
      <SidebarHeader className="px-3 pt-5 pb-3">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map(({ a, texto, icono: Icono, insignia }) => (
                <SidebarMenuItem key={a}>
                  <SidebarMenuButton
                    isActive={activo(a)}
                    tooltip={texto}
                    className="h-9 rounded-lg text-[0.9375rem] data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-accent-foreground"
                    render={<NavLink to={a} end={a === '/'} />}
                  >
                    <Icono aria-hidden className={cn(activo(a) && 'text-sidebar-primary')} />
                    <span>{texto}</span>
                  </SidebarMenuButton>
                  {insignia && pendientes > 0 && (
                    <SidebarMenuBadge className="rounded-full bg-berry px-1.5 text-[0.6875rem] font-semibold text-white" aria-label={`${pendientes} pendientes`}>
                      {pendientes}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <Usuario />
      </SidebarFooter>
    </Sidebar>
  )
}

/** Barra de pestañas del celular: navega, no ejecuta acciones. */
function BarraPestanas({ abrirMas }: { abrirMas: () => void }) {
  const pendientes = usePendientes()
  const activo = useActivo()
  const pestanas = NAVEGACION.filter((n) => n.pestana)
  const enMas = !pestanas.some((p) => activo(p.a))
  const clase = (on: boolean) =>
    cn(
      'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.6875rem] font-medium outline-none focus-visible:bg-muted',
      on ? 'text-primary' : 'text-muted-foreground',
    )
  return (
    <nav aria-label="Navegación principal" className="material safe-bottom fixed inset-x-0 bottom-0 z-40 border-t md:hidden">
      <ul className="mx-auto flex max-w-lg px-2 pt-1">
        {pestanas.map(({ a, texto, corto, icono: Icono, insignia }) => (
          <li key={a} className="flex flex-1">
            <NavLink to={a} end={a === '/'} className={clase(activo(a))} aria-current={activo(a) ? 'page' : undefined}>
              <span className="relative">
                <Icono className="size-6" aria-hidden strokeWidth={activo(a) ? 2.25 : 1.75} />
                {insignia && pendientes > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-4 rounded-full bg-berry px-1 text-center text-[0.625rem] leading-4 font-bold text-white">
                    {pendientes}
                    <span className="sr-only"> pendientes</span>
                  </span>
                )}
              </span>
              {corto ?? texto}
            </NavLink>
          </li>
        ))}
        <li className="flex flex-1">
          <button type="button" onClick={abrirMas} className={clase(enMas)} aria-haspopup="dialog">
            <EllipsisIcon className="size-6" aria-hidden strokeWidth={enMas ? 2.25 : 1.75} />
            Más
          </button>
        </li>
      </ul>
    </nav>
  )
}

function HojaMas({ abierta, cerrar }: { abierta: boolean; cerrar: () => void }) {
  const activo = useActivo()
  const items = useVisibles().filter((n) => !n.pestana)
  return (
    <Sheet open={abierta} onOpenChange={(o) => !o && cerrar()}>
      <SheetContent side="bottom" className="safe-bottom rounded-t-xl px-3 pb-4">
        <SheetHeader className="px-2">
          <SheetTitle>Más</SheetTitle>
        </SheetHeader>
        <ul className="overflow-hidden rounded-xl bg-muted/60">
          {items.map(({ a, texto, icono: Icono }) => (
            <li key={a} className="border-b border-separator last:border-b-0">
              <NavLink
                to={a}
                onClick={cerrar}
                className={cn('flex min-h-12 items-center gap-3 px-4 text-[0.9375rem] outline-none focus-visible:bg-muted', activo(a) && 'font-semibold text-primary')}
              >
                <Icono className="size-5" aria-hidden />
                {texto}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-xl bg-muted/60">
          <Usuario />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function Shell() {
  const [buscar, setBuscar] = useState(false)
  const [mas, setMas] = useState(false)
  const { pathname } = useLocation()
  const enRegistrar = pathname.startsWith('/registrar')

  return (
    <SidebarProvider>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <BarraLateral />
      <SidebarInset className="bg-background">
        <header className="material sticky top-0 z-30 border-b border-separator">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-5 sm:px-8 lg:px-12">
            <span className="flex items-center gap-2 md:hidden">
              <Michi pose="sentado" className="size-8" />
              <span className="text-[1.0625rem] font-semibold">Expedita</span>
            </span>
            <button
              type="button"
              onClick={() => setBuscar(true)}
              className="ml-auto flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/25 md:ml-0 md:h-9 md:w-full md:max-w-sm md:border md:border-input md:bg-card md:px-3"
              aria-label="Buscar expedientes (Ctrl + K)"
            >
              <SearchIcon className="size-5 md:size-4" aria-hidden />
              <span className="hidden md:inline">Buscar expediente o cliente…</span>
              <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-sans text-[0.6875rem] md:inline">Ctrl K</kbd>
            </button>
            {modoDemo && (
              <span className="hidden rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-foreground sm:inline">Modo demo</span>
            )}
            {!enRegistrar && (
              <BotonEnlace a="/registrar" className="md:ml-auto" aria-label="Registrar acción">
                <PenLineIcon aria-hidden />
                <span className="hidden sm:inline">Registrar acción</span>
              </BotonEnlace>
            )}
          </div>
        </header>
        <main id="contenido" tabIndex={-1} className="pb-tabbar mx-auto w-full max-w-6xl px-5 pt-8 outline-none sm:px-8 md:pb-16 lg:px-12 lg:pt-14">
          <Outlet />
        </main>
      </SidebarInset>
      <BarraPestanas abrirMas={() => setMas(true)} />
      <HojaMas abierta={mas} cerrar={() => setMas(false)} />
      <BuscadorGlobal abierto={buscar} setAbierto={setBuscar} />
    </SidebarProvider>
  )
}
