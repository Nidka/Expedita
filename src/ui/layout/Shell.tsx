import { useCallback, useLayoutEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  BellPlusIcon,
  CalendarPlusIcon,
  ChevronDownIcon,
  EllipsisIcon,
  FolderPlusIcon,
  KeyboardIcon,
  LogOutIcon,
  MoonIcon,
  PenLineIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
} from '@/ui/iconos'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { modoDemo } from '@/infrastructure/composicion'
import { cn } from '@/lib/utils'
import { useContenedor, useDatos } from '../contexto'
import { BuscadorGlobal } from '../componentes/BuscadorGlobal'
import { Bienvenida } from '../componentes/Bienvenida'
import { Michi } from '../componentes/marca'
import { ATAJOS_CREAR, Combinacion, DialogoAtajos, MOD, Tecla, useAtajosGlobales } from '../atajos'
import { AYUDA, GRUPOS, NAVEGACION, type ItemNavegacion } from './navegacion'
import { ProveedorSinoe } from '../sinoe'

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

const ICONOS_CREAR = { r: PenLineIcon, n: BellPlusIcon, e: FolderPlusIcon, a: CalendarPlusIcon } as const

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function Usuario() {
  const { sesion } = useDatos()
  const c = useContenedor()
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden>
        {iniciales(sesion.miembro.nombre)}
      </span>
      <NavLink to="/cuenta" className="min-w-0 flex-1 rounded-md outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/25 group-data-[collapsible=icon]:hidden" title="Mi cuenta">
        <span className="block truncate text-sm font-medium">{sesion.miembro.nombre}</span>
        <span className="block truncate text-xs text-muted-foreground">{sesion.miembro.rol === 'admin' ? 'Administrador' : 'Abogado'}</span>
      </NavLink>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground group-data-[collapsible=icon]:hidden"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => void c.auth.cerrarSesion().then(() => location.reload())}
      >
        <LogOutIcon />
      </Button>
    </div>
  )
}

/** Insignia con un pequeño «salto» cada vez que cambia el número. */
function Insignia({ n }: { n: number }) {
  return (
    <span key={n} className="inline-block animate-[saltar_360ms_var(--ease-apple)]">
      {n}
    </span>
  )
}

