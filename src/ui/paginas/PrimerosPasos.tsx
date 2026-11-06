import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PasoGuia } from '@/domain/guia/primeros-pasos'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CircleDashedIcon } from '@/ui/iconos'
import { TEXTO_PASO } from '../ayuda/pasos'
import { BotonAyuda } from '../componentes/Ayuda'
import { EncabezadoPagina } from '../componentes/base'
import { Michi } from '../componentes/marca'
import { abrirRecorrido, useGuia } from '../guia'

/** Barra de progreso de la guía (también se usa en Inicio y en Ayuda). */
export function BarraProgreso({ hechos, total, className }: { hechos: number; total: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label="Primeros pasos completados"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={hechos}
      className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}
    >
      <div className="h-full origin-left animate-[llenar_700ms_var(--ease-apple)_both] rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(hechos / Math.max(total, 1)) * 100}%` }} />
    </div>
  )
}

/** Guía de primeros pasos: lista de tareas con progreso, cada una con por qué, cómo y un botón que lleva al lugar exacto. */
export function PrimerosPasos() {
  const g = useGuia()
  const [abierto, setAbierto] = useState<string | undefined>(g.siguiente?.id)

  return (
    <>
      <EncabezadoPagina
        titulo="Primeros pasos"
        descripcion={g.esAdmin ? 'Deja Expedita lista para el estudio. Cada paso se marca solo cuando lo completas.' : 'Lo básico para empezar a usar Expedita.'}
      />

      <section aria-label="Progreso" className="mb-8 flex items-center gap-6 rounded-xl bg-card p-6 shadow-[0_0_0_1px_var(--border)]">
        <Michi pose={g.completo ? 'feliz' : 'leyendo'} className="hidden size-20 shrink-0 sm:block" />
        <div className="grid min-w-0 flex-1 gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">{g.completo ? '¡Todo listo! Expedita ya trabaja para el estudio.' : `${g.hechos} de ${g.total} pasos listos`}</p>
            <p className="shrink-0 text-sm text-muted-foreground tabular">{Math.round((g.hechos / g.total) * 100)}%</p>
          </div>
          <BarraProgreso hechos={g.hechos} total={g.total} />
          {g.completo && g.hechos < g.total && <p className="text-sm text-muted-foreground">Quedan pasos opcionales: hazlos cuando quieras.</p>}
        </div>
      </section>

      <ol className="grid gap-3">
        {g.pasos.map((p, i) => (
          <Paso
            key={p.id}
            paso={p}
            numero={i + 1}
            abierto={abierto === p.id}
            alternar={() => setAbierto(abierto === p.id ? undefined : p.id)}
            marcar={(v) => {
              g.marcar(p.id, v)
              if (v) setAbierto(g.pasos.find((x) => !x.hecho && x.id !== p.id)?.id)
            }}
          />
        ))}
      </ol>
    </>
  )
}

function Paso({ paso, numero, abierto, alternar, marcar }: { paso: PasoGuia; numero: number; abierto: boolean; alternar: () => void; marcar: (v: boolean) => void }) {
  const t = TEXTO_PASO[paso.id]
  const idCuerpo = `paso-${paso.id}`
  const esRecorrido = t.accion.a === '#recorrido'
  return (
    <li className={cn('overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)] transition-shadow', abierto && 'shadow-[0_0_0_1px_var(--ring)]')}>
      <button type="button" onClick={alternar} aria-expanded={abierto} aria-controls={idCuerpo} className="flex w-full items-center gap-4 px-5 py-4 text-left outline-none focus-visible:bg-muted/60">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors',
            paso.hecho ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
          )}
          aria-hidden
        >
          {paso.hecho ? <CheckIcon className="size-4 animate-entrar" weight="bold" /> : <CircleDashedIcon className="size-7" />}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className={cn('font-medium', paso.hecho && 'text-muted-foreground line-through decoration-muted-foreground/40')}>
            <span className="sr-only">Paso {numero}: </span>
            {t.titulo}
            <span className="sr-only">{paso.hecho ? ' (listo)' : ' (pendiente)'}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {paso.opcional ? 'Opcional · ' : ''}
            {t.minutos} min
          </span>
        </span>
        <ChevronDownIcon className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', abierto && 'rotate-180')} aria-hidden />
      </button>

      {abierto && (
        <div id={idCuerpo} className="grid animate-entrar gap-4 border-t border-separator px-5 py-5 sm:pl-[4.25rem]">
          <p className="text-[0.9375rem] text-muted-foreground">{t.porQue}</p>
          <ol className="grid gap-2 text-[0.9375rem]">
            {t.como.map((c, i) => (
              <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-2">
                <span className="mt-0.5 grid size-6 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground tabular" aria-hidden>
                  {i + 1}
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            {esRecorrido ? (
              <Button onClick={abrirRecorrido}>
                {t.accion.texto} <ArrowRightIcon aria-hidden />
              </Button>
            ) : (
              <Button nativeButton={false} render={<Link to={t.accion.a} />}>
                {t.accion.texto} <ArrowRightIcon aria-hidden />
              </Button>
            )}
            {t.tema && <BotonAyuda tema={t.tema} etiqueta />}
            {!paso.automatico &&
              (paso.hecho ? (
                <Button variant="ghost" onClick={() => marcar(false)} className="ml-auto">
                  Desmarcar
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => marcar(true)} className="ml-auto">
                  <CheckIcon aria-hidden /> {t.marcar ?? 'Ya lo hice'}
                </Button>
              ))}
          </div>
          {paso.automatico && !paso.hecho && <p className="text-xs text-muted-foreground">Se marcará solo cuando esté hecho.</p>}
        </div>
      )}
    </li>
  )
}
