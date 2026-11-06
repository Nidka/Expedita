import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { registrarAccion } from '@/application/casos-uso/acciones'
import { colaRonda, URL_CEJ, type ItemRonda } from '@/domain/agenda/seguimiento'
import { parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CheckIcon, CopyIcon, ExternalLinkIcon, PenLineIcon, SkipIcon } from '@/ui/iconos'
import { Tecla } from '../atajos'
import { useContenedor, useDatos } from '../contexto'
import { BotonEnlace, Codigo, EncabezadoPagina, EstadoVacio, Mono, SelectNativo } from '../componentes/base'
import { BarraProgreso } from './PrimerosPasos'
import { fecha, partes, plural } from '../formato'

const CLAVE_RESPONSABLE = 'expedita.responsable'

type Resultado = 'sin-novedad' | 'novedad' | 'saltado'

/** Campos del formulario del CEJ, en el orden en que se llenan. */
function camposCej(numero: string) {
  const n = parsearNumeroExpediente(numero)
  if (!n) return []
  return [
    ['Número', n.numero],
    ['Año', n.anio],
    ['Incidente', n.incidente],
    ['Distrito', n.distrito],
    ['Instancia', n.instancia],
    ['Especialidad', n.especialidad],
    ['Juzgado', n.juzgado],
  ] as const
}

async function copiar(texto: string, aviso = 'Copiado') {
  try {
    await navigator.clipboard.writeText(texto)
    toast.success(aviso, { duration: 1500 })
  } catch {
    toast.error('No se pudo copiar')
  }
}

/**
 * Ronda de revisión en el CEJ: un expediente a la vez, con el número ya separado en los campos
 * del buscador, y un clic para dejar constancia. El captcha lo resuelve la persona; no se automatiza.
 */
