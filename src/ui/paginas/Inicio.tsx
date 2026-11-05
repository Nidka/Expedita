import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlarmClockIcon, BellRingIcon, CalendarClockIcon, HourglassIcon, PenLineIcon } from 'lucide-react'
import { calcularPendientes, type TipoPendiente } from '@/domain/agenda/que-toca-hoy'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useDatos } from '../contexto'
import { BotonEnlace, EncabezadoPagina, EstadoVacio, FRANJA_SEVERIDAD, Severo } from '../componentes/base'
import { etiquetaExp, fecha, fechaLarga } from '../formato'

const TIPO_TEXTO: Record<TipoPendiente, string> = {
  notificacion: 'Notificación',
  proxima: 'Próxima acción',
  audiencia: 'Audiencia',
  visita: 'Visita',
  abandono: 'Abandono',
  'sin-movimiento': 'Sin movimiento',
}

const MAX_VISIBLES = 10

function Indicador({ titulo, valor, icono: Icono, tono, a }: { titulo: string; valor: number; icono: typeof BellRingIcon; tono?: 'alerta' | 'aviso'; a: string }) {
  return (
    <Link
      to={a}
      className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`${titulo}: ${valor}`}
    >
      <Card className="h-full transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground',
              tono === 'alerta' && valor > 0 && 'bg-destructive/12 text-destructive',
              tono === 'aviso' && valor > 0 && 'bg-warning/25 text-warning-foreground dark:text-warning',
            )}
          >
            <Icono className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-2xl leading-none font-semibold tabular-nums">{valor}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{titulo}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function Inicio() {
  const d = useDatos()
  const { pendientes, indicadores } = useMemo(
    () => calcularPendientes(d, { hoy: d.hoy, calendario: d.calendario, diasSinMovimiento: d.config.diasSinMovimiento }),
    [d],
  )
  const visibles = pendientes.slice(0, MAX_VISIBLES)
  const ultimas = useMemo(
    () => [...d.acciones].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn)).slice(0, 6),
    [d.acciones],
  )

  return (
    <>
      <EncabezadoPagina
        titulo="Qué toca hoy"
        descripcion={<span className="capitalize">{fechaLarga(d.hoy)}</span>}
        acciones={
          <BotonEnlace a="/registrar">
            <PenLineIcon aria-hidden /> Registrar acción
          </BotonEnlace>
        }
      />

      <section aria-label="Indicadores" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador a="/bandeja" titulo="Notificaciones pendientes" valor={indicadores.notificacionesPendientes} icono={BellRingIcon} tono="aviso" />
        <Indicador a="/agenda" titulo="Plazos vencidos" valor={indicadores.plazosVencidos} icono={AlarmClockIcon} tono="alerta" />
        <Indicador a="/agenda" titulo="Vencen en ≤ 3 días hábiles" valor={indicadores.plazosPorVencer} icono={CalendarClockIcon} tono="aviso" />
        <Indicador a="/visitas" titulo="Sin movimiento" valor={indicadores.sinMovimiento} icono={HourglassIcon} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="titulo-pendientes">
          <h2 id="titulo-pendientes" className="mb-3 text-lg font-semibold">
            Pendientes por urgencia
          </h2>
          {d.cargando ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : visibles.length === 0 ? (
            <EstadoVacio titulo="Michi no encontró nada pendiente hoy">Todos los plazos están al día. Buen trabajo.</EstadoVacio>
          ) : (
            <ul className="grid gap-2">
              {visibles.map((p) => {
                const destino = p.expedienteId ? `/expedientes/${p.expedienteId}` : p.tipo === 'visita' ? '/visitas' : '/agenda'
                return (
                  <li key={p.clave}>
                    <Link
                      to={destino}
                      className="flex items-stretch overflow-hidden rounded-xl border bg-card outline-none transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className={cn('w-1.5 shrink-0', FRANJA_SEVERIDAD[p.severidad])} aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{TIPO_TEXTO[p.tipo]}</span>
                          <Severo severidad={p.severidad} />
                        </span>
                        <span className="truncate font-medium">{p.titulo}</span>
                        <span className="truncate text-sm text-muted-foreground">{p.detalle}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
              {pendientes.length > MAX_VISIBLES && (
                <li>
                  <BotonEnlace a="/visitas" variant="outline" className="w-full">
                    Ver {pendientes.length - MAX_VISIBLES} más
                  </BotonEnlace>
                </li>
              )}
            </ul>
          )}
        </section>

        <aside aria-labelledby="titulo-ultimas">
          <Card>
            <CardHeader>
              <CardTitle id="titulo-ultimas" className="font-heading text-lg">
                Últimas acciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ultimas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay acciones registradas.</p>
              ) : (
                <ol className="grid gap-3">
                  {ultimas.map((a) => (
                    <li key={a.id} className="border-l-2 border-brand-gold/60 pl-3">
                      <p className="text-sm font-medium">{a.tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        <Link className="underline-offset-2 hover:underline" to={`/expedientes/${a.expedienteId}`}>
                          {etiquetaExp(d.expPorId.get(a.expedienteId))}
                        </Link>{' '}
                        · {fecha(a.fecha)} · {a.responsable}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  )
}
