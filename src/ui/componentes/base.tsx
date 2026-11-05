import { useId, type ComponentProps, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon, ChevronRightIcon } from '@/ui/iconos'
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
  antetitulo,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  antetitulo?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {antetitulo && <div className="mb-1 text-sm text-muted-foreground">{antetitulo}</div>}
        <h1 className="text-[1.75rem] leading-tight font-bold sm:text-[2rem]">{titulo}</h1>
        {descripcion && <div className="mt-1.5 text-[0.9375rem] text-muted-foreground">{descripcion}</div>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}

/** Sección con título pequeño y contenido agrupado. */
export function Seccion({
  titulo,
  accion,
  children,
  className,
}: {
  titulo: string
  accion?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('grid content-start gap-3', className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id={id} className="text-[0.8125rem] font-semibold tracking-wide text-muted-foreground uppercase">
          {titulo}
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
    <ul aria-label={etiqueta} className={cn('escalonar overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)]', className)}>
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
  className,
}: {
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
  const base = 'flex min-h-12 items-center gap-4 px-5 py-3.5'
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
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
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

/**
 * Elemento distintivo de Expedita: los días hábiles que quedan, grande y legible.
 * Negativo = vencido hace N días.
 */
export function DiasRestantes({ dias, className }: { dias: number | undefined; className?: string }) {
  if (dias === undefined) return null
  const sev: Severidad = dias < 0 ? 'vencido' : dias <= 3 ? 'urgente' : 'proximo'
  const valor = Math.abs(dias)
  const texto = dias < 0 ? `Vencido hace ${valor} ${valor === 1 ? 'día hábil' : 'días hábiles'}` : dias === 0 ? 'Vence hoy' : `Quedan ${valor} ${valor === 1 ? 'día hábil' : 'días hábiles'}`
  return (
    <span
      className={cn('grid size-12 shrink-0 place-items-center rounded-xl text-center leading-none', ESTILO_SEVERIDAD[sev], className)}
      role="img"
      aria-label={texto}
      title={texto}
    >
      <span className="grid gap-0.5">
        <span className="tabular text-lg font-bold">{dias === 0 ? 'Hoy' : dias < 0 ? `−${valor}` : valor}</span>
        {dias !== 0 && (
          <span className="text-[0.625rem] font-semibold tracking-wide uppercase">{dias < 0 ? 'venc.' : valor === 1 ? 'hábil' : 'hábiles'}</span>
        )}
      </span>
    </span>
  )
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
  return <span className={cn('font-mono text-[0.9em] tracking-tight', className)}>{children}</span>
}

/** Código interno del estudio (LA-04) como etiqueta. */
export function Codigo({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground">{children}</span>
}
