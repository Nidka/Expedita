import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Gráficos de una sola serie, sin librerías (guía dataviz):
 * un solo color (--grafico), barras finas con extremo redondeado de 4 px anclado a la base,
 * 2 px de separación, valores como texto (no solo color), detalle al pasar el mouse o con teclado,
 * y siempre una vista en tabla.
 */

export function Grafico({ titulo, descripcion, tabla, children }: { titulo: string; descripcion?: string; tabla: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="grid content-start gap-4 rounded-xl bg-card p-6 shadow-[0_0_0_1px_var(--border)]">
      <div>
        <h2 id={id} className="text-[1.0625rem] font-semibold">
          {titulo}
        </h2>
        {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabla</summary>
        <div className="mt-3">{tabla}</div>
      </details>
    </section>
  )
}

export function TablaSimple({ columnas, filas }: { columnas: string[]; filas: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-separator text-left text-xs text-muted-foreground">
          {columnas.map((c, i) => (
            <th key={c} scope="col" className={cn('py-2 font-medium', i > 0 && 'text-right')}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i} className="border-b border-separator last:border-0">
            {f.map((v, j) => (
              <td key={j} className={cn('py-2', j > 0 && 'text-right tabular')}>
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Barras horizontales ordenadas, con la etiqueta a la izquierda y el valor al final de la barra. */
export function BarrasHorizontales({ filas, unidad, max = 8 }: { filas: { clave: string; n: number }[]; unidad: [string, string]; max?: number }) {
  const visibles = filas.slice(0, max)
  const resto = filas.slice(max).reduce((s, f) => s + f.n, 0)
  const datos = resto ? [...visibles, { clave: `Otros (${filas.length - max})`, n: resto }] : visibles
  const mayor = Math.max(1, ...datos.map((f) => f.n))
  if (!datos.length) return <p className="py-6 text-center text-sm text-muted-foreground">Sin datos en este periodo.</p>
  return (
    <ul className="grid gap-2.5">
      {datos.map((f) => (
        <li key={f.clave} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
          <span className="truncate text-sm" title={f.clave}>
            {f.clave}
          </span>
          <span className="flex items-center gap-2" aria-label={`${f.clave}: ${f.n} ${f.n === 1 ? unidad[0] : unidad[1]}`} role="img">
            <span
              data-movimiento="espacial" className="h-3.5 origin-left animate-[llenar_600ms_var(--ease-apple)_both] rounded-r-[4px] bg-grafico"
              style={{ width: `${Math.max(2, (f.n / mayor) * 100)}%` }}
            />
            <span className="shrink-0 text-sm font-medium tabular">{f.n}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Barras verticales por semana: altura proporcional, detalle al pasar el mouse o con Tab. */
export function BarrasSemanales({ semanas, formato }: { semanas: { inicio: string; n: number }[]; formato: (f: string) => string }) {
  const mayor = Math.max(1, ...semanas.map((s) => s.n))
  const cada = Math.ceil(semanas.length / 8) // etiquetas del eje sin amontonarse
  return (
    <div>
      <div className="flex h-44 items-end gap-[2px] border-b border-separator" role="list" aria-label="Acciones por semana">
        {semanas.map((s) => (
          <div key={s.inicio} role="listitem" className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0} aria-label={`Semana del ${formato(s.inicio)}: ${s.n} acciones`}>
            <span
              data-movimiento="espacial" className="w-full max-w-10 origin-bottom animate-[crecer_600ms_var(--ease-apple)_both] rounded-t-[4px] bg-grafico transition-opacity group-hover:opacity-80"
              style={{ height: s.n ? `${Math.max(3, (s.n / mayor) * 100)}%` : '0%' }}
            />
            {s.n === 0 && <span className="absolute bottom-0 h-px w-3/4 bg-input" aria-hidden />}
            <span className="pointer-events-none absolute bottom-full z-10 mb-1 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-[0_0_0_1px_var(--border),0_4px_12px_rgb(0_0_0/0.04)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <strong className="tabular">{s.n}</strong> · semana del {formato(s.inicio)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]" aria-hidden>
        {semanas.map((s, i) => (
          <span key={s.inicio} className="flex-1 truncate text-center text-[0.6875rem] text-muted-foreground">
            {i % cada === 0 ? formato(s.inicio) : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
