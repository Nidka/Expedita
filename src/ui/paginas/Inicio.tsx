import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HourglassIcon, TriangleAlertIcon } from 'lucide-react'
import { calcularPendientes, type Pendiente } from '@/domain/agenda/que-toca-hoy'
import { aDate } from '@/domain/shared/fecha'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useDatos } from '../contexto'
import { DiasRestantes, EncabezadoPagina, EstadoVacio, Fila, Lista, Seccion, Severo } from '../componentes/base'
import { etiquetaExp, fecha, fechaLarga, plural } from '../formato'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']

/** Chip de fecha para audiencias y visitas (día grande + mes). */
export function FechaChip({ f, className }: { f: string; className?: string }) {
  const d = aDate(f)
  return (
    <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl bg-info-soft text-info-foreground', className)} aria-hidden>
      <span className="grid text-center leading-none">
        <span className="text-[0.625rem] font-semibold tracking-wide uppercase">{MESES[d.getUTCMonth()]}</span>
        <span className="tabular text-lg font-bold">{d.getUTCDate()}</span>
      </span>
    </span>
  )
}

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

function Resumen({ valores }: { valores: { etiqueta: string; valor: number; a: string; tono?: 'rojo' | 'ambar' }[] }) {
  return (
    <nav aria-label="Resumen" className="mb-8 grid grid-cols-2 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--border)] sm:grid-cols-4">
      {valores.map((v, i) => (
        <Link
          key={v.etiqueta}
          to={v.a}
          className={cn(
            'flex flex-col gap-1 px-5 py-4 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted',
            i % 2 === 1 && 'border-l border-separator',
            i >= 2 && 'border-t border-separator sm:border-t-0',
            i === 2 && 'sm:border-l',
          )}
        >
          <span
            className={cn(
              'tabular text-[1.75rem] leading-none font-bold',
              v.valor > 0 && v.tono === 'rojo' && 'text-destructive',
              v.valor > 0 && v.tono === 'ambar' && 'text-warning-foreground',
            )}
          >
            {v.valor}
          </span>
          <span className="text-sm text-muted-foreground">{v.etiqueta}</span>
        </Link>
      ))}
    </nav>
  )
}

function FilaPendiente({ p }: { p: Pendiente }) {
  const d = useDatos()
  const a = p.expedienteId ? `/expedientes/${p.expedienteId}` : p.tipo === 'visita' ? '/visitas' : '/agenda'
  const conPlazo = (p.tipo === 'notificacion' || p.tipo === 'proxima') && p.fecha
  const inicio = conPlazo ? (
    <DiasRestantes dias={d.calendario.habilesEntre(d.hoy, p.fecha!)} />
  ) : (p.tipo === 'audiencia' || p.tipo === 'visita') && p.fecha ? (
    <FechaChip f={p.fecha} />
  ) : p.tipo === 'abandono' ? (
    <span className="grid size-12 place-items-center rounded-xl bg-destructive-soft text-destructive" aria-hidden>
      <TriangleAlertIcon className="size-5" />
    </span>
  ) : (
    <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground" aria-hidden>
      <HourglassIcon className="size-5" />
    </span>
  )
  const tipo = { notificacion: 'Notificación', proxima: 'Próxima acción', audiencia: 'Audiencia', visita: 'Visita', abandono: 'Abandono', 'sin-movimiento': 'Sin movimiento' }[p.tipo]
  return (
    <Fila
      a={a}
      inicio={inicio}
      titulo={p.titulo}
      subtitulo={`${tipo} · ${p.detalle}${conPlazo ? ` · vence ${fecha(p.fecha)}` : ''}`}
      fin={p.tipo === 'abandono' ? <Severo severidad={p.severidad} /> : undefined}
    />
  )
}

