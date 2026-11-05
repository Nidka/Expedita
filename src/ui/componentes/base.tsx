import { useId, type ComponentProps, type ReactNode, type SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Severidad } from '@/domain/agenda/que-toca-hoy'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Michi } from './marca'

/** Campo de formulario accesible: etiqueta, ayuda y error asociados al control. */
export function Campo({
  etiqueta,
  ayuda,
  error,
  requerido,
  className,
  children,
}: {
  etiqueta: string
  ayuda?: ReactNode
  error?: string
  requerido?: boolean
  className?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }) => ReactNode
}) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const describedby = [ayuda ? idAyuda : '', error ? idError : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id}>
        {etiqueta}
        {requerido && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children({ id, 'aria-describedby': describedby, 'aria-invalid': error ? true : undefined, required: requerido })}
      {ayuda && (
        <p id={idAyuda} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** `<select>` nativo con el estilo del sistema: el más accesible y el mejor en celular. */
export function SelectNativo({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select
        {...props}
        className="h-9 w-full appearance-none rounded-lg border border-input bg-background py-1.5 pr-8 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  )
}

export function EncabezadoPagina({ titulo, descripcion, acciones }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}

export function EstadoVacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      <Michi className="size-14 text-muted-foreground/60" />
      <p className="font-medium">{titulo}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  )
}

const ESTILO_SEVERIDAD: Record<Severidad, string> = {
  vencido: 'bg-destructive/12 text-destructive ring-destructive/25',
  urgente: 'bg-warning/25 text-warning-foreground ring-warning/50 dark:text-warning',
  proximo: 'bg-secondary text-secondary-foreground ring-border',
  info: 'bg-muted text-muted-foreground ring-border',
}
const TEXTO_SEVERIDAD: Record<Severidad, string> = {
  vencido: 'Vencido',
  urgente: 'Urgente',
  proximo: 'Próximo',
  info: 'Info',
}

/** Insignia de estado: siempre con texto, nunca solo color (accesibilidad). */
export function Severo({ severidad, children }: { severidad: Severidad; children?: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        ESTILO_SEVERIDAD[severidad],
      )}
    >
      {children ?? TEXTO_SEVERIDAD[severidad]}
    </span>
  )
}

export const FRANJA_SEVERIDAD: Record<Severidad, string> = {
  vencido: 'bg-destructive',
  urgente: 'bg-warning',
  proximo: 'bg-primary/60',
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
  return <span className={cn('font-mono text-[0.85em] tracking-tight', className)}>{children}</span>
}
