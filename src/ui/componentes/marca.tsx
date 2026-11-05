import { cn } from '@/lib/utils'

/**
 * Michi, el gato procurador de Expedita (sprites en src/assets/michi, generados con
 * scripts/recortar-michi.mjs). Cada pose tiene un uso concreto; no se usa como adorno.
 */
const SPRITES = import.meta.glob<string>('../../assets/michi/*.webp', { eager: true, import: 'default', query: '?url' })

export type Pose =
  | 'sentado' // marca, estado neutro
  | 'caminando'
  | 'corriendo' // cargando
  | 'durmiendo' // todo al día
  | 'asomado'
  | 'saludando' // bienvenida / acceso
  | 'pensando' // búsqueda sin resultados
  | 'leyendo' // asistente: analizar
  | 'martillo' // acción registrada
  | 'balanza'
  | 'documento' // notificaciones
  | 'libros' // expedientes
  | 'alerta' // urgente
  | 'laptop' // asistente trabajando
  | 'feliz' // éxito
  | 'enojado' // vencido / error
  | 'espaldas' // no encontrado

const url = (pose: Pose) => SPRITES[`../../assets/michi/${pose}.webp`]

export function Michi({ pose = 'sentado', className, alt }: { pose?: Pose; className?: string; alt?: string }) {
  return (
    <img
      src={url(pose)}
      alt={alt ?? ''}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      decoding="async"
      className={cn('size-24 object-contain select-none dark:[filter:drop-shadow(0_0_1px_rgb(255_255_255/0.35))]', className)}
    />
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <Michi pose="sentado" className="size-8 shrink-0" />
      <span className="text-[1.0625rem] font-bold tracking-tight group-data-[collapsible=icon]:hidden">Expedita</span>
    </span>
  )
}
