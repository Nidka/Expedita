import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HourglassIcon, TriangleAlertIcon } from '@/ui/iconos'
import { calcularPendientes, type Pendiente } from '@/domain/agenda/que-toca-hoy'
import { aDate } from '@/domain/shared/fecha'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useDatos } from '../contexto'
import { BotonEnlace, DiasRestantes, EstadoVacio, Fila, Lista, Seccion, Severo } from '../componentes/base'
import { Contador } from '../componentes/Contador'
import { Michi, type Pose } from '../componentes/marca'
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
      <Portada
        fecha={fechaLarga(d.hoy)}
        titulo={`${saludo()}, ${nombre}`}
        cargando={d.cargando}
        vencidos={vencidos.length}
        urgentes={semana.filter((p) => p.severidad === 'urgente').length}
        semana={semana.length}
        indicadores={[
          { etiqueta: 'Notificaciones pendientes', valor: indicadores.notificacionesPendientes, a: '/bandeja', tono: 'ambar' },
          { etiqueta: 'Plazos vencidos', valor: indicadores.plazosVencidos, a: '/agenda', tono: 'rojo' },
          { etiqueta: 'Vencen en 3 días hábiles', valor: indicadores.plazosPorVencer, a: '/agenda', tono: 'ambar' },
          { etiqueta: 'Sin movimiento', valor: indicadores.sinMovimiento, a: '/expedientes' },
        ]}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-10">
          {d.cargando ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-18 rounded-xl" />
              ))}
            </div>
          ) : pendientes.length === 0 ? (
            <EstadoVacio pose="feliz" titulo="Nada pendiente hoy">Todos los plazos están al día.</EstadoVacio>
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

        <aside className="grid content-start gap-10">
          <Seccion
            titulo="Audiencias"
            accion={
              <Link to="/agenda" className="text-sm font-medium text-primary hover:underline">
                Agenda
              </Link>
            }
          >
            {audiencias.length === 0 ? (
              <p className="rounded-xl bg-card px-4 py-5 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--border)]">Sin audiencias programadas.</p>
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
              <p className="rounded-xl bg-card px-4 py-5 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--border)]">Aún no hay acciones registradas.</p>
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

interface Indicador {
  etiqueta: string
  valor: number
  a: string
  tono?: 'rojo' | 'ambar'
}

/** Portada de Hoy: saludo, estado del día con Michi en la pose que corresponde, e indicadores. */
function Portada({
  fecha,
  titulo,
  cargando,
  vencidos,
  urgentes,
  semana,
  indicadores,
}: {
  fecha: string
  titulo: string
  cargando: boolean
  vencidos: number
  urgentes: number
  semana: number
  indicadores: Indicador[]
}) {
  const estado: { pose: Pose; texto: string } = cargando
    ? { pose: 'corriendo', texto: 'Revisando expedientes…' }
    : vencidos
      ? { pose: 'enojado', texto: `Tienes ${plural(vencidos, 'asunto vencido', 'asuntos vencidos')}. Empieza por ahí.` }
      : urgentes
        ? { pose: 'alerta', texto: `Nada vencido, pero ${plural(urgentes, 'asunto vence', 'asuntos vencen')} en 3 días hábiles o menos.` }
        : semana
          ? { pose: 'saludando', texto: `Nada vencido. ${plural(semana, 'asunto vence', 'asuntos vencen')} esta semana.` }
          : { pose: 'durmiendo', texto: 'Todo al día. Michi aprovecha para dormir.' }

  return (
    <section aria-labelledby="titulo-hoy" className="mb-12 overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)]">
      <div className="grid grid-cols-[1fr_auto] items-start gap-4 px-6 pt-7 pb-6 sm:items-center sm:gap-6 sm:px-8 sm:pt-9">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{fecha}</p>
          <h1 id="titulo-hoy" className="mt-1 text-[1.75rem] leading-tight font-bold sm:text-[2.125rem]">
            {titulo}
          </h1>
          <p className="mt-2 max-w-md text-[0.9375rem] text-muted-foreground" aria-live="polite">
            {estado.texto}
          </p>
          <div className="col-span-2 mt-1 flex flex-wrap gap-2 sm:col-span-1 sm:mt-5">
            <BotonEnlace a="/registrar">Registrar acción</BotonEnlace>
            <BotonEnlace a="/bandeja?nueva=1" variant="outline">
              Nueva notificación
            </BotonEnlace>
          </div>
        </div>
        <div className="relative grid size-20 place-items-center rounded-full bg-secondary/70 sm:size-44" aria-hidden>
          <span className="animate-flotar">
            <Michi key={estado.pose} pose={estado.pose} className="size-16 animate-entrar [animation-duration:480ms] sm:size-36" />
          </span>
        </div>
      </div>
      <nav aria-label="Resumen" className="grid grid-cols-2 border-t border-separator sm:grid-cols-4">
        {indicadores.map((v, i) => (
          <Link
            key={v.etiqueta}
            to={v.a}
            className={cn(
              'group flex flex-col gap-1.5 px-6 py-5 outline-none transition-colors duration-200 hover:bg-muted/60 focus-visible:bg-muted sm:px-8',
              i % 2 === 1 && 'border-l border-separator',
              i >= 2 && 'border-t border-separator sm:border-t-0',
              i === 2 && 'sm:border-l',
            )}
          >
            <Contador
              valor={v.valor}
              className={cn(
                'tabular text-[1.75rem] leading-none font-bold',
                v.valor > 0 && v.tono === 'rojo' && 'text-destructive',
                v.valor > 0 && v.tono === 'ambar' && 'text-warning-foreground',
              )}
            />
            <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">{v.etiqueta}</span>
          </Link>
        ))}
      </nav>
    </section>
  )
}
