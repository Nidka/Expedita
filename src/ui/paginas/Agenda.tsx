import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarPlusIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, ExternalLinkIcon, PencilIcon } from 'lucide-react'
import { descargar, enlaceGoogleCalendar, generarICS, type EventoAgenda } from '@/application/exportar'
import { TIPOS_AUDIENCIA, type Audiencia, type EstadoAudiencia, type ModalidadAudiencia, type TipoAudiencia } from '@/domain/entidades'
import { aDate, aISO, diaSemana, sumarDias, type FechaISO } from '@/domain/shared/fecha'
import { buscarActo } from '@/domain/plazos/catalogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useContenedor, useDatos, type Datos } from '../contexto'
import { Campo, EncabezadoPagina, EstadoVacio, SelectNativo } from '../componentes/base'
import { SelectorExpediente } from '../componentes/SelectorExpediente'
import { etiquetaExp, fecha, fechaLarga, mes } from '../formato'
import { exito } from '../notificar'

type Clase = 'plazo' | 'vencido' | 'audiencia' | 'visita' | 'proxima'
interface ItemDia extends EventoAgenda {
  clase: Clase
  enlace?: string
}

const ESTILO: Record<Clase, string> = {
  vencido: 'bg-destructive/15 text-destructive',
  plazo: 'bg-warning/30 text-warning-foreground dark:text-warning',
  proxima: 'bg-secondary text-secondary-foreground',
  audiencia: 'bg-primary text-primary-foreground',
  visita: 'bg-info-soft text-info-foreground',
}
const LEYENDA: [Clase, string][] = [
  ['vencido', 'Plazo vencido'],
  ['plazo', 'Plazo'],
  ['proxima', 'Próxima acción'],
  ['audiencia', 'Audiencia'],
  ['visita', 'Visita'],
]

function eventos(d: Datos): ItemDia[] {
  const out: ItemDia[] = []
  for (const n of d.notificaciones) {
    if (n.estado !== 'pendiente' || !n.vencimiento) continue
    const exp = n.expedienteId ? d.expPorId.get(n.expedienteId) : undefined
    const acto = n.actoId ? buscarActo(n.actoId) : undefined
    out.push({
      uid: `n-${n.id}`,
      clase: n.vencimiento < d.hoy ? 'vencido' : 'plazo',
      titulo: `Vence: ${acto?.nombre ?? n.asunto} · ${exp?.codigo ?? n.numero}`,
      descripcion: `${n.asunto}\nExpediente ${n.numero}${acto ? `\n${acto.norma}` : ''}`,
      fecha: n.vencimiento,
      enlace: exp ? `/expedientes/${exp.id}` : '/bandeja',
    })
  }
  for (const a of d.acciones) {
    if (!a.proximaFecha || a.proximaCumplida || !a.proxima) continue
    const exp = d.expPorId.get(a.expedienteId)
    out.push({
      uid: `p-${a.id}`,
      clase: a.proximaFecha < d.hoy ? 'vencido' : 'proxima',
      titulo: `${a.proxima} · ${exp?.codigo ?? exp?.numero ?? ''}`,
      descripcion: `Expediente ${exp?.numero ?? ''}\nÚltima acción: ${a.tipo}`,
      fecha: a.proximaFecha,
      enlace: `/expedientes/${a.expedienteId}`,
    })
  }
  for (const au of d.audiencias) {
    if (au.estado !== 'programada') continue
    const exp = d.expPorId.get(au.expedienteId)
    out.push({
      uid: `a-${au.id}`,
      clase: 'audiencia',
      titulo: `Audiencia de ${au.tipo.toLowerCase()} · ${exp?.codigo ?? exp?.numero ?? ''}`,
      descripcion: `Expediente ${exp?.numero ?? ''}\nModalidad: ${au.modalidad}${au.responsable ? `\nAbogado: ${au.responsable}` : ''}`,
      fecha: au.fecha,
      hora: au.hora,
      lugar: au.lugar,
      enlace: `/expedientes/${au.expedienteId}`,
    })
  }
  for (const v of d.visitas) {
    if (v.estado !== 'programada') continue
    out.push({ uid: `v-${v.id}`, clase: 'visita', titulo: `Visita: ${v.juzgado}`, fecha: v.fecha, lugar: v.sede, enlace: '/visitas' })
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))
}

