import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FolderIcon, SearchIcon } from 'lucide-react'
import type { Expediente } from '@/domain/entidades'
import { VIAS } from '@/domain/plazos/catalogo'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useDatos } from '../contexto'
import { EncabezadoPagina, EstadoVacio, Mono, SelectNativo } from '../componentes/base'
import { partes, plural } from '../formato'

export const SIN_MATERIA = 'Sin materia'

/** Carpeta = materia tal cual el cuadro; solo se unifican mayúsculas y espacios. */
export function carpetaDe(e: Pick<Expediente, 'materia'>): string {
  const m = (e.materia ?? '').replace(/\s+/g, ' ').trim()
  return m ? m.charAt(0).toUpperCase() + m.slice(1).toLowerCase() : SIN_MATERIA
}

function coincide(e: Expediente, q: string) {
  return [e.codigo, e.numero, e.cliente, e.demandante, e.demandado, e.organo, e.especialista, e.distrito, e.materia]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

export function Expedientes() {
  const { expedientes, acciones } = useDatos()
  const [params, setParams] = useSearchParams()
  const carpeta = params.get('carpeta') ?? ''
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

  const accionesPorExp = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of acciones) m.set(a.expedienteId, (m.get(a.expedienteId) ?? 0) + 1)
    return m
  }, [acciones])

  const busqueda = q.trim().toLowerCase()
  const lista = base
    .filter((e) => (busqueda ? coincide(e, busqueda) : !carpeta || carpetaDe(e) === carpeta))
    .sort((a, b) => (a.codigo ?? '~').localeCompare(b.codigo ?? '~', 'es', { numeric: true }))

  const elegirCarpeta = (c: string) => {
    setQ('')
    setParams(c ? { carpeta: c } : {})
  }

  return (
    <>
      <EncabezadoPagina titulo="Expedientes" descripcion={`${plural(expedientes.length, 'expediente', 'expedientes')} en el estudio`} />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, número, cliente, juzgado…"
            aria-label="Buscar expedientes en todas las carpetas"
            className="h-9 pl-8"
          />
        </div>
        <SelectNativo aria-label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
          <option value="activo">Activos</option>
          <option value="archivado">Archivados</option>
          <option value="">Todos</option>
        </SelectNativo>
        <SelectNativo aria-label="Distrito judicial" value={distrito} onChange={(e) => setDistrito(e.target.value)}>
          <option value="">Todos los distritos</option>
          {distritos.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </SelectNativo>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Carpetas por materia" className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Carpetas</h2>
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible">
            {[['', base.length] as const, ...carpetas].map(([c, n]) => {
              const activa = !busqueda && carpeta === c
              return (
                <li key={c || '__todas'} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => elegirCarpeta(c)}
                    aria-current={activa ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                      activa && 'bg-secondary font-medium text-secondary-foreground',
                    )}
                  >
                    <FolderIcon className={cn('size-4 shrink-0', activa ? 'text-brand-gold' : 'text-muted-foreground')} aria-hidden />
                    <span className="max-w-48 truncate lg:max-w-none lg:flex-1">{c || 'Todas'}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <section aria-label="Lista de expedientes" aria-live="polite">
          <p className="mb-2 text-sm text-muted-foreground">
            {busqueda ? `Resultados en todas las carpetas: ${lista.length}` : `${carpeta || 'Todas las carpetas'} · ${lista.length}`}
          </p>
          {lista.length === 0 ? (
            <EstadoVacio titulo="No hay expedientes con estos filtros" />
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {lista.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/expedientes/${e.id}`}
                    className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-2">
                        {e.codigo && (
                          <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-semibold text-accent-foreground">{e.codigo}</span>
                        )}
                        <Mono>{e.numero}</Mono>
                      </span>
                      <span className="truncate text-sm">{partes(e)}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {e.organo ?? 'Órgano sin registrar'}
                        {e.distrito ? ` · ${e.distrito}` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-wrap gap-x-3 text-xs text-muted-foreground sm:flex-col sm:items-end">
                      <span>{e.etapa ?? VIAS[e.via]?.nombre}</span>
                      <span>{plural(accionesPorExp.get(e.id) ?? 0, 'acción', 'acciones')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
