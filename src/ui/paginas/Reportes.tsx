import { useMemo, useState } from 'react'
import { descargar, generarCSV } from '@/application/exportar'
import { calcularReporte, rangoDePeriodo, type Periodo } from '@/domain/reportes'
import { Button } from '@/components/ui/button'
import { DownloadIcon } from '@/ui/iconos'
import { useDatos } from '../contexto'
import { EncabezadoPagina, EstadoVacio, SelectNativo } from '../componentes/base'
import { Contador } from '../componentes/Contador'
import { BarrasHorizontales, BarrasSemanales, Grafico, TablaSimple } from '../componentes/Graficos'
import { fecha } from '../formato'

const PERIODOS: [Periodo, string][] = [
  ['este-mes', 'Este mes'],
  ['mes-anterior', 'Mes anterior'],
  ['30', 'Últimos 30 días'],
  ['90', 'Últimos 90 días'],
  ['este-anio', 'Este año'],
]

const corta = (f: string) => {
  const [, m, d] = f.split('-')
  return `${Number(d)}/${Number(m)}`
}

/** RF-41: reportes de acciones por abogado, cliente y periodo. */
export function Reportes() {
  const d = useDatos()
  const [periodo, setPeriodo] = useState<Periodo>('90')
  const [responsable, setResponsable] = useState('')
  const [cliente, setCliente] = useState('')

  const responsables = useMemo(() => [...new Set(d.acciones.map((a) => a.responsable).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [d.acciones])
  const clientes = useMemo(
    () => [...new Set(d.expedientes.map((e) => e.cliente || e.demandante).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'es')),
    [d.expedientes],
  )
  const rango = rangoDePeriodo(periodo, d.hoy)
  const r = useMemo(
    () => calcularReporte(d, { ...rango, responsable: responsable || undefined, cliente: cliente || undefined }),
    [d, rango.desde, rango.hasta, responsable, cliente], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const exportar = () => {
    const filas = [...r.acciones]
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((a) => {
        const e = d.expPorId.get(a.expedienteId)
        return { Fecha: a.fecha, Responsable: a.responsable, Tipo: a.tipo, Código: e?.codigo ?? '', Expediente: e?.numero ?? '', Cliente: e?.cliente ?? '', Detalle: a.descripcion }
      })
    descargar(`expedita-reporte-${rango.desde}-a-${rango.hasta}.csv`, generarCSV(filas), 'text/csv;charset=utf-8')
  }

  const indicadores: [string, number | null, string?][] = [
    ['Acciones registradas', r.indicadores.acciones],
    ['Expedientes impulsados', r.indicadores.expedientesImpulsados],
    ['Notificaciones atendidas', r.indicadores.notificacionesAtendidas],
    ['Atendidas a tiempo', r.indicadores.aTiempo, '%'],
    ['Audiencias realizadas', r.indicadores.audienciasRealizadas],
  ]

  return (
    <>
      <EncabezadoPagina
        ayuda="reportes"
        titulo="Reportes"
        descripcion={`Del ${fecha(rango.desde)} al ${fecha(rango.hasta)}`}
        acciones={
          <Button variant="outline" onClick={exportar} disabled={!r.acciones.length}>
            <DownloadIcon aria-hidden /> Exportar CSV
          </Button>
        }
      />

      {/* Filtros en una sola fila, sobre los gráficos */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <SelectNativo aria-label="Periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
          {PERIODOS.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </SelectNativo>
        <SelectNativo aria-label="Abogado" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
          <option value="">Todo el equipo</option>
          {responsables.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </SelectNativo>
        <SelectNativo aria-label="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </SelectNativo>
      </div>

      <dl className="mb-10 grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)] sm:grid-cols-3 lg:grid-cols-5">
        {indicadores.map(([k, v, sufijo], i) => (
          <div key={k} className={`flex flex-col gap-2 border-separator px-5 py-5 ${i > 0 ? 'border-l' : ''} ${i >= 2 ? 'max-lg:border-t' : ''}`}>
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="text-[1.75rem] leading-none font-semibold tracking-tight tabular">
              {v === null ? '—' : <Contador valor={v} />}
              {v !== null && sufijo}
            </dd>
          </div>
        ))}
      </dl>

      {!r.acciones.length ? (
        <EstadoVacio pose="pensando" titulo="No hay acciones en este periodo">
          Prueba con otro periodo o quita los filtros.
        </EstadoVacio>
      ) : (
        <div className="grid gap-8">
          <Grafico
            titulo="Acciones por semana"
            descripcion="Pasa el mouse sobre una barra para ver el detalle."
            tabla={<TablaSimple columnas={['Semana del', 'Acciones']} filas={r.porSemana.map((s) => [fecha(s.inicio), s.n])} />}
          >
            <BarrasSemanales semanas={r.porSemana} formato={corta} />
          </Grafico>

          <div className="grid gap-8 lg:grid-cols-2">
            <Grafico titulo="Por abogado" tabla={<TablaSimple columnas={['Abogado', 'Acciones']} filas={r.porResponsable.map((f) => [f.clave, f.n])} />}>
              <BarrasHorizontales filas={r.porResponsable} unidad={['acción', 'acciones']} />
            </Grafico>
            <Grafico titulo="Por tipo de acción" tabla={<TablaSimple columnas={['Tipo', 'Acciones']} filas={r.porTipo.map((f) => [f.clave, f.n])} />}>
              <BarrasHorizontales filas={r.porTipo} unidad={['acción', 'acciones']} />
            </Grafico>
          </div>

          <section aria-labelledby="por-cliente" className="grid gap-3">
            <h2 id="por-cliente" className="px-1 text-[1.0625rem] font-semibold">
              Por cliente <span className="ml-1 font-normal text-muted-foreground tabular">{r.porCliente.length}</span>
            </h2>
            <div className="overflow-x-auto rounded-xl bg-card px-6 py-2 shadow-[0_0_0_1px_var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-separator text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2.5 font-medium">Cliente</th>
                    <th scope="col" className="py-2.5 text-right font-medium">Acciones</th>
                    <th scope="col" className="py-2.5 text-right font-medium">Expedientes</th>
                    <th scope="col" className="py-2.5 text-right font-medium">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {r.porCliente.slice(0, 25).map((x) => (
                    <tr key={x.cliente} className="border-b border-separator last:border-0">
                      <td className="py-2.5">
                        <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => setCliente(x.cliente)}>
                          {x.cliente}
                        </button>
                      </td>
                      <td className="py-2.5 text-right tabular">{x.n}</td>
                      <td className="py-2.5 text-right tabular">{x.expedientes}</td>
                      <td className="py-2.5 text-right text-muted-foreground tabular">{fecha(x.ultima)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {r.porCliente.length > 25 && <p className="py-2 text-xs text-muted-foreground">Se muestran los 25 con más acciones. El CSV incluye todo.</p>}
            </div>
            {cliente && (
              <p className="px-1 text-sm">
                Filtrado por <strong>{cliente}</strong> ·{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => setCliente('')}>
                  quitar filtro
                </button>
              </p>
            )}
          </section>
        </div>
      )}
    </>
  )
}
