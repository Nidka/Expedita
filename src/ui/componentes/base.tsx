import { useId, type ComponentProps, type ReactNode, type SelectHTMLAttributes } from 'react'
import { BotonAyuda } from './Ayuda'
import type { TemaId } from '../ayuda/temas'
import { Link } from 'react-router-dom'
import { ChevronDownIcon, ChevronRightIcon, EllipsisIcon } from '@/ui/iconos'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Severidad } from '@/domain/agenda/que-toca-hoy'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Michi, type Pose } from './marca'

/** Campo de formulario accesible: etiqueta, ayuda y error asociados al control. */
export function Campo({
  etiqueta,
  ayuda,
  error,
  requerido,
  opcional,
  className,
  children,
}: {
  etiqueta: string
  ayuda?: ReactNode
  error?: string
  requerido?: boolean
  /** Muestra «Opcional»: se marcan los opcionales, no los obligatorios. */
  opcional?: boolean
  className?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }) => ReactNode
}) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const describedby = [ayuda ? idAyuda : '', error ? idError : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('grid content-start gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-[0.8125rem] font-medium">
          {etiqueta}
        </Label>
        {opcional && <span className="text-xs text-muted-foreground">Opcional</span>}
      </div>
      {children({ id, 'aria-describedby': describedby, 'aria-invalid': error ? true : undefined, required: requerido })}
      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** `<select>` nativo con estilo: el más accesible y el selector del sistema en celular. */
export function SelectNativo({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select
        {...props}
        className="h-10 w-full appearance-none rounded-lg border border-input bg-card py-2 pr-9 pl-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50 aria-invalid:border-destructive sm:h-9"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
}

/** Título grande de página (estilo «large title») con acciones a la derecha. */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  ayuda,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  /** Tema de ayuda: muestra el botón «?» junto al título */
  ayuda?: TemaId
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-[1.75rem] leading-tight font-bold sm:text-[2rem]">{titulo}</h1>
          {ayuda && <BotonAyuda tema={ayuda} className="mt-1" />}
        </div>
        {descripcion && <div className="mt-1.5 text-[0.9375rem] text-muted-foreground">{descripcion}</div>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">{acciones}</div>}
    </header>
  )
}

export interface OpcionMenu {
  texto: string
  icono?: ReactNode
  alElegir: () => void
  peligro?: boolean
  oculta?: boolean
}

/** Acciones secundarias de una página agrupadas tras «Más», para que el encabezado tenga una sola acción principal. */
export function MenuMas({ opciones, etiqueta = 'Más acciones' }: { opciones: OpcionMenu[]; etiqueta?: string }) {
  const visibles = opciones.filter((o) => !o.oculta)
  if (!visibles.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label={etiqueta} title={etiqueta}>
            <EllipsisIcon aria-hidden weight="bold" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-56">
        {visibles.map((o) => (
          <DropdownMenuItem key={o.texto} onClick={o.alElegir} variant={o.peligro ? 'destructive' : 'default'} className="gap-2.5 py-2 [&_svg]:text-muted-foreground">
            {o.icono}
            {o.texto}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Sección con título pequeño y contenido agrupado. */
export function Seccion({
  titulo,
  cantidad,
  accion,
  children,
  className,
}: {
  titulo: string
  cantidad?: number
  accion?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('grid content-start gap-3', className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id={id} className="text-[1.0625rem] font-semibold">
          {titulo}
          {cantidad !== undefined && <span className="ml-2 font-normal text-muted-foreground tabular">{cantidad}</span>}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  )
}

/** Lista agrupada con separadores (inset grouped). */
export function Lista({ children, className, etiqueta }: { children: ReactNode; className?: string; etiqueta?: string }) {
  return (
    <ul aria-label={etiqueta} className={cn('overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)]', className)}>
      {children}
    </ul>
  )
}

/** Fila de lista: navegable si tiene `a`. Altura mínima táctil de 44 px. */
export function Fila({
  a,
  inicio,
  titulo,
  subtitulo,
  detalle,
  fin,
  estado,
  className,
}: {
  /** Franja de estado a la izquierda (vencido, urgente…) */
  estado?: Severidad
  a?: string
  inicio?: ReactNode
  titulo: ReactNode
  subtitulo?: ReactNode
  detalle?: ReactNode
  fin?: ReactNode
  className?: string
}) {
  const contenido = (
    <>
      {estado && <span className={cn('size-2 shrink-0 rounded-full', FRANJA_SEVERIDAD[estado])} aria-hidden />}
      {inicio && <span className="shrink-0">{inicio}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{titulo}</span>
        {subtitulo && <span className="truncate text-sm text-muted-foreground">{subtitulo}</span>}
        {detalle && <span className="text-sm text-foreground/80">{detalle}</span>}
      </span>
      {fin && <span className="flex shrink-0 items-center gap-2">{fin}</span>}
      {a && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 ease-(--ease-apple) group-hover:translate-x-0.5 group-hover:text-muted-foreground" aria-hidden />}
    </>
  )
  const base = 'flex min-h-14 items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5'
  return (
    <li className={cn('border-b border-separator last:border-b-0', className)}>
      {a ? (
        <Link
          to={a}
          className={cn(base, 'group outline-none transition-colors duration-150 hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none active:bg-muted')}
        >
          {contenido}
        </Link>
      ) : (
        <div className={base}>{contenido}</div>
      )}
    </li>
  )
}

export function EstadoVacio({ titulo, children, accion, pose = 'durmiendo' }: { titulo: string; children?: ReactNode; accion?: ReactNode; pose?: Pose }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-card px-8 py-16 text-center shadow-[0_0_0_1px_var(--border)]">
      <Michi pose={pose} className="size-28" />
      <div className="grid gap-1">
        <p className="font-semibold">{titulo}</p>
        {children && <div className="mx-auto max-w-sm text-sm text-muted-foreground">{children}</div>}
      </div>
      {accion}
    </div>
  )
}

const ESTILO_SEVERIDAD: Record<Severidad, string> = {
  vencido: 'bg-destructive-soft text-destructive',
  urgente: 'bg-warning-soft text-warning-foreground',
  proximo: 'bg-secondary text-secondary-foreground',
  info: 'bg-muted text-muted-foreground',
}
const TEXTO_SEVERIDAD: Record<Severidad, string> = {
  vencido: 'Vencido',
  urgente: 'Urgente',
  proximo: 'Próximo',
  info: 'Info',
}

/** Insignia de estado: siempre con texto, nunca solo color. */
export function Severo({ severidad, children, className }: { severidad: Severidad; children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-self-start rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        ESTILO_SEVERIDAD[severidad],
        className,
      )}
    >
      {children ?? TEXTO_SEVERIDAD[severidad]}
    </span>
  )
}

export const FRANJA_SEVERIDAD: Record<Severidad, string> = {
  vencido: 'bg-destructive',
  urgente: 'bg-warning',
  proximo: 'bg-primary',
  info: 'bg-muted-foreground/40',
}

/** Enlace interno con apariencia de botón (semántica correcta: es un enlace). */
export function BotonEnlace({
  a,
  children,
  ...props
}: { a: string; children: ReactNode } & Omit<ComponentProps<typeof Button>, 'render' | 'nativeButton'>) {
  return (
    <Button nativeButton={false} render={<Link to={a} />} {...props}>
      {children}
    </Button>
  )
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('tabular text-[0.95em] font-medium tracking-[-0.005em]', className)}>{children}</span>
}

/** Código interno del estudio (LA-04) como etiqueta. */
export function Codigo({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground">{children}</span>
}

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

/** «lun 8 nov» */
export function fechaCorta(f: string): string {
  const [a, m, d] = f.split('-').map(Number)
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay()
  return `${DIAS_CORTOS[dia]} ${d} ${MESES_CORTOS[m - 1]}`
}

/**
 * Vencimiento en lenguaje natural, alineado a la derecha de la fila:
 * «Vence hoy», «Vence mañana», «En 4 días hábiles», «Venció hace 2 días hábiles», con la fecha debajo.
 */
export function Vence({ fecha, hoy, habiles, className }: { fecha: string; hoy: string; habiles: number; className?: string }) {
  const naturales = Math.round((Date.parse(fecha) - Date.parse(hoy)) / 86_400_000)
  const sev: Severidad = naturales < 0 ? 'vencido' : habiles <= 3 ? 'urgente' : 'proximo'
  const n = Math.abs(habiles)
  const texto =
    naturales < 0
      ? `Venció hace ${n || 1} ${n === 1 ? 'día hábil' : 'días hábiles'}`
      : naturales === 0
        ? 'Vence hoy'
        : naturales === 1
          ? 'Vence mañana'
          : `En ${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`
  return (
    <span className={cn('flex shrink-0 flex-col items-end text-right leading-tight', className)}>
      <span
        className={cn(
          'text-sm font-semibold tabular',
          sev === 'vencido' && 'text-destructive',
          sev === 'urgente' && 'text-warning-foreground',
          sev === 'proximo' && 'text-foreground',
        )}
      >
        {texto}
      </span>
      <span className="mt-0.5 text-xs text-muted-foreground">{fechaCorta(fecha)}</span>
    </span>
  )
}
