import { CheckIcon } from '@/ui/iconos'
import { VIAS, type ViaId } from '@/domain/plazos/catalogo'
import { cn } from '@/lib/utils'

/**
 * Ruta procesal como línea de progreso: la barra se llena hasta la etapa actual (animada),
 * cada etapa es un punto con su nombre. En celular se desplaza horizontalmente.
 */
export function RutaEtapas({ via, etapa }: { via: ViaId; etapa?: string }) {
  const etapas = VIAS[via]?.etapas ?? []
  const actual = etapa ? etapas.indexOf(etapa) : -1
  const progreso = etapas.length > 1 && actual >= 0 ? actual / (etapas.length - 1) : 0
  return (
    <div className="@container -mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
      <ol style={{ ['--borde' as string]: `calc(100% / ${Math.max(etapas.length, 1)} / 2)` }} aria-label="Ruta de etapas" className="relative flex min-w-max justify-between gap-1 pt-1 @2xl:min-w-0">
        {/* Pista y relleno */}
        <span aria-hidden className="absolute top-[11px] right-[var(--borde)] left-[var(--borde)] h-0.5 rounded-full bg-separator" />
        <span
          aria-hidden
          data-movimiento="espacial" className="absolute top-[11px] left-[var(--borde)] h-0.5 origin-left animate-[llenar_700ms_var(--ease-apple)_both] rounded-full bg-primary"
          style={{ width: `calc((100% - 2 * var(--borde)) * ${progreso})` }}
        />
        {etapas.map((e, i) => {
          const hecho = i < actual
          const esActual = i === actual
          return (
            <li key={e} aria-current={esActual ? 'step' : undefined} className="relative flex w-20 shrink-0 flex-col items-center gap-2 text-center @2xl:w-auto @2xl:min-w-0 @2xl:flex-1">
              <span
                className={cn(
                  'relative z-10 grid size-6 place-items-center rounded-full border-2 bg-card transition-colors duration-300',
                  hecho && 'border-primary bg-primary text-primary-foreground',
                  esActual && 'border-primary',
                  !hecho && !esActual && 'border-input',
                )}
              >
                {hecho && <CheckIcon className="size-3" weight="bold" aria-hidden />}
                {esActual && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span
                className={cn(
                  'text-xs leading-tight',
                  esActual ? 'font-semibold text-foreground' : hecho ? 'text-foreground/80' : 'text-muted-foreground',
                )}
              >
                {e}
                {esActual && <span className="sr-only"> (etapa actual)</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
