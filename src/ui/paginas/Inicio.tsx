import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { calcularPendientes, type Pendiente } from '@/domain/agenda/que-toca-hoy'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { modoDemo } from '@/infrastructure/composicion'
import { CLAVE_DEFINIDA } from './Cuenta'
import { cn } from '@/lib/utils'
import { useDatos } from '../contexto'
import { BotonEnlace, EstadoVacio, Fila, Lista, Seccion, Vence, fechaCorta } from '../componentes/base'
import { Contador } from '../componentes/Contador'
import { Semana } from '../componentes/Semana'
import { Michi, type Pose } from '../componentes/marca'
import { etiquetaExp, fecha, fechaLarga, plural } from '../formato'

const TIPO: Record<Pendiente['tipo'], string> = {
  notificacion: 'Notificación',
  proxima: 'Próxima acción',
  audiencia: 'Audiencia',
  visita: 'Visita',
  abandono: 'Riesgo de abandono',
  'sin-movimiento': 'Sin movimiento',
}

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

/** Fila de pendiente: franja de estado, qué es y de qué expediente, y a la derecha cuándo vence. */
function FilaPendiente({ p }: { p: Pendiente }) {
  const d = useDatos()
  const a = p.expedienteId ? `/expedientes/${p.expedienteId}` : p.tipo === 'visita' ? '/visitas' : '/agenda'
  const conPlazo = (p.tipo === 'notificacion' || p.tipo === 'proxima') && p.fecha
  const fin = conPlazo ? (
    <Vence fecha={p.fecha!} hoy={d.hoy} habiles={d.calendario.habilesEntre(d.hoy, p.fecha!)} />
  ) : p.fecha ? (
    <span className="flex shrink-0 flex-col items-end text-right leading-tight">
      <span className="text-sm font-semibold">{fechaCorta(p.fecha)}</span>
      <span className="mt-0.5 text-xs text-muted-foreground">{TIPO[p.tipo]}</span>
    </span>
  ) : undefined
  return (
    <Fila
      a={a}
      estado={p.severidad}
      titulo={p.titulo}
      subtitulo={conPlazo || !p.fecha ? `${TIPO[p.tipo]} · ${p.detalle}` : p.detalle}
      fin={fin}
    />
  )
}

function Bloque({ titulo, items, max, accion }: { titulo: string; items: Pendiente[]; max?: number; accion?: React.ReactNode }) {
  if (!items.length) return null
  const visibles = max ? items.slice(0, max) : items
  return (
    <Seccion titulo={titulo} cantidad={items.length} accion={accion}>
      <Lista>
        {visibles.map((p) => (
          <FilaPendiente key={p.clave} p={p} />
        ))}
      </Lista>
      {max && items.length > max && (
        <p className="px-1 text-sm text-muted-foreground">y {plural(items.length - max, 'expediente más', 'expedientes más')}.</p>
      )}
    </Seccion>
  )
}