function Calendario({ items }: { items: ItemDia[] }) {
  const d = useDatos()
  const [primero, setPrimero] = useState(() => d.hoy.slice(0, 8) + '01')
  const porDia = useMemo(() => {
    const m = new Map<string, ItemDia[]>()
    for (const i of items) m.set(i.fecha, [...(m.get(i.fecha) ?? []), i])
    return m
  }, [items])

  const desplazamiento = (diaSemana(primero) + 6) % 7 // lunes = 0
  const inicio = sumarDias(primero, -desplazamiento)
  const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i))
  const mesActual = primero.slice(0, 7)
  const cambiarMes = (delta: number) => {
    const f = aDate(primero)
    f.setUTCMonth(f.getUTCMonth() + delta)
    setPrimero(aISO(f))
  }
  const delMes = dias.filter((f) => f.startsWith(mesActual) && (porDia.get(f)?.length || !d.calendario.esHabil(f)))

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold" aria-live="polite">
            {mes(primero)}
          </h2>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPrimero(d.hoy.slice(0, 8) + '01')}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        {/* Escritorio: cuadrícula mensual */}
        <div className="hidden md:block" role="grid" aria-label={`Calendario de ${mes(primero)}`}>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground" role="row">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((n) => (
              <div key={n} role="columnheader" className="py-1">
                {n}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
            {dias.map((f) => {
              const fuera = !f.startsWith(mesActual)
              const inhabil = !d.calendario.esHabil(f)
              const motivo = d.calendario.motivoInhabil(f)
              const lista = porDia.get(f) ?? []
              return (
                <div
                  key={f}
                  role="gridcell"
                  aria-label={`${fechaLarga(f)}${motivo ? `, ${motivo}` : ''}${lista.length ? `, ${lista.length} eventos` : ''}`}
                  className={cn(
                    'min-h-24 border-r border-b p-1.5 text-xs [&:nth-child(7n)]:border-r-0',
                    fuera && 'bg-muted/40 text-muted-foreground',
                    inhabil && !fuera && 'bg-muted/70',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'grid size-6 place-items-center rounded-full tabular-nums',
                        f === d.hoy && 'bg-primary font-semibold text-primary-foreground',
                      )}
                    >
                      {Number(f.slice(8))}
                    </span>
                    {motivo && (
                      <span className="truncate text-[10px] text-muted-foreground" title={motivo}>
                        {motivo}
                      </span>
                    )}
                  </div>
                  <ul className="grid gap-0.5">
                    {lista.slice(0, 3).map((i) => (
                      <li key={i.uid}>
                        <Link to={i.enlace ?? '#'} className={cn('block truncate rounded px-1 py-0.5 hover:opacity-80', ESTILO[i.clase])} title={i.titulo}>
                          {i.hora ? `${i.hora} ` : ''}
                          {i.titulo}
                        </Link>
                      </li>
                    ))}
                    {lista.length > 3 && <li className="px-1 text-muted-foreground">+{lista.length - 3} más</li>}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {/* Celular: lista de días con eventos */}
        <ol className="grid gap-3 md:hidden">
          {delMes.length === 0 && <li className="text-sm text-muted-foreground">Sin eventos este mes.</li>}
          {delMes.map((f) => (
            <li key={f}>
              <p className={cn('text-sm font-medium', f === d.hoy && 'text-primary')}>
                {fechaLarga(f)}
                {d.calendario.motivoInhabil(f) && <span className="ml-2 text-xs text-muted-foreground">({d.calendario.motivoInhabil(f)})</span>}
              </p>
              <ul className="mt-1 grid gap-1">
                {(porDia.get(f) ?? []).map((i) => (
                  <li key={i.uid}>
                    <Link to={i.enlace ?? '#'} className={cn('block rounded-md px-2 py-1.5 text-sm', ESTILO[i.clase])}>
                      {i.hora ? `${i.hora} · ` : ''}
                      {i.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <ul className="flex flex-wrap gap-3 text-xs" aria-label="Leyenda">
          {LEYENDA.map(([c, t]) => (
            <li key={c} className="flex items-center gap-1.5">
              <span className={cn('size-3 rounded-sm', ESTILO[c])} aria-hidden />
              {t}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-muted" aria-hidden />
            Día inhábil
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}

type FormAudiencia = Omit<Audiencia, 'id' | 'orgId' | 'creadoEn'>

function DialogoAudiencia({ inicial, id, cerrar }: { inicial: FormAudiencia; id?: string; cerrar: () => void }) {
  const c = useContenedor()
  const [f, setF] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const set = <K extends keyof FormAudiencia>(k: K, v: FormAudiencia[K]) => setF((x) => ({ ...x, [k]: v }))

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!f.expedienteId) return toast.error('Elige un expediente.')
    setGuardando(true)
    try {
      if (id) await c.audiencias.actualizar(id, f)
      else await c.audiencias.crear(f)
      exito(id ? 'Audiencia actualizada' : 'Audiencia programada', { pose: 'balanza' })
      cerrar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{id ? 'Editar audiencia' : 'Programar audiencia'}</DialogTitle>
          <DialogDescription>Aparecerá en el calendario y en «Qué toca hoy» desde 7 días antes.</DialogDescription>
        </DialogHeader>
        <form id="form-aud" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Expediente" requerido className="sm:col-span-2">
            {(p) => <SelectorExpediente {...p} valor={f.expedienteId} onCambio={(e) => set('expedienteId', e?.id ?? '')} />}
          </Campo>
          <Campo etiqueta="Tipo" requerido>
            {(p) => (
              <SelectNativo {...p} value={f.tipo} onChange={(e) => set('tipo', e.target.value as TipoAudiencia)}>
                {TIPOS_AUDIENCIA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          <Campo etiqueta="Modalidad">
            {(p) => (
              <SelectNativo {...p} value={f.modalidad} onChange={(e) => set('modalidad', e.target.value as ModalidadAudiencia)}>
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
                <option value="mixta">Mixta</option>
              </SelectNativo>
            )}
          </Campo>
          <Campo etiqueta="Fecha" requerido>
            {(p) => <Input {...p} type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />}
          </Campo>
          <Campo opcional etiqueta="Hora (Lima)">
            {(p) => <Input {...p} type="time" value={f.hora ?? ''} onChange={(e) => set('hora', e.target.value || undefined)} />}
          </Campo>
          <Campo opcional etiqueta="Sala o enlace" className="sm:col-span-2">
            {(p) => <Input {...p} value={f.lugar ?? ''} onChange={(e) => set('lugar', e.target.value)} />}
          </Campo>
          <Campo opcional etiqueta="Abogado responsable">
            {(p) => <Input {...p} value={f.responsable ?? ''} onChange={(e) => set('responsable', e.target.value)} />}
          </Campo>
          <Campo opcional etiqueta="Resolución que la programa">
            {(p) => <Input {...p} value={f.resolucion ?? ''} onChange={(e) => set('resolucion', e.target.value)} />}
          </Campo>
          <Campo etiqueta="Estado">
            {(p) => (
              <SelectNativo {...p} value={f.estado} onChange={(e) => set('estado', e.target.value as EstadoAudiencia)}>
                <option value="programada">Programada</option>
                <option value="realizada">Realizada</option>
                <option value="reprogramada">Reprogramada</option>
                <option value="frustrada">Frustrada</option>
              </SelectNativo>
            )}
          </Campo>
          <Campo opcional etiqueta="Notas" className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={2} value={f.notas ?? ''} onChange={(e) => set('notas', e.target.value)} />}
          </Campo>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-aud" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Agenda() {
  const d = useDatos()
  const [params, setParams] = useSearchParams()
  const items = useMemo(() => eventos(d), [d])
  const [editando, setEditando] = useState<{ id?: string; inicial: FormAudiencia } | null>(() => {
    const expId = params.get('audiencia')
    return expId ? { inicial: nueva(expId, d.hoy, d.sesion.miembro.nombre) } : null
  })
  const proximas = d.audiencias.filter((a) => a.fecha >= d.hoy).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? ''))

  const exportar = () => {
    const futuros = items.filter((i) => i.fecha >= d.hoy)
    if (!futuros.length) return toast.info('No hay plazos ni audiencias pendientes.')
    descargar(`expedita-plazos-${d.hoy}.ics`, generarICS(futuros, `Expedita · ${d.sesion.orgNombre}`), 'text/calendar')
    toast.success(`${futuros.length} eventos exportados`, { description: 'Ábrelo para agregarlos a Google Calendar u Outlook.' })
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Agenda"
        descripcion="Plazos, audiencias y visitas. Los días inhábiles no cuentan para el cómputo."
        acciones={
          <>
            <Button variant="outline" onClick={exportar}>
              <DownloadIcon aria-hidden /> Exportar .ics
            </Button>
            <Button onClick={() => setEditando({ inicial: nueva('', d.hoy, d.sesion.miembro.nombre) })}>
              <CalendarPlusIcon aria-hidden /> Programar audiencia
            </Button>
          </>
        }
      />
      <div className="grid gap-10">
        <Calendario items={items} />
        <section aria-labelledby="titulo-audiencias">
          <h2 id="titulo-audiencias" className="mb-3 text-lg font-semibold">
            Próximas audiencias
          </h2>
          {proximas.length === 0 ? (
            <EstadoVacio pose="balanza" titulo="No hay audiencias programadas">Prográmalas desde aquí o desde la ficha del expediente.</EstadoVacio>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {proximas.map((a) => {
                const exp = d.expPorId.get(a.expedienteId)
                const ev = items.find((i) => i.uid === `a-${a.id}`)
                return (
                  <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {fecha(a.fecha)} {a.hora && `· ${a.hora}`} — Audiencia de {a.tipo.toLowerCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {etiquetaExp(exp)} · {a.modalidad} · {a.estado}
                        {a.lugar ? ` · ${a.lugar}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {ev && (
                        <Button variant="outline" size="sm" nativeButton={false} render={<a href={enlaceGoogleCalendar(ev)} target="_blank" rel="noreferrer" />}>
                          <ExternalLinkIcon aria-hidden /> Google Calendar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const { id, orgId: _o, creadoEn: _c, ...resto } = a
                          setEditando({ id, inicial: resto })
                        }}
                      >
                        <PencilIcon aria-hidden /> Editar
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
      {editando && (
        <DialogoAudiencia
          id={editando.id}
          inicial={editando.inicial}
          cerrar={() => {
            setEditando(null)
            if (params.has('audiencia')) setParams({})
          }}
        />
      )}
    </>
  )
}

function nueva(expedienteId: string, hoy: FechaISO, responsable: string): FormAudiencia {
  return { expedienteId, tipo: 'Conciliación', fecha: hoy, modalidad: 'virtual', estado: 'programada', responsable }
}
