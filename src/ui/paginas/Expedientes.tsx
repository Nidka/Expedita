import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDownIcon, FolderIcon, FolderPlusIcon, SearchIcon } from '@/ui/iconos'
import type { Expediente } from '@/domain/entidades'
import { estadoMovimiento, type EstadoMovimiento } from '@/domain/agenda/que-toca-hoy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useDatos } from '../contexto'
import { Codigo, EncabezadoPagina, EstadoVacio, Fila, Lista, Mono, SelectNativo, Severo } from '../componentes/base'
import { AgregarExpediente } from '../componentes/AgregarExpediente'
import { partes, plural } from '../formato'

export const SIN_MATERIA = 'Sin materia'

/** Carpeta = materia tal cual el cuadro; solo se unifican mayúsculas y espacios. */
export function carpetaDe(e: Pick<Expediente, 'materia'>): string {
  const m = (e.materia ?? '').replace(/\s+/g, ' ').trim()
  return m ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : SIN_MATERIA
}

function coincide(e: Expediente, q: string) {
  return [e.codigo, e.numero, e.cliente, e.demandante, e.demandado, e.organo, e.especialista, e.distrito, e.materia].join(' ').toLowerCase().includes(q)
}

const TANDA = 100

type FilaExp = { e: Expediente; mov?: EstadoMovimiento }
type Orden = 'codigo' | 'cliente' | 'quietos' | 'recientes'

const porCodigo = (a: FilaExp, b: FilaExp) => (a.e.codigo ?? '~').localeCompare(b.e.codigo ?? '~', 'es', { numeric: true })
const ORDENES: Record<Orden, { texto: string; comparar: (a: FilaExp, b: FilaExp) => number }> = {
  codigo: { texto: 'Ordenar por código', comparar: porCodigo },
  cliente: {
    texto: 'Ordenar por cliente',
    comparar: (a, b) => partes(a.e).localeCompare(partes(b.e), 'es') || porCodigo(a, b),
  },
  quietos: {
    texto: 'Más tiempo sin impulso',
    comparar: (a, b) => (b.mov?.dias ?? -1) - (a.mov?.dias ?? -1) || porCodigo(a, b),
  },
  recientes: {
    texto: 'Movidos recientemente',
    comparar: (a, b) => (a.mov?.dias ?? 1e9) - (b.mov?.dias ?? 1e9) || porCodigo(a, b),
  },
}

/** Encabezado de columna; si tiene clave, ordena la tabla. */
function Cabecera({
  texto,
  clave,
  className,
  orden,
  ordenar,
}: {
  texto: string
  clave?: Orden
  className?: string
  orden: Orden
  ordenar: (o: Orden) => void
}) {
  return (
    <th
      scope="col"
      aria-sort={clave && orden === clave ? 'ascending' : undefined}
      className={cn('px-4 py-2.5 text-left text-xs font-medium text-muted-foreground', className)}
    >
      {clave ? (
        <button
          type="button"
          onClick={() => ordenar(clave)}
          className={cn(
            'inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
            orden === clave && 'text-foreground',
          )}
        >
          {texto}
          <ChevronDownIcon className={cn('size-3 transition-opacity', orden === clave ? 'opacity-100' : 'opacity-0')} aria-hidden />
        </button>
      ) : (
        texto
      )}
    </th>
  )
}