export function Inicio() {
  const d = useDatos()
  const { pendientes, indicadores } = useMemo(
    () => calcularPendientes(d, { hoy: d.hoy, calendario: d.calendario, diasSinMovimiento: d.config.diasSinMovimiento }),
    [d],
  )
  const vencidos = pendientes.filter((p) => p.severidad === 'vencido')
  const semana = pendientes.filter((p) => p.severidad === 'urgente' || p.severidad === 'proximo')
  const seguimiento = pendientes.filter((p) => p.severidad === 'info')
  const ultimas = useMemo(
    () => [...d.acciones].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn)).slice(0, 5),
    [d.acciones],
  )
  const audiencias = d.audiencias
    .filter((a) => a.estado === 'programada' && a.fecha >= d.hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
    .slice(0, 4)
  const nombre = d.sesion.miembro.nombre.split(' ')[0]

  return (
    <>
      <EncabezadoPagina
        antetitulo={fechaLarga(d.hoy)}
        titulo={`${saludo()}, ${nombre}`}
        descripcion={
          d.cargando
            ? 'Revisando expedientes…'
            : vencidos.length
              ? `Tienes ${plural(vencidos.length, 'asunto vencido', 'asuntos vencidos')}. Empieza por ahí.`
              : semana.length
                ? `Nada vencido. ${plural(semana.length, 'asunto vence', 'asuntos vencen')} esta semana.`
                : 'Todo al día. Michi está tranquilo.'
        }
      />

      <Resumen
        valores={[
          { etiqueta: 'Notificaciones pendientes', valor: indicadores.notificacionesPendientes, a: '/bandeja', tono: 'ambar' },
          { etiqueta: 'Plazos vencidos', valor: indicadores.plazosVencidos, a: '/agenda', tono: 'rojo' },
          { etiqueta: 'Vencen en 3 días hábiles', valor: indicadores.plazosPorVencer, a: '/agenda', tono: 'ambar' },
          { etiqueta: 'Sin movimiento', valor: indicadores.sinMovimiento, a: '/expedientes' },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-8">
          {d.cargando ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-18 rounded-2xl" />
              ))}
            </div>
          ) : pendientes.length === 0 ? (
            <EstadoVacio titulo="Nada pendiente hoy">Todos los plazos están al día.</EstadoVacio>
          ) : (
            <>
              {vencidos.length > 0 && (
                <Seccion titulo={`Vencidos · ${vencidos.length}`}>
                  <Lista>
                    {vencidos.map((p) => (
                      <FilaPendiente key={p.clave} p={p} />
                    ))}
                  </Lista>
                </Seccion>
              )}
              {semana.length > 0 && (
                <Seccion titulo={`Próximos 7 días · ${semana.length}`}>
                  <Lista>
                    {semana.map((p) => (
                      <FilaPendiente key={p.clave} p={p} />
                    ))}
                  </Lista>
                </Seccion>
              )}
              {seguimiento.length > 0 && (
                <Seccion
                  titulo={`Seguimiento · ${seguimiento.length}`}
                  accion={
                    <Link to="/visitas" className="text-sm font-medium text-primary hover:underline">
                      Planificar visitas
                    </Link>
                  }
                >
                  <Lista>
                    {seguimiento.slice(0, 6).map((p) => (
                      <FilaPendiente key={p.clave} p={p} />
                    ))}
                  </Lista>
                  {seguimiento.length > 6 && (
                    <p className="px-1 text-sm text-muted-foreground">
                      y {plural(seguimiento.length - 6, 'expediente más', 'expedientes más')} sin movimiento.
                    </p>
                  )}
                </Seccion>
              )}
            </>
          )}
        </div>

        <aside className="grid content-start gap-8">
          <Seccion
            titulo="Audiencias"
            accion={
              <Link to="/agenda" className="text-sm font-medium text-primary hover:underline">
                Agenda
              </Link>
            }
          >
            {audiencias.length === 0 ? (
              <p className="rounded-2xl bg-card px-4 py-5 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--border)]">Sin audiencias programadas.</p>
            ) : (
              <Lista>
                {audiencias.map((a) => (
                  <Fila
                    key={a.id}
                    a={`/expedientes/${a.expedienteId}`}
                    inicio={<FechaChip f={a.fecha} />}
                    titulo={a.tipo}
                    subtitulo={`${a.hora ?? 'Sin hora'} · ${etiquetaExp(d.expPorId.get(a.expedienteId))}`}
                  />
                ))}
              </Lista>
            )}
          </Seccion>

          <Seccion titulo="Últimas acciones">
            {ultimas.length === 0 ? (
              <p className="rounded-2xl bg-card px-4 py-5 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--border)]">Aún no hay acciones registradas.</p>
            ) : (
              <Lista>
                {ultimas.map((a) => (
                  <Fila
                    key={a.id}
                    a={`/expedientes/${a.expedienteId}`}
                    titulo={a.tipo}
                    subtitulo={`${fecha(a.fecha)} · ${a.responsable} · ${etiquetaExp(d.expPorId.get(a.expedienteId))}`}
                  />
                ))}
              </Lista>
            )}
          </Seccion>
        </aside>
      </div>
    </>
  )
}