export function Ronda() {
  const c = useContenedor()
  const d = useDatos()
  const [cadaDias, setCadaDias] = useState(7)
  const [carpeta, setCarpeta] = useState('')
  // La cola se fija al empezar: registrar una revisión no debe reordenar lo que falta.
  const [cola, setCola] = useState<ItemRonda[] | null>(null)
  const [indice, setIndice] = useState(0)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [novedad, setNovedad] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const areaNovedad = useRef<HTMLTextAreaElement>(null)

  const carpetas = useMemo(
    () => [...new Set(d.expedientes.filter((e) => e.estado === 'activo' && e.materia).map((e) => e.materia!))].sort((a, b) => a.localeCompare(b, 'es')),
    [d.expedientes],
  )
  const candidatos = useMemo(
    () => colaRonda(carpeta ? d.expedientes.filter((e) => e.materia === carpeta) : d.expedientes, d.hoy, cadaDias),
    [d.expedientes, d.hoy, cadaDias, carpeta],
  )

  const actual = cola?.[indice]
  const exp = actual ? (d.expPorId.get(actual.exp.id) ?? actual.exp) : undefined
  const campos = exp ? camposCej(exp.numero) : []
  const ultimaAccion = useMemo(
    () => (exp ? d.acciones.filter((a) => a.expedienteId === exp.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0] : undefined),
    [d.acciones, exp],
  )
  const responsable = () => {
    try {
      return localStorage.getItem(CLAVE_RESPONSABLE) || d.sesion.miembro.nombre
    } catch {
      return d.sesion.miembro.nombre
    }
  }

  const avanzar = (r: Resultado) => {
    setResultados((x) => [...x, r])
    setNovedad(null)
    setIndice((i) => i + 1)
  }

  const registrar = async (conNovedad: boolean) => {
    if (!exp || guardando) return
    const texto = conNovedad ? (novedad ?? '').trim() : 'Revisión en CEJ: sin novedad.'
    if (conNovedad && !texto) return areaNovedad.current?.focus()
    setGuardando(true)
    try {
      await registrarAccion(c, {
        expedienteId: exp.id,
        fecha: d.hoy,
        tipo: 'Revisión en CEJ',
        descripcion: conNovedad ? `Revisión en CEJ: ${texto}` : texto,
        responsable: responsable(),
        origen: 'cej',
        // Sin novedad no cumple lo pendiente: lo que se esperaba aún no ocurre.
        cumplirProximas: conNovedad,
      })
      avanzar(conNovedad ? 'novedad' : 'sin-novedad')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  // Atajos de la ronda: S sin novedad, H hubo novedad, → saltar, C copiar número
  const registrarRef = useRef(registrar)
  registrarRef.current = registrar
  useEffect(() => {
    if (!exp) return
    const alPulsar = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || t.closest('input, textarea, select, [contenteditable]')) return
      const k = e.key.toLowerCase()
      if (k === 's') (e.preventDefault(), void registrarRef.current(false))
      else if (k === 'h') (e.preventDefault(), setNovedad(''), setTimeout(() => areaNovedad.current?.focus(), 0))
      else if (e.key === 'ArrowRight') (e.preventDefault(), avanzar('saltado'))
      else if (k === 'c') (e.preventDefault(), void copiar(exp.numero, 'Número copiado'))
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [exp])

  const encabezado = (
    <EncabezadoPagina
      titulo="Ronda de revisión en el CEJ"
      descripcion="Un expediente a la vez: abre el CEJ, revisa y deja constancia con un clic. Las revisiones quedan en el historial de cada expediente."
    />
  )

  // ---------- Inicio ----------
  if (!cola) {
    return (
      <>
        {encabezado}
        <section className="grid max-w-2xl gap-6 rounded-xl bg-card p-6 shadow-[0_0_0_1px_var(--border)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-[0.8125rem] font-medium">
              Revisar los que no se ven hace
              <SelectNativo value={cadaDias} onChange={(e) => setCadaDias(Number(e.target.value))}>
                <option value={1}>1 día o más</option>
                <option value={3}>3 días o más</option>
                <option value={7}>1 semana o más</option>
                <option value={15}>15 días o más</option>
                <option value={30}>1 mes o más</option>
              </SelectNativo>
            </label>
            <label className="grid gap-1.5 text-[0.8125rem] font-medium">
              Carpeta
              <SelectNativo value={carpeta} onChange={(e) => setCarpeta(e.target.value)}>
                <option value="">Todas</option>
                {carpetas.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </SelectNativo>
            </label>
          </div>
          {candidatos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos los expedientes de esta selección se revisaron en ese periodo.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{plural(candidatos.length, 'expediente', 'expedientes')}</span> por revisar
              {candidatos.some((i) => i.dias === undefined) && `, ${candidatos.filter((i) => i.dias === undefined).length} nunca revisados`}. Primero los
              que llevan más tiempo sin revisión.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!candidatos.length} onClick={() => (setCola(candidatos), setIndice(0), setResultados([]))}>
              Empezar ronda
            </Button>
            <span className="text-xs text-muted-foreground">
              Atajos: <Tecla>S</Tecla> sin novedad · <Tecla>H</Tecla> hubo novedad · <Tecla>→</Tecla> saltar · <Tecla>C</Tecla> copiar número
            </span>
          </div>
        </section>
      </>
    )
  }

  // ---------- Fin ----------
  if (!exp) {
    const n = (r: Resultado) => resultados.filter((x) => x === r).length
    return (
      <>
        {encabezado}
        <EstadoVacio
          pose="feliz"
          titulo="Ronda terminada"
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <BotonEnlace a="/">Volver a Hoy</BotonEnlace>
              <Button variant="outline" onClick={() => setCola(null)}>
                Otra ronda
              </Button>
            </div>
          }
        >
          {plural(n('sin-novedad'), 'sin novedad', 'sin novedad')} · {plural(n('novedad'), 'con novedad', 'con novedad')} ·{' '}
          {plural(n('saltado'), 'saltado', 'saltados')}.
        </EstadoVacio>
      </>
    )
  }

  // ---------- Expediente actual ----------
  return (
    <>
      {encabezado}
      <div className="grid max-w-3xl gap-6">
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium tabular">
              {indice + 1} de {cola.length}
            </span>
            <button type="button" className="text-muted-foreground hover:text-foreground hover:underline" onClick={() => setIndice(cola.length)}>
              Terminar aquí
            </button>
          </div>
          <BarraProgreso hechos={indice} total={cola.length} />
        </div>

        <section key={exp.id} className="grid animate-entrar gap-6 rounded-xl bg-card p-5 shadow-[0_0_0_1px_var(--border)] sm:p-6" aria-live="polite">
          <header className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {exp.codigo && <Codigo>{exp.codigo}</Codigo>}
              <Link to={`/expedientes/${exp.id}`} className="font-semibold hover:underline">
                {partes(exp)}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              {exp.organo ?? 'Juzgado sin registrar'} ·{' '}
              {actual!.dias === undefined ? 'nunca revisado en el CEJ' : `última revisión ${fecha(exp.ultimaRevisionCej)} (hace ${actual!.dias} días)`}
            </p>
            {ultimaAccion && (
              <p className="text-sm text-muted-foreground">
                Última acción: <span className="text-foreground">{ultimaAccion.tipo}</span> · {fecha(ultimaAccion.fecha)}
              </p>
            )}
          </header>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Mono className="text-base">{exp.numero}</Mono>
              <Button size="sm" variant="outline" onClick={() => void copiar(exp.numero, 'Número copiado')}>
                <CopyIcon aria-hidden /> Copiar
              </Button>
              <Button size="sm" variant="outline" nativeButton={false} render={<a href={URL_CEJ} target="cej" rel="noopener noreferrer" />}>
                <ExternalLinkIcon aria-hidden /> Abrir CEJ
              </Button>
            </div>
            {campos.length > 0 && (
              <dl className="grid grid-cols-3 gap-2 sm:grid-cols-7" aria-label="Campos para el buscador del CEJ">
                {campos.map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => void copiar(v, `${k} copiado`)}
                    className="grid gap-0.5 rounded-lg bg-muted/60 px-2.5 py-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/25"
                    title={`Copiar ${k.toLowerCase()}`}
                  >
                    <dt className="truncate text-[0.6875rem] text-muted-foreground">{k}</dt>
                    <dd className="tabular font-semibold">{v}</dd>
                  </button>
                ))}
              </dl>
            )}
          </div>

          {novedad !== null && (
            <div className="grid animate-entrar gap-2">
              <label htmlFor="novedad" className="text-[0.8125rem] font-medium">
                ¿Qué novedad hay?
              </label>
              <Textarea
                id="novedad"
                ref={areaNovedad}
                rows={3}
                value={novedad}
                onChange={(e) => setNovedad(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void registrar(true)
                  if (e.key === 'Escape') setNovedad(null)
                }}
                placeholder="Ej.: Resolución N.° 8 que programa audiencia de juzgamiento, pendiente de notificar."
              />
              <p className="text-xs text-muted-foreground">
                Se guarda como revisión en el CEJ y cumple las próximas acciones abiertas. Si hay que hacer algo más, usa «Registrar acción completa».
              </p>
            </div>
          )}

          <div className={cn('flex flex-wrap gap-2 border-t border-separator pt-5')}>
            {novedad === null ? (
              <>
                <Button onClick={() => void registrar(false)} disabled={guardando}>
                  <CheckIcon aria-hidden /> Sin novedad
                </Button>
                <Button variant="outline" onClick={() => (setNovedad(''), setTimeout(() => areaNovedad.current?.focus(), 0))}>
                  <PenLineIcon aria-hidden /> Hubo novedad
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => void registrar(true)} disabled={guardando || !novedad.trim()}>
                  {guardando ? 'Guardando…' : 'Guardar y seguir'}
                </Button>
                <BotonEnlace a={`/registrar?exp=${exp.id}&tipo=${encodeURIComponent('Revisión en CEJ')}`} variant="outline">
                  Registrar acción completa
                </BotonEnlace>
              </>
            )}
            <Button variant="ghost" className="ml-auto" onClick={() => avanzar('saltado')}>
              Saltar <SkipIcon aria-hidden />
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