export function Inicio() {
  const d = useDatos()
  const { pendientes, indicadores } = useMemo(
    () => calcularPendientes(d, { hoy: d.hoy, calendario: d.calendario, diasSinMovimiento: d.config.diasSinMovimiento }),
    [d],
  )
  // Secciones por naturaleza: plazos y citas (con fecha) vs. seguimiento de expedientes (abandono, sin movimiento).
  const deSeguimiento = (p: Pendiente) => p.tipo === 'abandono' || p.tipo === 'sin-movimiento'
  const vencidos = pendientes.filter((p) => !deSeguimiento(p) && p.severidad === 'vencido')
  const semana = pendientes.filter((p) => !deSeguimiento(p) && p.severidad !== 'vencido')
  const seguimiento = pendientes.filter(deSeguimiento)
  const ultimas = useMemo(
    () => [...d.acciones].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn)).slice(0, 5),
    [d.acciones],
  )
  const audiencias = d.audiencias
    .filter((a) => a.estado === 'programada' && a.fecha >= d.hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
    .slice(0, 5)

  const urgentes = semana.filter((p) => p.severidad === 'urgente').length
  const estado: { pose: Pose; texto: string } = d.cargando
    ? { pose: 'corriendo', texto: 'Revisando expedientes…' }
    : vencidos.length
      ? { pose: 'enojado', texto: `Tienes ${plural(vencidos.length, 'asunto vencido', 'asuntos vencidos')}. Empieza por ahí.` }
      : urgentes
        ? { pose: 'alerta', texto: `Nada vencido, pero ${plural(urgentes, 'asunto vence', 'asuntos vencen')} en 3 días hábiles o menos.` }
        : semana.length
          ? { pose: 'saludando', texto: `Nada vencido. ${plural(semana.length, 'asunto vence', 'asuntos vencen')} esta semana.` }
          : { pose: 'durmiendo', texto: 'Todo al día. Michi aprovecha para dormir.' }

  const resumen = [
    { etiqueta: 'Notificaciones pendientes', valor: indicadores.notificacionesPendientes, a: '/bandeja', tono: 'ambar' as const },
    { etiqueta: 'Plazos vencidos', valor: indicadores.plazosVencidos, a: '/agenda', tono: 'rojo' as const },
    { etiqueta: 'Vencen en 3 días hábiles', valor: indicadores.plazosPorVencer, a: '/agenda', tono: 'ambar' as const },
    { etiqueta: 'Sin movimiento', valor: indicadores.sinMovimiento, a: '/expedientes' },
  ]

  return (
    <>
      {/* Encabezado: saludo y estado del día; Michi refleja ese estado */}
      <header className="mb-8 flex items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{fechaLarga(d.hoy)}</p>
          <h1 className="mt-1 text-[1.875rem] leading-tight font-bold tracking-tight sm:text-[2.25rem]">
            {saludo()}, {d.sesion.miembro.nombre.split(' ')[0]}
          </h1>
          <p className="mt-2 max-w-lg text-[0.9375rem] text-muted-foreground" aria-live="polite">
            {estado.texto}
          </p>
        </div>
        <span className="hidden shrink-0 animate-flotar sm:block" aria-hidden>
          <Michi key={estado.pose} pose={estado.pose} className="size-28 animate-entrar [animation-duration:480ms] lg:size-32" />
        </span>
      </header>

      <AvisoClave />

      {/* Resumen en una sola banda */}
      <nav
        aria-label="Resumen"
        className="mb-10 grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)] lg:grid-cols-4"
      >
        {resumen.map((v, i) => (
          <Link
            key={v.etiqueta}
            to={v.a}
            className={cn(
              'group flex flex-col gap-2 px-5 py-5 outline-none transition-colors duration-200 hover:bg-muted/50 focus-visible:bg-muted sm:px-6',
              i % 2 === 1 && 'border-l border-separator',
              i >= 2 && 'border-t border-separator lg:border-t-0',
              i === 2 && 'lg:border-l',
            )}
          >
            <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">{v.etiqueta}</span>
            <Contador
              valor={v.valor}
              className={cn(
                'tabular text-[2rem] leading-none font-semibold tracking-tight',
                v.valor > 0 && v.tono === 'rojo' && 'text-destructive',
                v.valor > 0 && v.tono === 'ambar' && 'text-warning-foreground',
              )}
            />
          </Link>
        ))}
      </nav>

      <section aria-labelledby="titulo-semana" className="mb-12 grid gap-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h2 id="titulo-semana" className="text-[1.0625rem] font-semibold">
            Próximos 7 días
          </h2>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-hidden>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-ocre" /> Plazos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-azul-pj" /> Audiencias
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success" /> Visitas
            </span>
          </span>
        </div>
        <Semana />
      </section>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid content-start gap-10">
          {d.cargando ? (
            <div className="grid gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : pendientes.length === 0 ? (
            <EstadoVacio pose="feliz" titulo="Nada pendiente hoy">
              Todos los plazos están al día.
            </EstadoVacio>
          ) : (
            <>
              <Bloque titulo="Vencidos" items={vencidos} />
              <Bloque titulo="Por vencer" items={semana} />
              <Bloque
                titulo="Seguimiento"
                items={seguimiento}
                max={6}
                accion={
                  <Link to="/visitas" className="text-sm font-medium text-primary hover:underline">
                    Planificar visitas
                  </Link>
                }
              />
            </>
          )}
        </div>

        <aside className="grid content-start gap-10">
          <Seccion
            titulo="Audiencias"
            cantidad={audiencias.length || undefined}
            accion={
              <Link to="/agenda" className="text-sm font-medium text-primary hover:underline">
                Ver agenda
              </Link>
            }
          >
            {audiencias.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">Sin audiencias programadas.</p>
            ) : (
              <Lista>
                {audiencias.map((a) => (
                  <li key={a.id} className="border-b border-separator last:border-b-0">
                    <Link
                      to={`/expedientes/${a.expedienteId}`}
                      className="grid grid-cols-[4.25rem_1fr] gap-3 px-5 py-3.5 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted"
                    >
                      <span className="leading-tight">
                        <span className="block text-sm font-semibold">{fechaCorta(a.fecha).split(' ').slice(1).join(' ')}</span>
                        <span className="block text-xs text-muted-foreground tabular">{a.hora ?? 'Sin hora'}</span>
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-sm font-medium">{a.tipo}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {etiquetaExp(d.expPorId.get(a.expedienteId))} · {a.modalidad}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </Lista>
            )}
          </Seccion>

          <Seccion titulo="Últimas acciones">
            {ultimas.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">Aún no hay acciones registradas.</p>
            ) : (
              <ol className="relative grid gap-5 pl-5 before:absolute before:inset-y-1 before:left-[5px] before:w-px before:bg-separator">
                {ultimas.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-background bg-ocre" aria-hidden />
                    <Link to={`/expedientes/${a.expedienteId}`} className="group block outline-none">
                      <span className="block text-sm font-medium group-hover:underline">{a.tipo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {fecha(a.fecha)} · {a.responsable} · {etiquetaExp(d.expPorId.get(a.expedienteId))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Seccion>

          <div className="flex flex-wrap gap-2">
            <BotonEnlace a="/bandeja?nueva=1" variant="outline" className="flex-1">
              Nueva notificación
            </BotonEnlace>
            <BotonEnlace a="/expedientes?nuevo=1" variant="outline" className="flex-1">
              Agregar expediente
            </BotonEnlace>
          </div>
        </aside>
      </div>
    </>
  )
}

/** Sugerencia (descartable) de crear una contraseña: el correo gratuito tiene un límite de envíos por hora. */
function AvisoClave() {
  const { sesion } = useDatos()
  const [visible, setVisible] = useState(() => {
    try {
      return !modoDemo && !localStorage.getItem(CLAVE_DEFINIDA) && !localStorage.getItem('expedita.aviso-clave-cerrado')
    } catch {
      return false
    }
  })
  if (!visible) return null
  const cerrar = () => {
    try {
      localStorage.setItem('expedita.aviso-clave-cerrado', '1')
    } catch {
      /* sin almacenamiento */
    }
    setVisible(false)
  }
  return (
    <div role="status" className="mb-8 flex animate-entrar flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-card px-5 py-4 shadow-[0_0_0_1px_var(--border)]">
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{sesion.miembro.nombre.split(' ')[0]}, crea una contraseña</span>
        <span className="text-muted-foreground"> para entrar al instante sin esperar el enlace por correo.</span>
      </p>
      <div className="flex gap-2">
        <BotonEnlace a="/cuenta" size="sm">
          Crear contraseña
        </BotonEnlace>
        <Button size="sm" variant="ghost" onClick={cerrar}>
          Ahora no
        </Button>
      </div>
    </div>
  )
}