function ItemMenu({ item, activo, pendientes }: { item: ItemNavegacion; activo: boolean; pendientes: number }) {
  const { a, texto, icono: Icono, insignia, tecla } = item
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={activo}
        tooltip={tecla ? `${texto} · G ${tecla.toUpperCase()}` : texto}
        className={cn(
          'group/item relative h-9 rounded-lg pl-3 text-[0.9375rem] text-sidebar-foreground/85 transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
          'data-active:bg-card data-active:font-semibold data-active:text-sidebar-foreground data-active:shadow-[0_0_0_1px_var(--sidebar-border)] data-active:hover:bg-card',
        )}
        render={<NavLink to={a} end={a === '/'} />}
      >
        <Icono aria-hidden weight={activo ? 'fill' : 'regular'} className={cn('size-[1.125rem] shrink-0 transition-colors', activo ? 'text-primary' : 'text-muted-foreground')} />
        <span className="truncate">{texto}</span>
        {tecla && !(insignia && pendientes > 0) && (
          <span className="ml-auto hidden gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 lg:flex group-data-[collapsible=icon]:hidden" aria-hidden>
            <Tecla className="h-4 min-w-4 text-[0.625rem]">G</Tecla>
            <Tecla className="h-4 min-w-4 text-[0.625rem]">{tecla}</Tecla>
          </span>
        )}
      </SidebarMenuButton>
      {insignia && pendientes > 0 && (
        <SidebarMenuBadge className="top-2 rounded-full bg-berry px-1.5 text-[0.6875rem] font-semibold text-white" aria-label={`${pendientes} pendientes`}>
          <Insignia n={pendientes} />
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}

/** Barra lateral de escritorio: secciones agrupadas por uso, ayuda y cuenta al pie. */
function BarraLateral({ verAtajos }: { verAtajos: () => void }) {
  const pendientes = usePendientes()
  const activo = useActivo()
  const items = useVisibles()
  const { sesion } = useDatos()
  return (
    <Sidebar collapsible="icon" aria-label="Navegación principal" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg px-1 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/25">
          <Michi pose="sentado" className="size-9 shrink-0" />
          <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-[1.0625rem] font-bold tracking-tight">Expedita</span>
            <span className="truncate text-xs text-muted-foreground">{sesion.orgNombre}</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-0 pt-1">
        {GRUPOS.map((g) => {
          const delGrupo = items.filter((n) => n.grupo === g)
          if (!delGrupo.length) return null
          return (
            <SidebarGroup key={g} className="py-1.5">
              <SidebarGroupLabel className="h-7 px-3 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">{g}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {delGrupo.map((n) => (
                    <ItemMenu key={n.a} item={n} activo={activo(n.a)} pendientes={pendientes} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-sidebar-border px-2 py-2">
        <SidebarMenu className="gap-0.5">
          <ItemMenu item={AYUDA} activo={activo(AYUDA.a)} pendientes={0} />
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={verAtajos}
              tooltip="Atajos de teclado · ?"
              className="h-9 rounded-lg pl-3 text-[0.9375rem] text-sidebar-foreground/85 hover:bg-sidebar-accent/60"
            >
              <KeyboardIcon aria-hidden className="size-[1.125rem] text-muted-foreground" />
              <span>Atajos</span>
              <Tecla className="ml-auto group-data-[collapsible=icon]:hidden">?</Tecla>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                <Icono className="size-6" aria-hidden weight={activo(a) ? 'fill' : 'regular'} />
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
            <EllipsisIcon className="size-6" aria-hidden weight={enMas ? 'fill' : 'regular'} />
            Más
          </button>
        </li>
      </ul>
    </nav>
  )
}

function HojaMas({ abierta, cerrar }: { abierta: boolean; cerrar: () => void }) {
  const activo = useActivo()
  const items = [...useVisibles().filter((n) => !n.pestana), AYUDA]
  return (
    <Sheet open={abierta} onOpenChange={(o) => !o && cerrar()}>
      <SheetContent side="bottom" className="safe-bottom max-h-[85dvh] overflow-y-auto rounded-t-xl px-3 pb-4">
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
        <div className="mt-3 rounded-xl bg-muted/60 px-2">
          <Usuario />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Menú «Nuevo»: todo lo que se puede crear, con su atajo. */
function MenuNuevo({ compacto }: { compacto?: boolean }) {
  const navegar = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size={compacto ? 'icon' : 'default'} aria-label="Crear nuevo">
            <PlusIcon aria-hidden weight="bold" />
            {!compacto && (
              <>
                Nuevo <ChevronDownIcon className="-mr-1 size-3.5 opacity-80" aria-hidden />
              </>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        {ATAJOS_CREAR.map((c) => {
          const Icono = ICONOS_CREAR[c.tecla]
          return (
            <DropdownMenuItem key={c.tecla} onClick={() => navegar(c.a)} className="gap-2.5 py-2">
              <Icono aria-hidden className="size-4 text-muted-foreground" />
              {c.texto}
              <DropdownMenuShortcut>
                <Tecla>{c.tecla}</Tecla>
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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
      aria-label={oscuro ? 'Usar tema claro' : 'Usar tema oscuro'}
      title={`${oscuro ? 'Tema claro' : 'Tema oscuro'} · T`}
      className="text-muted-foreground"
    >
      {oscuro ? <SunIcon className="size-[1.125rem]" /> : <MoonIcon className="size-[1.125rem]" />}
    </Button>
  )
}

/** Sección actual para la barra superior */
function useSeccionActual() {
  const activo = useActivo()
  return [...NAVEGACION, AYUDA].find((n) => activo(n.a))
}

/** true cuando la página se ha desplazado: el encabezado muestra su borde y fondo solo entonces (como en macOS). */
function useDesplazado() {
  const [d, setD] = useState(false)
  useLayoutEffect(() => {
    const f = () => setD(window.scrollY > 8)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return d
}

export function Shell() {
  const [buscar, setBuscar] = useState(false)
  const [mas, setMas] = useState(false)
  const [atajos, setAtajos] = useState(false)
  const { pathname } = useLocation()
  const { sesion } = useDatos()
  const desplazado = useDesplazado()
  const seccion = useSeccionActual()

  const abrirBuscador = useCallback(() => setBuscar(true), [])
  const verAtajos = useCallback(() => setAtajos(true), [])
  useAtajosGlobales({ buscar: abrirBuscador, verAtajos, esAdmin: sesion.miembro.rol === 'admin' })

  return (
    <ProveedorSinoe>
      <SidebarProvider>
        <a
          href="#contenido"
          className="sr-only z-50 rounded-lg bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Saltar al contenido
        </a>
        <BarraLateral verAtajos={verAtajos} />
        <SidebarInset className="bg-background">
          <header
            className={cn(
              'material sticky top-0 z-30 border-b transition-[border-color,background-color] duration-200',
              desplazado ? 'border-separator' : 'border-transparent bg-transparent backdrop-blur-none',
            )}
          >
            <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-5 sm:px-8 lg:px-12">
              <Link to="/" className="flex items-center gap-2 md:hidden" aria-label="Expedita, ir a Hoy">
                <Michi pose="sentado" className="size-8" />
                <span className="text-[1.0625rem] font-semibold">Expedita</span>
              </Link>
              {seccion && (
                <p className="hidden min-w-0 items-center gap-1.5 text-sm md:flex" aria-hidden>
                  <span className="text-muted-foreground">{seccion.a === AYUDA.a ? 'Ayuda' : seccion.grupo}</span>
                  {seccion.a !== AYUDA.a && (
                    <>
                      <span className="text-muted-foreground/60">/</span>
                      <span className="truncate font-medium">{seccion.texto}</span>
                    </>
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={abrirBuscador}
                className="ml-auto flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/25 md:h-9 md:w-64 md:border md:border-input md:bg-card md:px-3 md:hover:bg-card lg:w-80"
                aria-label={`Buscar (${MOD} + K)`}
              >
                <SearchIcon className="size-5 md:size-4" aria-hidden />
                <span className="hidden md:inline">Buscar…</span>
                <span className="ml-auto hidden md:inline-flex">
                  <Combinacion teclas={[MOD, 'K']} separador="" />
                </span>
              </button>
              {modoDemo && <span className="hidden rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-foreground xl:inline">Modo demo</span>}
              <span className="hidden md:inline-flex">
                <BotonTema />
              </span>
              <span className="md:hidden">
                <MenuNuevo compacto />
              </span>
              <span className="hidden md:inline-flex">
                <MenuNuevo />
              </span>
            </div>
          </header>
          <main id="contenido" tabIndex={-1} className="pb-tabbar mx-auto w-full max-w-6xl px-5 pt-6 outline-none sm:px-8 md:pb-16 lg:px-12 lg:pt-10">
            <div key={pathname} className="animate-entrar">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <BarraPestanas abrirMas={() => setMas(true)} />
        <HojaMas abierta={mas} cerrar={() => setMas(false)} />
        <BuscadorGlobal abierto={buscar} setAbierto={setBuscar} />
        <DialogoAtajos abierto={atajos} cerrar={() => setAtajos(false)} esAdmin={sesion.miembro.rol === 'admin'} />
        <Bienvenida />
      </SidebarProvider>
    </ProveedorSinoe>
  )
}
