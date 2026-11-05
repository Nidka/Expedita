import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardCopyIcon, MapPinIcon } from 'lucide-react'
import { guardarResultadosVisita, programarVisitas } from '@/application/casos-uso/visitas'
import type { Visita } from '@/domain/entidades'
import { agruparPorJuzgado, DISTRITOS_LIMA, esSoloImpulso, hojaDeRuta, motivoVisita } from '@/domain/visitas/juzgados'
import { Button } from '@/components/ui/button'
import { exito } from '../notificar'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor, useDatos } from '../contexto'
import { Campo, Codigo, EncabezadoPagina, EstadoVacio, Lista, Mono } from '../componentes/base'
import { cn } from '@/lib/utils'
import { etiquetaExp, fecha, fechaLarga, plural } from '../formato'

function Planificar() {
  const c = useContenedor()
  const d = useDatos()
  const presentes = useMemo(() => [...new Set(d.expedientes.map((e) => e.distrito).filter(Boolean) as string[])], [d.expedientes])
  const [distritos, setDistritos] = useState(() => new Set(DISTRITOS_LIMA.filter((x) => presentes.includes(x))))
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [fechaVisita, setFechaVisita] = useState(() => d.calendario.sumarHabiles(d.hoy, 1))
  const [responsable, setResponsable] = useState(d.sesion.miembro.nombre)
  const [guardando, setGuardando] = useState(false)

  const ultimaVisita = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of d.acciones)
      if (a.tipo.startsWith('Visita') && (!m.get(a.expedienteId) || a.fecha > m.get(a.expedienteId)!)) m.set(a.expedienteId, a.fecha)
    return m
  }, [d.acciones])

  const sedes = useMemo(() => new Map(d.juzgados.map((j) => [j.clave, j.sede ?? ''])), [d.juzgados])
  const enVisita = useMemo(
    () => new Set(d.visitas.filter((v) => v.estado === 'programada').flatMap((v) => v.items.map((i) => i.expedienteId))),
    [d.visitas],
  )

  const busqueda = q.trim().toLowerCase()
  const grupos = useMemo(
    () =>
      agruparPorJuzgado(
        d.expedientes.filter(
          (e) =>
            e.estado === 'activo' &&
            distritos.has(e.distrito ?? '') &&
            (!soloPendientes || !esSoloImpulso(e.actuacionPendiente) || e.faltaRealizar === true) &&
            (!busqueda || [e.codigo, e.numero, e.cliente, e.demandante, e.demandado, e.organo, e.especialista].join(' ').toLowerCase().includes(busqueda)),
        ),
      ),
    [d.expedientes, distritos, soloPendientes, busqueda],
  )
  const total = grupos.reduce((n, g) => n + g.expedientes.length, 0)

  const alternar = (ids: string[], marcar: boolean) =>
    setSel((s) => {
      const n = new Set(s)
      ids.forEach((id) => (marcar ? n.add(id) : n.delete(id)))
      return n
    })

  const programar = async () => {
    setGuardando(true)
    try {
      const v = await programarVisitas(c, {
        expedientes: d.expedientes.filter((e) => sel.has(e.id)),
        fecha: fechaVisita,
        responsable,
        sedes,
      })
      exito(`${plural(v.length, 'visita programada', 'visitas programadas')} para el ${fecha(fechaVisita)}`, { pose: 'caminando' })
      setSel(new Set())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4">
        <div role="group" aria-label="Distritos" className="flex flex-wrap gap-2">
          {[...DISTRITOS_LIMA.filter((x) => presentes.includes(x)), ...presentes.filter((x) => !DISTRITOS_LIMA.includes(x)).sort()].map((dist) => {
            const on = distritos.has(dist)
            return (
              <button
                key={dist}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setDistritos((s) => {
                    const n = new Set(s)
                    if (on) n.delete(dist)
                    else n.add(dist)
                    return n
                  })
                }
                className={cn(
                  'h-9 rounded-full px-3.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/25',
                  on ? 'bg-primary font-medium text-primary-foreground' : 'bg-card text-foreground shadow-[0_0_0_1px_var(--border)] hover:bg-muted',
                )}
              >
                {dist}
              </button>
            )
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Input type="search" placeholder="Filtrar por código, cliente o juzgado" aria-label="Filtrar expedientes" value={q} onChange={(e) => setQ(e.target.value)} />
          <Label className="font-normal text-muted-foreground">
            <Checkbox checked={soloPendientes} onCheckedChange={(v) => setSoloPendientes(Boolean(v))} />
            Solo con actuación pendiente
          </Label>
        </div>
      </div>

      <p className="px-1 text-sm text-muted-foreground" aria-live="polite">
        {plural(grupos.length, 'juzgado', 'juzgados')} · {plural(total, 'expediente activo', 'expedientes activos')}
        {sel.size > 0 && ` · ${sel.size} marcados`}
      </p>

      {grupos.length === 0 ? (
        <EstadoVacio pose="pensando" titulo="No hay expedientes activos con estos filtros" />
      ) : (
        <div className="grid gap-10 pb-28">
          {grupos.map((g) => {
            const ids = g.expedientes.map((e) => e.id)
            const todos = ids.every((id) => sel.has(id))
            return (
              <section key={g.clave} aria-label={g.nombre} className="grid gap-3">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-1 px-1">
                  <Label className="flex min-w-0 flex-1 items-start gap-3">
                    <Checkbox checked={todos} onCheckedChange={(v) => alternar(ids, Boolean(v))} aria-label={`Marcar todo ${g.nombre}`} className="mt-1" />
                    <span className="grid gap-0.5">
                      <span className="text-[1.0625rem] font-semibold">{g.nombre}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {g.distrito} · {plural(g.expedientes.length, 'expediente', 'expedientes')}
                      </span>
                    </span>
                  </Label>
                  <SedeJuzgado clave={g.clave} nombre={g.nombre} sede={sedes.get(g.clave) ?? ''} />
                </div>
                <Lista>
                  {g.expedientes.map((e) => (
                    <li key={e.id} className="border-b border-separator last:border-b-0">
                      <label className="flex cursor-pointer gap-4 px-5 py-4 hover:bg-muted/50">
                        <Checkbox
                          checked={sel.has(e.id)}
                          onCheckedChange={(v) => alternar([e.id], Boolean(v))}
                          aria-label={`Marcar ${etiquetaExp(e)}`}
                          className="mt-0.5"
                        />
                        <span className="grid min-w-0 gap-1 text-sm">
                          <span className="flex flex-wrap items-center gap-2">
                            {e.codigo && <Codigo>{e.codigo}</Codigo>}
                            <Link to={`/expedientes/${e.id}`} className="underline-offset-2 hover:underline" onClick={(ev) => ev.stopPropagation()}>
                              <Mono>{e.numero}</Mono>
                            </Link>
                          </span>
                          <span className="truncate text-muted-foreground">
                            {e.cliente ?? e.demandante ?? '—'}
                            {e.especialista ? ` · Esp. ${e.especialista}` : ''}
                          </span>
                          <span>{motivoVisita(e)}</span>
                          <span className="text-xs text-muted-foreground">
                            Última visita: {ultimaVisita.get(e.id) ? fecha(ultimaVisita.get(e.id)) : 'nunca'}
                            {enVisita.has(e.id) && ' · ya está en una visita programada'}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </Lista>
              </section>
            )
          })}
        </div>
      )}

      {sel.size > 0 && (
        <div className="material fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t p-3 md:bottom-0 md:left-(--sidebar-width)">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-3">
            <Campo etiqueta="Fecha de visita">
              {(p) => <Input {...p} type="date" value={fechaVisita} min={d.hoy} onChange={(e) => setFechaVisita(e.target.value)} />}
            </Campo>
            <Campo etiqueta="¿Quién va?">
              {(p) => <Input {...p} value={responsable} onChange={(e) => setResponsable(e.target.value)} />}
            </Campo>
            <Button onClick={programar} disabled={guardando}>
              {guardando ? 'Programando…' : `Programar visita (${sel.size})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Sede del juzgado: texto discreto que se edita en línea. */
function SedeJuzgado({ clave, nombre, sede }: { clave: string; nombre: string; sede: string }) {
  const c = useContenedor()
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(sede)
  const guardar = async () => {
    setEditando(false)
    if (valor.trim() === sede) return
    await c.juzgados.guardarSede(clave, nombre, valor)
    toast.success('Sede guardada')
  }
  if (editando)
    return (
      <Input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void guardar()
          if (e.key === 'Escape') {
            setValor(sede)
            setEditando(false)
          }
        }}
        placeholder="Sede, dirección o piso"
        aria-label={`Sede de ${nombre}`}
        className="h-9 w-full sm:w-72"
      />
    )
  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
      aria-label={sede ? `Editar sede de ${nombre}: ${sede}` : `Agregar sede de ${nombre}`}
    >
      <MapPinIcon className="size-4" aria-hidden />
      {sede || 'Agregar sede'}
    </button>
  )
}

function VisitaProgramada({ visita }: { visita: Visita }) {
  const c = useContenedor()
  const d = useDatos()
  // Borrador local: lo escrito se conserva aunque otro usuario guarde algo mientras tanto (RNF-09).
  const [borrador, setBorrador] = useState<Record<string, { resultado: string; hecho: boolean }>>(() =>
    Object.fromEntries(visita.items.map((i) => [i.id, { resultado: i.resultado ?? '', hecho: i.hecho }])),
  )
  const [guardando, setGuardando] = useState(false)
  const set = (id: string, cambio: Partial<{ resultado: string; hecho: boolean }>) =>
    setBorrador((b) => ({ ...b, [id]: { ...b[id], ...cambio } }))

  const guardar = async () => {
    setGuardando(true)
    try {
      const n = await guardarResultadosVisita(c, visita, borrador)
      exito(n ? `${plural(n, 'acción registrada', 'acciones registradas')} en los historiales` : 'Resultados guardados', { pose: 'feliz' })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section aria-label={visita.juzgado} className="grid gap-3">
      <div className="px-1">
        <h4 className="text-[1.0625rem] font-semibold">{visita.juzgado}</h4>
        <p className="text-sm text-muted-foreground">
          {visita.sede ? `${visita.sede} · ` : ''}
          {visita.responsable} · {visita.estado === 'realizada' ? 'Realizada' : 'Programada'}
        </p>
      </div>
      <Lista>
        {visita.items.map((i) => {
          const e = d.expPorId.get(i.expedienteId)
          const b = borrador[i.id]
          return (
            <li key={i.id} className="grid gap-3 border-b border-separator px-5 py-4 last:border-b-0">
              <Label className="items-start gap-4 font-normal">
                <Checkbox checked={b.hecho} onCheckedChange={(v) => set(i.id, { hecho: Boolean(v) })} className="mt-0.5" aria-label={`Visitado: ${etiquetaExp(e)}`} />
                <span className="grid gap-0.5">
                  <span className="font-medium">{etiquetaExp(e)}</span>
                  <span className="text-sm text-muted-foreground">{i.motivo}</span>
                </span>
              </Label>
              {i.accionId ? (
                <p className="pl-8 text-sm">
                  <span className="font-medium text-success">Registrado:</span> {i.resultado}
                </p>
              ) : (
                <Textarea
                  rows={2}
                  className="ml-8 w-[calc(100%-2rem)]"
                  value={b.resultado}
                  onChange={(ev) => set(i.id, { resultado: ev.target.value })}
                  placeholder="Resultado: qué dijo el especialista, qué falta…"
                  aria-label={`Resultado de ${etiquetaExp(e)}`}
                />
              )}
            </li>
          )
        })}
      </Lista>
      {visita.estado === 'programada' && (
        <Button onClick={guardar} disabled={guardando} className="justify-self-start">
          {guardando ? 'Guardando…' : 'Guardar resultados'}
        </Button>
      )}
    </section>
  )
}

function Programadas() {
  const d = useDatos()
  const porFecha = useMemo(() => {
    const m = new Map<string, Visita[]>()
    for (const v of [...d.visitas].sort((a, b) => b.fecha.localeCompare(a.fecha))) m.set(v.fecha, [...(m.get(v.fecha) ?? []), v])
    return [...m.entries()]
  }, [d.visitas])

  const copiar = async (f: string, visitas: Visita[]) => {
    const texto = hojaDeRuta(
      fecha(f),
      visitas.map((v) => ({
        juzgado: v.juzgado,
        sede: v.sede,
        responsable: v.responsable,
        items: v.items.map((i) => {
          const e = d.expPorId.get(i.expedienteId)
          return { codigo: e?.codigo, numero: e?.numero ?? '', motivo: i.motivo }
        }),
      })),
    )
    try {
      await navigator.clipboard.writeText(texto)
      toast.success('Hoja de ruta copiada', { description: 'Pégala en WhatsApp.' })
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  if (!porFecha.length) return <EstadoVacio titulo="No hay visitas programadas">Marca expedientes en «Planificar» y elige la fecha.</EstadoVacio>
  return (
    <div className="grid gap-10">
      {porFecha.map(([f, visitas]) => (
        <section key={f} aria-labelledby={`dia-${f}`} className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id={`dia-${f}`} className="text-lg font-semibold">
              {fechaLarga(f)}
            </h3>
            <Button variant="outline" size="sm" onClick={() => copiar(f, visitas)}>
              <ClipboardCopyIcon aria-hidden /> Copiar hoja de ruta
            </Button>
          </div>
          {visitas.map((v) => (
            <VisitaProgramada key={v.id} visita={v} />
          ))}
        </section>
      ))}
    </div>
  )
}

export function Visitas() {
  return (
    <>
      <EncabezadoPagina titulo="Visitas a juzgados" descripcion="Agrupa los expedientes por juzgado, programa la ruta y registra lo que encuentres." />
      <Tabs defaultValue="planificar">
        <TabsList>
          <TabsTrigger value="planificar">Planificar</TabsTrigger>
          <TabsTrigger value="programadas">Programadas</TabsTrigger>
        </TabsList>
        <TabsContent value="planificar" className="mt-4">
          <Planificar />
        </TabsContent>
        <TabsContent value="programadas" className="mt-4">
          <Programadas />
        </TabsContent>
      </Tabs>
    </>
  )
}
