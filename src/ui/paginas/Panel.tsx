import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { calcularPanel } from '@/domain/panel'
import { cn } from '@/lib/utils'
import { ChevronRightIcon } from '@/ui/iconos'
import { useDatos } from '../contexto'
import { Codigo, EncabezadoPagina, EstadoVacio, Mono } from '../componentes/base'
import { Contador } from '../componentes/Contador'
import { BarrasHorizontales, BarrasSemanales, Grafico, TablaSimple } from '../componentes/Graficos'
import { fecha, fechaLarga, plural } from '../formato'

const corta = (f: string) => {
  const [, m, d] = f.split('-')
  return `${Number(d)}/${Number(m)}`
}

/** Panel: el estado de la cartera del estudio de un vistazo. */
export function Panel() {
  const d = useDatos()
  const p = useMemo(
    () => calcularPanel(d, { hoy: d.hoy, calendario: d.calendario, diasSinMovimiento: d.config.diasSinMovimiento }, d.ultimaAccion),
    [d],
  )
  const i = p.indicadores

  const kpis: { etiqueta: string; valor: number; nota?: string; a: string; tono?: 'alerta' }[] = [
    { etiqueta: 'Expedientes activos', valor: i.activos, a: '/expedientes' },
    {
      etiqueta: 'Impulsados en 30 días',
      valor: i.impulsados30,
      nota: i.porcentajeImpulsados === null ? undefined : `${i.porcentajeImpulsados}% de los activos`,
      a: '/reportes',
    },
    { etiqueta: 'Sin movimiento', valor: i.sinMovimiento, nota: `Más de ${d.config.diasSinMovimiento} días`, a: '/expedientes', tono: i.sinMovimiento ? 'alerta' : undefined },
    {
      etiqueta: 'Plazos esta semana',
      valor: i.plazosSemana,
      nota: i.vencidos ? `${plural(i.vencidos, 'vencido', 'vencidos')} sin atender` : 'Ninguno vencido',
      a: '/bandeja',
      tono: i.vencidos ? 'alerta' : undefined,
    },
    { etiqueta: 'Audiencias en 30 días', valor: i.audiencias30, a: '/agenda' },
  ]

  if (!d.cargando && !i.activos)
    return (
      <>
        <EncabezadoPagina ayuda="panel" titulo="Panel" />
        <EstadoVacio pose="libros" titulo="Aún no hay expedientes activos">
          Carga el cuadro de Excel o agrega expedientes y aquí verás el estado de la cartera.
        </EstadoVacio>
      </>
    )

  return (
    <>
      <EncabezadoPagina ayuda="panel" titulo="Panel" descripcion={`Estado de la cartera al ${fechaLarga(d.hoy).toLowerCase()}`} />

      <nav aria-label="Indicadores" className="mb-8 grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)] sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k, n) => (
          <Link
            key={k.etiqueta}
            to={k.a}
            className={cn(
              'group flex flex-col gap-2 border-separator px-5 py-5 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted',
              n > 0 && 'border-l',
              n >= 2 && 'max-lg:border-t',
              n === 2 && 'max-sm:border-l-0',
            )}
          >
            <span className="text-sm text-muted-foreground">{k.etiqueta}</span>
            <span className={cn('text-[1.75rem] leading-none font-semibold tracking-tight tabular', k.tono === 'alerta' && 'text-warning-foreground')}>
              <Contador valor={k.valor} />
            </span>
            {k.nota && <span className="text-xs text-muted-foreground">{k.nota}</span>}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6">
        <Grafico
          titulo="Acciones por semana"
          descripcion="Últimas 12 semanas. Pasa el mouse sobre una barra para ver el detalle."
          tabla={<TablaSimple columnas={['Semana del', 'Acciones']} filas={p.semanas.map((s) => [fecha(s.inicio), s.n])} />}
        >
          <BarrasSemanales semanas={p.semanas} formato={corta} />
        </Grafico>

        <div className="grid gap-6 lg:grid-cols-2">
          <Grafico
            titulo="Días desde el último movimiento"
            descripcion="Expedientes activos según el tiempo que llevan sin impulso."
            tabla={<TablaSimple columnas={['Tramo', 'Expedientes']} filas={p.antiguedad.map((f) => [f.clave, f.n])} />}
          >
            <BarrasHorizontales filas={p.antiguedad} unidad={['expediente', 'expedientes']} />
          </Grafico>

          <section aria-labelledby="quietos" className="grid content-start gap-4 rounded-xl bg-card p-6 shadow-[0_0_0_1px_var(--border)]">
            <div>
              <h2 id="quietos" className="text-[1.0625rem] font-semibold">
                Más tiempo sin impulso
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Los primeros a revisar.</p>
            </div>
            <ol className="-mx-2 grid">
              {p.masQuietos.map((x) => (
                <li key={x.id}>
                  <Link to={`/expedientes/${x.id}`} className="group flex items-center gap-3 rounded-lg px-2 py-2 outline-none hover:bg-muted/60 focus-visible:bg-muted">
                    <span className="grid min-w-0 flex-1">
                      <span className="flex items-center gap-2 truncate text-sm">
                        {x.codigo && <Codigo>{x.codigo}</Codigo>}
                        <Mono className="truncate">{x.numero}</Mono>
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{x.cliente ?? '—'}</span>
                    </span>
                    <span className={cn('shrink-0 text-sm font-medium tabular', x.dias > d.config.diasSinMovimiento && 'text-warning-foreground')}>{x.dias} días</span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Grafico titulo="Por etapa" descripcion="Expedientes activos en cada etapa del proceso." tabla={<TablaSimple columnas={['Etapa', 'Expedientes']} filas={p.porEtapa.map((f) => [f.clave, f.n])} />}>
            <BarrasHorizontales filas={p.porEtapa} unidad={['expediente', 'expedientes']} />
          </Grafico>
          <Grafico titulo="Por materia" descripcion="Las carpetas con más expedientes activos." tabla={<TablaSimple columnas={['Materia', 'Expedientes']} filas={p.porMateria.map((f) => [f.clave, f.n])} />}>
            <BarrasHorizontales filas={p.porMateria} unidad={['expediente', 'expedientes']} />
          </Grafico>
        </div>

        <Grafico
          titulo="Actividad del equipo"
          descripcion="Acciones registradas por cada persona en los últimos 30 días."
          tabla={<TablaSimple columnas={['Responsable', 'Acciones']} filas={p.porResponsable30.map((f) => [f.clave, f.n])} />}
        >
          <BarrasHorizontales filas={p.porResponsable30} unidad={['acción', 'acciones']} />
        </Grafico>
      </div>
    </>
  )
}
