import { cn } from '@/lib/utils'

/**
 * Michi: el gato procurador de Expedita. Gato sentado con lentes redondos y corbatín dorado.
 * `decorativo` = oculto para lectores de pantalla.
 */
export function Michi({ className, decorativo = true }: { className?: string; decorativo?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-10', className)}
      role={decorativo ? undefined : 'img'}
      aria-hidden={decorativo || undefined}
      aria-label={decorativo ? undefined : 'Michi, el gato de Expedita'}
    >
      {/* cola */}
      <path d="M46 52c8 0 12-5 10-11-1-3-4-3-4 0 0 4-3 6-7 6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      {/* cuerpo */}
      <path d="M18 56c-2-10 1-19 6-23h16c5 4 8 13 6 23z" fill="currentColor" />
      {/* cabeza con orejas */}
      <path d="M17 30c0-9 6-15 15-15s15 6 15 15c0 7-6 11-15 11s-15-4-15-11z" fill="currentColor" />
      <path d="M18 23l-1-13 10 6zM46 23l1-13-10 6z" fill="currentColor" />
      {/* lentes */}
      <circle cx="26" cy="28" r="4.6" fill="var(--background, #fff)" stroke="var(--brand-gold, #c9a34a)" strokeWidth="1.8" />
      <circle cx="38" cy="28" r="4.6" fill="var(--background, #fff)" stroke="var(--brand-gold, #c9a34a)" strokeWidth="1.8" />
      <path d="M30.6 28h2.8" stroke="var(--brand-gold, #c9a34a)" strokeWidth="1.8" />
      <circle cx="26.5" cy="28.5" r="1.7" fill="currentColor" />
      <circle cx="38.5" cy="28.5" r="1.7" fill="currentColor" />
      {/* nariz */}
      <path d="M30.5 34h3l-1.5 1.6z" fill="var(--brand-gold, #c9a34a)" />
      {/* corbatín */}
      <path d="M32 43l-6-3v6zM32 43l6-3v6z" fill="var(--brand-gold, #c9a34a)" />
      <circle cx="32" cy="43" r="1.6" fill="var(--brand-gold, #c9a34a)" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Michi className="size-8 text-sidebar-primary" />
      <span className="font-heading text-xl font-semibold tracking-tight">Expedita</span>
    </span>
  )
}
