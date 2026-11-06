import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, QuestionIcon } from '@/ui/iconos'
import { TEMA_POR_ID, type Tema, type TemaId } from '../ayuda/temas'

/** Cuerpo de un tema de ayuda: secciones con texto, pasos numerados y listas. */
export function ContenidoTema({ tema, alNavegar }: { tema: Tema; alNavegar?: () => void }) {
  return (
    <div className="grid gap-6 text-[0.9375rem] leading-relaxed">
      {tema.secciones.map((s, i) => (
        <section key={i} className="grid gap-2">
          {s.titulo && <h3 className="text-sm font-semibold">{s.titulo}</h3>}
          {s.texto && <p className="text-muted-foreground">{s.texto}</p>}
          {s.pasos && (
            <ol className="grid gap-2.5">
              {s.pasos.map((p, j) => (
                <li key={j} className="grid grid-cols-[1.5rem_1fr] gap-2.5">
                  <span className="mt-0.5 grid size-6 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground tabular" aria-hidden>
                    {j + 1}
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          )}
          {s.lista && (
            <ul className="grid gap-1.5">
              {s.lista.map((p, j) => (
                <li key={j} className="grid grid-cols-[0.75rem_1fr] gap-2.5 text-muted-foreground">
                  <span className="mt-[0.6rem] size-1.5 rounded-full bg-ocre" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {tema.enlaces && tema.enlaces.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tema.enlaces.map((e) => (
            <Button key={e.a} variant="outline" size="sm" nativeButton={false} render={<Link to={e.a} onClick={alNavegar} />}>
              {e.texto} <ArrowRightIcon aria-hidden />
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Botón «?» junto al título de cada página: abre la explicación en un panel lateral. */
export function BotonAyuda({ tema: id, className, etiqueta }: { tema: TemaId; className?: string; etiqueta?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const tema = TEMA_POR_ID.get(id)
  if (!tema) return null
  return (
    <>
      <Button
        variant="ghost"
        size={etiqueta ? 'sm' : 'icon-sm'}
        onClick={() => setAbierto(true)}
        aria-label={`Ayuda: ${tema.titulo}`}
        title="¿Cómo funciona?"
        className={cn('text-muted-foreground hover:text-foreground', className)}
      >
        <QuestionIcon className="size-[1.125rem]" aria-hidden />
        {etiqueta && '¿Cómo funciona?'}
      </Button>
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="gap-1.5 border-b border-separator px-6 pt-6 pb-5">
            <p className="text-xs font-medium text-ocre-texto uppercase">Ayuda · {tema.grupo}</p>
            <SheetTitle className="text-xl font-semibold">{tema.titulo}</SheetTitle>
            <SheetDescription className="text-[0.9375rem]">{tema.resumen}</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <ContenidoTema tema={tema} alNavegar={() => setAbierto(false)} />
          </div>
          <div className="mt-auto border-t border-separator px-6 py-4">
            <Link to="/ayuda" onClick={() => setAbierto(false)} className="text-sm text-primary underline-offset-2 hover:underline">
              Ver toda la ayuda y la guía de primeros pasos
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
