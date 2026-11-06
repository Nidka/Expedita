import { useEffect, useState } from 'react'
import type { AvanceCliente } from '@/domain/avance/avance'
import { VIAS } from '@/domain/plazos/catalogo'
import { useContenedor } from '../contexto'
import { Michi } from '../componentes/marca'
import { RutaEtapas } from '../componentes/RutaEtapas'
import { fecha, fechaLarga } from '../formato'
import { Skeleton } from '@/components/ui/skeleton'

const MODALIDAD = { virtual: 'Virtual', presencial: 'Presencial', mixta: 'Mixta' } as const

/**
 * RF-40: página pública (sin sesión) con el avance de un expediente.
 * Pensada para abrirse desde WhatsApp en el celular del cliente.
 */
export function PaginaAvance({ token }: { token: string }) {
  const c = useContenedor()
  const [estado, setEstado] = useState<{ tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'ok'; a: AvanceCliente }>({ tipo: 'cargando' })

  useEffect(() => {
    let vivo = true
    c.enlaces
      .avance(token)
      .then((a) => vivo && setEstado({ tipo: 'ok', a }))
      .catch(() => vivo && setEstado({ tipo: 'error' }))
    return () => {
      vivo = false
    }
  }, [c, token])

  useEffect(() => {
    document.title = estado.tipo === 'ok' ? `Avance de su expediente · ${estado.a.estudio}` : 'Avance de su expediente'
    // Que los buscadores no indexen la página aunque el enlace se filtre
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [estado])

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto grid max-w-2xl gap-8 px-4 py-8 sm:px-6 sm:py-14">
        {estado.tipo === 'cargando' && (
          <div className="grid gap-4" aria-busy="true" aria-label="Cargando">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-36" />
            <Skeleton className="h-56" />
          </div>
        )}

        {estado.tipo === 'error' && (
          <div className="grid justify-items-center gap-4 py-16 text-center animate-entrar">
            <Michi pose="espaldas" className="size-28" />
            <h1 className="text-xl font-semibold tracking-tight">Este enlace no está disponible</h1>
            <p className="max-w-sm text-[0.9375rem] text-muted-foreground">
              Puede que haya vencido o que el estudio lo haya desactivado. Pida un enlace nuevo a su abogado.
            </p>
          </div>
        )}

        {estado.tipo === 'ok' && <Contenido a={estado.a} />}
      </div>
    </div>
  )
}

function Contenido({ a }: { a: AvanceCliente }) {
  const archivado = a.estado === 'archivado'
  const ultimo = a.movimientos[0]
  return (
    <>
      <header className="grid gap-5 animate-entrar">
        <p className="text-sm font-medium text-muted-foreground">{a.estudio}</p>
        <div className="grid gap-2">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-[2rem]">Avance de su expediente</h1>
          <p className="tabular text-[0.9375rem] font-medium break-all text-foreground/80">{a.numero}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          {a.cliente && <Dato k="Cliente" v={a.cliente} />}
          {a.materia && <Dato k="Materia" v={a.materia} />}
          {a.organo && <Dato k="Juzgado" v={a.organo} />}
          <Dato k="Estado" v={archivado ? 'Concluido / archivado' : 'En trámite'} />
          {ultimo && <Dato k="Último movimiento" v={fecha(ultimo.fecha)} />}
        </dl>
      </header>

      <section aria-labelledby="etapa" className="grid gap-5 rounded-xl bg-card p-6 shadow-[0_0_0_1px_var(--border)] animate-entrar [animation-delay:60ms]">
        <div>
          <h2 id="etapa" className="text-[1.0625rem] font-semibold">
            {a.etapa ? `Etapa actual: ${a.etapa}` : 'Etapa del proceso'}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{VIAS[a.via]?.nombre}</p>
        </div>
        <RutaEtapas via={a.via} etapa={a.etapa} />
      </section>

      {a.audiencias.length > 0 && (
        <section aria-labelledby="audiencias" className="grid gap-3 animate-entrar [animation-delay:120ms]">
          <h2 id="audiencias" className="px-1 text-[1.0625rem] font-semibold">
            Próximas audiencias
          </h2>
          <ul className="grid gap-2">
            {a.audiencias.map((x, i) => (
              <li key={i} className="flex items-start gap-4 rounded-xl bg-card p-5 shadow-[0_0_0_1px_var(--border)]">
                <span className="w-12 shrink-0 text-center leading-none" aria-hidden>
                  <span className="block text-[0.6875rem] font-semibold tracking-wide text-primary uppercase">{new Date(x.fecha + 'T12:00').toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')}</span>
                  <span className="tabular mt-1 block text-2xl font-semibold">{Number(x.fecha.slice(8, 10))}</span>
                </span>
                <div className="grid gap-0.5">
                  <p className="font-medium">{x.tipo}</p>
                  <p className="text-sm text-muted-foreground">
                    {fechaLarga(x.fecha)}
                    {x.hora && ` · ${x.hora} h`} · {MODALIDAD[x.modalidad] ?? x.modalidad}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="movimientos" className="grid gap-3 animate-entrar [animation-delay:180ms]">
        <h2 id="movimientos" className="px-1 text-[1.0625rem] font-semibold">
          Lo que hemos hecho
        </h2>
        {a.movimientos.length ? (
          <ol className="relative grid gap-0 rounded-xl bg-card px-6 py-3 shadow-[0_0_0_1px_var(--border)]">
            {a.movimientos.map((m, i) => (
              <li key={i} className="relative grid grid-cols-[1rem_1fr] gap-4 py-3">
                {/* Línea de tiempo: punto y conector */}
                <span aria-hidden className="relative flex justify-center">
                  <span className={`mt-1.5 size-2.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-input'}`} />
                  {i < a.movimientos.length - 1 && <span className="absolute top-5 -bottom-4 w-px bg-separator" />}
                </span>
                <div className="grid gap-0.5">
                  <p className="text-[0.9375rem]">{m.tipo}</p>
                  <p className="text-sm text-muted-foreground tabular">{fechaLarga(m.fecha)}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl bg-card px-6 py-5 text-sm text-muted-foreground shadow-[0_0_0_1px_var(--border)]">Aún no hay movimientos registrados.</p>
        )}
      </section>

      <footer className="grid gap-1 border-t border-separator pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>Información referencial preparada por {a.estudio}. Para cualquier consulta, comuníquese con su abogado.</p>
        <p>{a.expira ? `Este enlace es personal y vence el ${fecha(a.expira)}.` : 'Este enlace es personal; no lo comparta.'}</p>
      </footer>
    </>
  )
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  )
}
