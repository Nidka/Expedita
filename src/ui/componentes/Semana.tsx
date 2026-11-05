import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { diaSemana, sumarDias } from '@/domain/shared/fecha'
import { cn } from '@/lib/utils'
import { useDatos } from '../contexto'

const NOMBRES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

interface Dia {
  fecha: string
  plazos: number
  vencidos: number
  audiencias: number
  visitas: number
}

/** Próximos 7 días desde hoy con lo que vence o se programa cada día. */
export function Semana() {
  const d = useDatos()
  const dias = useMemo<Dia[]>(() => {
    const base = Array.from({ length: 7 }, (_, i) => ({ fecha: sumarDias(d.hoy, i), plazos: 0, vencidos: 0, audiencias: 0, visitas: 0 }))
    const porFecha = new Map(base.map((x) => [x.fecha, x]))
    for (const n of d.notificaciones) {
      const x = n.estado === 'pendiente' && n.vencimiento ? porFecha.get(n.vencimiento) : undefined
      if (x) n.vencimiento! < d.hoy ? x.vencidos++ : x.plazos++
    }
    for (const a of d.acciones) {
      const x = a.proximaFecha && !a.proximaCumplida ? porFecha.get(a.proximaFecha) : undefined
      if (x) a.proximaFecha! < d.hoy ? x.vencidos++ : x.plazos++
    }
    for (const a of d.audiencias) {
      const x = a.estado === 'programada' ? porFecha.get(a.fecha) : undefined
      if (x) x.audiencias++
    }
    for (const v of d.visitas) {
      const x = v.estado === 'programada' ? porFecha.get(v.fecha) : undefined
      if (x) x.visitas++
    }
    return base
  }, [d.hoy, d.notificaciones, d.acciones, d.audiencias, d.visitas])

  return (
    <nav aria-label="Próximos 7 días" className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {dias.map((x, i) => {
        const hoy = x.fecha === d.hoy
        const inhabil = !d.calendario.esHabil(x.fecha)
        const motivo = d.calendario.motivoInhabil(x.fecha)
        const total = x.plazos + x.vencidos + x.audiencias + x.visitas
        const descripcion = [
          x.vencidos && `${x.vencidos} vencido${x.vencidos > 1 ? 's' : ''}`,
          x.plazos && `${x.plazos} plazo${x.plazos > 1 ? 's' : ''}`,
          x.audiencias && `${x.audiencias} audiencia${x.audiencias > 1 ? 's' : ''}`,
          x.visitas && `${x.visitas} visita${x.visitas > 1 ? 's' : ''}`,
        ]
          .filter(Boolean)
          .join(', ')
        return (
          <Link
            key={x.fecha}
            to="/agenda"
            title={motivo}
            aria-label={`${NOMBRES[diaSemana(x.fecha)]} ${Number(x.fecha.slice(8))}${hoy ? ', hoy' : ''}${motivo ? `, ${motivo}` : ''}: ${descripcion || 'sin eventos'}`}
            aria-current={hoy ? 'date' : undefined}
            style={{ animationDelay: `${i * 30}ms` }}
            className={cn(
              'group flex animate-entrar flex-col items-center gap-1.5 rounded-xl py-3 outline-none transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/25',
              hoy ? 'bg-card shadow-[0_0_0_1px_var(--border)]' : 'hover:bg-card/70',
            )}
          >
            <span className={cn('text-xs font-medium', inhabil ? 'text-muted-foreground/60' : 'text-muted-foreground')}>{hoy ? 'Hoy' : NOMBRES[diaSemana(x.fecha)]}</span>
            <span
              className={cn(
                'grid size-9 place-items-center rounded-full text-[0.9375rem] font-semibold tabular transition-transform duration-200 group-hover:scale-105',
                hoy && 'bg-primary text-primary-foreground',
                !hoy && inhabil && 'text-muted-foreground/60',
              )}
            >
              {Number(x.fecha.slice(8))}
            </span>
            <span className="flex h-1.5 items-center gap-1" aria-hidden>
              {x.vencidos > 0 && <span className="size-1.5 rounded-full bg-destructive" />}
              {x.plazos > 0 && <span className="size-1.5 rounded-full bg-ocre" />}
              {x.audiencias > 0 && <span className="size-1.5 rounded-full bg-azul-pj" />}
              {x.visitas > 0 && <span className="size-1.5 rounded-full bg-success" />}
              {total === 0 && <span className="size-1.5" />}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
