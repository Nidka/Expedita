import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, ChevronDownIcon, CompassIcon, SearchIcon } from '@/ui/iconos'
import { TEXTO_PASO } from '../ayuda/pasos'
import { TEMAS, type Tema } from '../ayuda/temas'
import { ContenidoTema } from '../componentes/Ayuda'
import { BotonEnlace, EncabezadoPagina } from '../componentes/base'
import { Michi } from '../componentes/marca'
import { abrirRecorrido, useGuia } from '../guia'
import { BarraProgreso } from './PrimerosPasos'

const PREGUNTAS: [string, string][] = [
  [
    '¿Dónde están guardados los datos?',
    'En una base de datos privada del estudio (Supabase), con acceso solo para las personas del equipo. Cada noche se guarda una copia de seguridad cifrada. Nadie de otro estudio puede ver nada.',
  ],
  [
    '¿Expedita entra al SINOE o al CEJ con mi usuario?',
    'No. No guarda contraseñas del Poder Judicial ni resuelve captchas. Lee los avisos que ya llegan a tu Gmail y te prepara la consulta del CEJ para que la hagas tú.',
  ],
  [
    '¿Qué pasa si me equivoco al registrar algo?',
    'Toda acción se puede editar. Si la eliminas, la notificación que atendía vuelve a quedar pendiente. Los administradores ven el historial de cambios en Ajustes → Actividad.',
  ],
  ['¿Funciona en el celular?', 'Sí, desde el navegador, sin instalar nada. En el celular las secciones principales están en la barra de abajo y el resto en «Más».'],
  ['¿Puedo trabajar al mismo tiempo que mis compañeros?', 'Sí. Lo que guarda cada persona aparece en las pantallas de los demás en segundos, sin recargar.'],
  ['¿Cómo busco algo rápido?', 'Pulsa Ctrl + K (o la lupa de arriba) y escribe código, número, cliente o el nombre de una sección.'],
]

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const textoDe = (t: Tema) => normalizar([t.titulo, t.resumen, ...t.secciones.flatMap((s) => [s.titulo, s.texto, ...(s.pasos ?? []), ...(s.lista ?? [])])].join(' '))

export function CentroAyuda() {
  const g = useGuia()
  const { hash } = useLocation()
  const [q, setQ] = useState('')
  const [abierto, setAbierto] = useState<string | undefined>(hash.slice(1) || undefined)

  // Un enlace como /ayuda#plazos abre ese tema y lo lleva a la vista
  useEffect(() => {
    const id = hash.slice(1)
    if (!id) return
    setAbierto(id)
    requestAnimationFrame(() => document.getElementById(`tema-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [hash])

  const filtrados = useMemo(() => {
    const b = normalizar(q.trim())
    return b ? TEMAS.filter((t) => textoDe(t).includes(b)) : TEMAS
  }, [q])
  const grupos = [...new Set(filtrados.map((t) => t.grupo))]

  return (
    <>
      <EncabezadoPagina titulo="Ayuda" descripcion="Cómo funciona cada parte de Expedita, paso a paso." />

      <div className="mb-10 grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl bg-card p-6 shadow-[0_0_0_1px_var(--border)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[1.0625rem] font-semibold">Primeros pasos</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {g.completo || !g.siguiente ? 'Completado. Puedes repasar cualquier paso.' : `${g.hechos} de ${g.total} listos. Siguiente: ${TEXTO_PASO[g.siguiente.id].titulo.toLowerCase()}.`}
              </p>
            </div>
          </div>
          <BarraProgreso hechos={g.hechos} total={g.total} />
          <BotonEnlace a="/primeros-pasos" className="mt-auto self-start">
            {g.completo ? 'Ver la guía' : 'Continuar la guía'} <ArrowRightIcon aria-hidden />
          </BotonEnlace>
        </section>
        <section className="flex items-center gap-5 rounded-xl bg-card p-6 shadow-[0_0_0_1px_var(--border)]">
          <Michi pose="saludando" className="size-20 shrink-0" />
          <div className="grid gap-3">
            <div>
              <h2 className="text-[1.0625rem] font-semibold">Recorrido de 1 minuto</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Dónde está cada cosa y qué hace, en cuatro pasos.</p>
            </div>
            <Button variant="outline" onClick={abrirRecorrido} className="self-start">
              <CompassIcon aria-hidden /> Ver el recorrido
            </Button>
          </div>
        </section>
      </div>

      <div className="relative mb-8 max-w-xl">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca: plazos, casilla, membrete, invitar…" aria-label="Buscar en la ayuda" className="pl-9" />
      </div>

      {!filtrados.length && <p className="mb-10 text-sm text-muted-foreground">No hay temas con «{q}». Prueba con otra palabra.</p>}

      <div className="grid gap-10">
        {grupos.map((grupo) => (
          <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="grid gap-3">
            <h2 id={`grupo-${grupo}`} className="px-1 text-sm font-semibold text-muted-foreground">
              {grupo}
            </h2>
            <ul className="grid gap-2">
              {filtrados
                .filter((t) => t.grupo === grupo)
                .map((t) => {
                  const esteAbierto = abierto === t.id || Boolean(q.trim())
                  return (
                    <li key={t.id} id={`tema-${t.id}`} className="scroll-mt-24 overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)]">
                      <button
                        type="button"
                        aria-expanded={esteAbierto}
                        onClick={() => setAbierto(abierto === t.id ? undefined : t.id)}
                        className="flex w-full items-center gap-4 px-5 py-4 text-left outline-none focus-visible:bg-muted/60"
                      >
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="font-medium">{t.titulo}</span>
                          <span className="text-sm text-muted-foreground">{t.resumen}</span>
                        </span>
                        <ChevronDownIcon className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200', esteAbierto && 'rotate-180')} aria-hidden />
                      </button>
                      {esteAbierto && (
                        <div className="animate-entrar border-t border-separator px-5 py-5">
                          <ContenidoTema tema={t} />
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          </section>
        ))}

        {!q.trim() && (
          <section aria-labelledby="preguntas" className="grid gap-3">
            <h2 id="preguntas" className="px-1 text-sm font-semibold text-muted-foreground">
              Preguntas frecuentes
            </h2>
            <dl className="grid divide-y divide-separator rounded-xl bg-card px-5 shadow-[0_0_0_1px_var(--border)]">
              {PREGUNTAS.map(([p, r]) => (
                <div key={p} className="grid gap-1 py-4">
                  <dt className="font-medium">{p}</dt>
                  <dd className="text-[0.9375rem] text-muted-foreground">{r}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </>
  )
}
