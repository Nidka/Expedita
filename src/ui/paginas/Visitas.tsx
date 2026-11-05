import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardCopyIcon, MapPinIcon, SaveIcon } from 'lucide-react'
import { guardarResultadosVisita, programarVisitas } from '@/application/casos-uso/visitas'
import type { Visita } from '@/domain/entidades'
import { agruparPorJuzgado, DISTRITOS_LIMA, esSoloImpulso, hojaDeRuta, motivoVisita } from '@/domain/visitas/juzgados'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor, useDatos } from '../contexto'
import { Campo, EncabezadoPagina, EstadoVacio, Mono } from '../componentes/base'
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
      toast.success(`${plural(v.length, 'visita programada', 'visitas programadas')} para el ${fecha(fechaVisita)}`)
      setSel(new Set())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Distritos</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[...DISTRITOS_LIMA.filter((x) => presentes.includes(x)), ...presentes.filter((x) => !DISTRITOS_LIMA.includes(x)).sort()].map((dist) => (
                <Label key={dist} className="font-normal">
                  <Checkbox
                    checked={distritos.has(dist)}
                    onCheckedChange={(v) =>
                      setDistritos((s) => {
                        const n = new Set(s)
                        if (v) n.add(dist)
                        else n.delete(dist)
                        return n
                      })
                    }
                  />
                  {dist}
                </Label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <Input type="search" placeholder="Filtrar por código, cliente, juzgado…" aria-label="Filtrar expedientes" value={q} onChange={(e) => setQ(e.target.value)} />
            <Label className="font-normal">
              <Checkbox checked={soloPendientes} onCheckedChange={(v) => setSoloPendientes(Boolean(v))} />
              Solo con actuación pendiente concreta
            </Label>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {plural(grupos.length, 'juzgado', 'juzgados')} · {plural(total, 'expediente activo', 'expedientes activos')} · {sel.size} marcados
      </p>

      {grupos.length === 0 ? (
        <EstadoVacio titulo="No hay expedientes activos con estos filtros" />
      ) : (
        <div className="grid gap-3 pb-28">
          {grupos.map((g) => {
            const ids = g.expedientes.map((e) => e.id)
            const todos = ids.every((id) => sel.has(id))
            return (
              <Card key={g.clave} size="sm">
                <CardHeader>
                  <Label className="flex items-start gap-3">
                    <Checkbox checked={todos} onCheckedChange={(v) => alternar(ids, Boolean(v))} aria-label={`Marcar todo ${g.nombre}`} />
                    <span className="grid gap-0.5">
                      <CardTitle className="text-[0.9375rem] font-semibold">{g.nombre}</CardTitle>
                      <span className="text-xs font-normal text-muted-foreground">
                        {g.distrito} · {plural(g.expedientes.length, 'expediente', 'expedientes')}
                      </span>
                    </span>
                  </Label>
                  <SedeJuzgado clave={g.clave} nombre={g.nombre} sede={sedes.get(g.clave) ?? ''} />
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-2">
                    {g.expedientes.map((e) => (
                      <li key={e.id} className="flex gap-3 rounded-lg border p-2.5">
                        <Checkbox
                          checked={sel.has(e.id)}
                          onCheckedChange={(v) => alternar([e.id], Boolean(v))}
                          aria-label={`Marcar ${etiquetaExp(e)}`}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 text-sm">
                          <Link to={`/expedientes/${e.id}`} className="font-medium underline-offset-2 hover:underline">
                            {e.codigo && `${e.codigo} · `}
                            <Mono>{e.numero}</Mono>
                          </Link>
                          <p className="truncate text-muted-foreground">
                            {e.cliente ?? e.demandante ?? '—'}
                            {e.especialista ? ` · Esp. ${e.especialista}` : ''}
                          </p>
                          <p className="mt-0.5">{motivoVisita(e)}</p>
                          <p className="text-xs text-muted-foreground">
                            Última visita: {ultimaVisita.get(e.id) ? fecha(ultimaVisita.get(e.id)) : 'nunca'}
                            {enVisita.has(e.id) && ' · ya está en una visita programada'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
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

function SedeJuzgado({ clave, nombre, sede }: { clave: string; nombre: string; sede: string }) {
  const c = useContenedor()
  const [valor, setValor] = useState(sede)
  const guardar = async () => {
    if (valor === sede) return
    await c.juzgados.guardarSede(clave, nombre, valor)
    toast.success('Sede guardada')
  }
  return (
    <div className="flex items-center gap-2 pl-7">
      <MapPinIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={guardar}
        placeholder="Sede, dirección o piso"
        aria-label={`Sede de ${nombre}`}
        className="h-8"
      />
    </div>
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
      toast.success(n ? `${plural(n, 'acción registrada', 'acciones registradas')} en los historiales` : 'Resultados guardados')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-[0.9375rem] font-semibold">{visita.juzgado}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {visita.sede ? `${visita.sede} · ` : ''}
          {visita.responsable} · {visita.estado === 'realizada' ? 'Realizada' : 'Programada'}
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {visita.items.map((i) => {
          const e = d.expPorId.get(i.expedienteId)
          const b = borrador[i.id]
          return (
            <div key={i.id} className="grid gap-2 rounded-lg border p-3">
              <Label className="items-start font-normal">
                <Checkbox checked={b.hecho} onCheckedChange={(v) => set(i.id, { hecho: Boolean(v) })} className="mt-0.5" />
                <span>
                  <span className="font-medium">{etiquetaExp(e)}</span>
                  <span className="block text-sm text-muted-foreground">{i.motivo}</span>
                </span>
              </Label>
              {i.accionId ? (
                <p className="text-sm">
                  <span className="text-success">✓ Registrado:</span> {i.resultado}
                </p>
              ) : (
                <Textarea
                  rows={2}
                  value={b.resultado}
                  onChange={(ev) => set(i.id, { resultado: ev.target.value })}
                  placeholder="Resultado: qué dijo el especialista, qué falta…"
                  aria-label={`Resultado de ${etiquetaExp(e)}`}
                />
              )}
            </div>
          )
        })}
        {visita.estado === 'programada' && (
          <Button onClick={guardar} disabled={guardando} className="justify-self-start">
            <SaveIcon aria-hidden /> {guardando ? 'Guardando…' : 'Guardar resultados'}
          </Button>
        )}
      </CardContent>
    </Card>
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