/** Tabla de escritorio: columnas ordenables, toda la fila abre la ficha. */
function TablaExpedientes({ filas, orden, ordenar, diasAlerta }: { filas: FilaExp[]; orden: Orden; ordenar: (o: Orden) => void; diasAlerta: number }) {
  const navegar = useNavigate()
  return (
    <div className="hidden overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)] md:block">
      <table className="w-full table-fixed text-sm">
        <thead className="border-b border-separator bg-muted/40">
          <tr>
            <Cabecera texto="Código" clave="codigo" className="w-24" orden={orden} ordenar={ordenar} />
            <Cabecera texto="Expediente y partes" clave="cliente" orden={orden} ordenar={ordenar} />
            <Cabecera texto="Etapa" className="hidden w-44 lg:table-cell" orden={orden} ordenar={ordenar} />
            <Cabecera texto="Sin impulso" clave="quietos" className="w-32 text-right" orden={orden} ordenar={ordenar} />
          </tr>
        </thead>
        <tbody>
          {filas.map(({ e, mov }) => (
            <tr
              key={e.id}
              onClick={() => navegar(`/expedientes/${e.id}`)}
              className="group cursor-pointer border-b border-separator transition-colors last:border-0 hover:bg-muted/50"
            >
              <td className="px-4 py-3 align-top">{e.codigo ? <Codigo>{e.codigo}</Codigo> : <span className="text-muted-foreground">—</span>}</td>
              <td className="min-w-0 px-4 py-3">
                <Link
                  to={`/expedientes/${e.id}`}
                  className="block truncate font-medium outline-none group-hover:underline focus-visible:underline"
                  onClick={(ev) => ev.stopPropagation()}
                >
                  {partes(e)}
                </Link>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  <Mono>{e.numero}</Mono>
                  {e.organo ? ` · ${e.organo}` : ''}
                </span>
              </td>
              <td className="hidden truncate px-4 py-3 text-muted-foreground lg:table-cell">{e.estado === 'archivado' ? 'Archivado' : (e.etapa ?? '—')}</td>
              <td className="px-4 py-3 text-right">
                {mov?.abandono ? (
                  <Severo severidad={mov.abandono === 'riesgo' ? 'vencido' : 'urgente'}>Abandono</Severo>
                ) : mov ? (
                  <span className={cn('tabular', mov.dias > diasAlerta ? 'font-medium text-warning-foreground' : 'text-muted-foreground')}>
                    {mov.dias} {mov.dias === 1 ? 'día' : 'días'}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Expedientes() {
  const d = useDatos()
  const { expedientes } = d
  const [params, setParams] = useSearchParams()
  const carpeta = params.get('carpeta') ?? ''
  const agregar = params.get('nuevo') === '1'
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'activo' | 'archivado' | ''>('activo')
  const [distrito, setDistrito] = useState('')

  const distritos = useMemo(() => [...new Set(expedientes.map((e) => e.distrito).filter(Boolean) as string[])].sort(), [expedientes])
  const base = useMemo(
    () => expedientes.filter((e) => (!estado || e.estado === estado) && (!distrito || e.distrito === distrito)),
    [expedientes, estado, distrito],
  )
  const carpetas = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of base) m.set(carpetaDe(e), (m.get(carpetaDe(e)) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
  }, [base])

  const ctx = {
    hoy: d.hoy,
    calendario: d.calendario,
    diasSinMovimiento: d.config.diasSinMovimiento,
  }
  const busqueda = q.trim().toLowerCase()
  const [orden, setOrden] = useState<Orden>('codigo')
  const lista = base
    .filter((e) => (busqueda ? coincide(e, busqueda) : !carpeta || carpetaDe(e) === carpeta))
    .map((e) => ({ e, mov: estadoMovimiento(e, d.ultimaAccion, ctx) }))
    .sort(ORDENES[orden].comparar)

  // Con cientos de expedientes se pintan de a 100: la búsqueda responde al instante.
  // Al cambiar cualquier filtro se vuelve a empezar desde los primeros 100.
  const claveFiltro = `${busqueda}|${carpeta}|${estado}|${distrito}|${orden}`
  const [mostrar, setMostrar] = useState({ clave: claveFiltro, n: TANDA })
  const limite = mostrar.clave === claveFiltro ? mostrar.n : TANDA
  const visibles = lista.slice(0, limite)

  const fijar = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(cambios)) v === null ? p.delete(k) : p.set(k, v)
    setParams(p, { replace: true })
  }

  const chip = (valor: string, texto: string, n: number) => {
    const activa = !busqueda && carpeta === valor
    return (
      <button
        key={valor || '__todas'}
        type="button"
        onClick={() => {
          setQ('')
          fijar({ carpeta: valor || null })
        }}
        aria-pressed={activa}
        className={cn(
          'flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/25 lg:min-h-9 lg:w-full lg:rounded-lg lg:px-3',
          activa
            ? 'bg-primary font-medium text-primary-foreground'
            : 'bg-card text-foreground shadow-[0_0_0_1px_var(--border)] hover:bg-muted lg:bg-transparent lg:shadow-none',
        )}
      >
        <FolderIcon className={cn('hidden size-4 shrink-0 lg:block', activa ? 'opacity-90' : 'text-muted-foreground')} aria-hidden />
        <span className="max-w-56 truncate text-left lg:max-w-none lg:flex-1">{texto}</span>
        <span className={cn('tabular text-xs', activa ? 'opacity-80' : 'text-muted-foreground')}>{n}</span>
      </button>
    )
  }

  return (
    <>
      <EncabezadoPagina
        ayuda="expedientes"
        titulo="Expedientes"
        descripcion={`${plural(expedientes.filter((e) => e.estado === 'activo').length, 'activo', 'activos')} · ${plural(carpetas.length, 'carpeta', 'carpetas')} por materia`}
        acciones={
          <Button onClick={() => fijar({ nuevo: '1' })}>
            <FolderPlusIcon aria-hidden /> Agregar expediente
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_10rem_12rem] xl:grid-cols-[1fr_10rem_12rem_13rem]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en todas las carpetas"
            aria-label="Buscar expedientes por código, número, cliente o juzgado"
            className="pl-9"
          />
        </div>
        <SelectNativo aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
          <option value="activo">Activos</option>
          <option value="archivado">Archivados</option>
          <option value="">Todos</option>
        </SelectNativo>
        <SelectNativo aria-label="Distrito judicial" value={distrito} onChange={(e) => setDistrito(e.target.value)}>
          <option value="">Todos los distritos</option>
          {distritos.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </SelectNativo>
        <SelectNativo aria-label="Ordenar" value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className="sm:col-span-3 xl:col-span-1">
          {(Object.keys(ORDENES) as Orden[]).map((k) => (
            <option key={k} value={k}>
              {ORDENES[k].texto}
            </option>
          ))}
        </SelectNativo>
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Carpetas por materia" className="-mx-4 lg:sticky lg:top-20 lg:mx-0 lg:self-start">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:px-0">
            {chip('', 'Todas', base.length)}
            {carpetas.map(([c, n]) => chip(c, c, n))}
          </div>
        </nav>

        <section aria-label="Lista de expedientes" className="min-w-0">
          <p className="mb-2.5 px-1 text-sm text-muted-foreground" aria-live="polite">
            {busqueda ? `${plural(lista.length, 'resultado', 'resultados')} en todas las carpetas` : `${carpeta || 'Todas las carpetas'} · ${lista.length}`}
          </p>
          {lista.length === 0 ? (
            <EstadoVacio
              pose={expedientes.length ? 'pensando' : 'libros'}
              titulo={expedientes.length ? 'No hay expedientes con estos filtros' : 'Aún no hay expedientes'}
              accion={
                !expedientes.length && (
                  <Button onClick={() => fijar({ nuevo: '1' })}>
                    <FolderPlusIcon aria-hidden /> Agregar el primero
                  </Button>
                )
              }
            >
              {!expedientes.length && 'Agrégalos uno a uno con su número o importa tu cuadro de Excel desde Ajustes.'}
            </EstadoVacio>
          ) : (
            <>
              <TablaExpedientes filas={visibles} orden={orden} ordenar={setOrden} diasAlerta={d.config.diasSinMovimiento} />
              <Lista className="md:hidden">
                {visibles.map(({ e, mov }) => {
                  return (
                    <Fila
                      key={e.id}
                      a={`/expedientes/${e.id}`}
                      titulo={
                        <span className="flex items-center gap-2">
                          {e.codigo && <Codigo>{e.codigo}</Codigo>}
                          <Mono>{e.numero}</Mono>
                        </span>
                      }
                      subtitulo={`${partes(e)}${e.organo ? ` · ${e.organo}` : ''}`}
                      fin={
                        <span className="hidden flex-col items-end gap-1 text-xs text-muted-foreground sm:flex">
                          {e.etapa && <span>{e.etapa}</span>}
                          {mov?.abandono ? (
                            <Severo severidad={mov.abandono === 'riesgo' ? 'vencido' : 'urgente'}>Abandono</Severo>
                          ) : mov?.sinMovimiento ? (
                            <span>{mov.dias} días sin mov.</span>
                          ) : null}
                        </span>
                      }
                    />
                  )
                })}
              </Lista>
            </>
          )}
          {lista.length > limite && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <p className="text-sm text-muted-foreground tabular">
                {limite} de {lista.length}
              </p>
              <Button variant="outline" onClick={() => setMostrar({ clave: claveFiltro, n: limite + TANDA })}>
                Mostrar {Math.min(TANDA, lista.length - limite)} más
              </Button>
            </div>
          )}
        </section>
      </div>
      {agregar && <AgregarExpediente abierto cerrar={() => fijar({ nuevo: null })} />}
    </>
  )
}
