import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { InboxIcon, PlusIcon, RotateCcwIcon, SparklesIcon, WandIcon } from 'lucide-react'
import { previsualizarPlazo, registrarNotificacion } from '@/application/casos-uso/notificaciones'
import { extraerDeCorreo } from '@/domain/notificaciones/extraer'
import { parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { actosDeVia, viaPorEspecialidad, VIAS } from '@/domain/plazos/catalogo'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useContenedor, useDatos } from '../contexto'
import { BotonEnlace, Campo, EncabezadoPagina, EstadoVacio, FRANJA_SEVERIDAD, Mono, SelectNativo, Severo } from '../componentes/base'
import { etiquetaExp, fecha } from '../formato'

function NuevaNotificacion({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const c = useContenedor()
  const d = useDatos()
  const [texto, setTexto] = useState('')
  const [numero, setNumero] = useState('')
  const [asunto, setAsunto] = useState('')
  const [recibido, setRecibido] = useState(d.hoy)
  const [casilla, setCasilla] = useState(true)
  const [actoId, setActoId] = useState('')
  const [manual, setManual] = useState('')
  const [resumen, setResumen] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const num = parsearNumeroExpediente(numero)
  const existente = num ? d.expedientes.find((e) => e.numero === num.valor) : undefined
  const via = existente?.via ?? (num ? viaPorEspecialidad(num.especialidad) : 'otra')
  const actos = actosDeVia(via)
  const computo = useMemo(() => previsualizarPlazo(d.calendario, { recibido, casilla, actoId }), [d.calendario, recibido, casilla, actoId])

  const extraer = () => {
    const r = extraerDeCorreo(texto)
    if (r.numero) setNumero(r.numero)
    if (r.asunto) setAsunto(r.asunto)
    if (r.recibido) setRecibido(r.recibido)
    setCasilla(r.casilla)
    toast.info(r.numero ? 'Datos extraídos. Revísalos.' : 'No se encontró un número de expediente en el texto.')
  }

  const analizar = async () => {
    if (!texto.trim()) return toast.error('Pega primero el texto del correo.')
    setAnalizando(true)
    try {
      const base = extraerDeCorreo(texto)
      const numIA = base.numero ? parsearNumeroExpediente(base.numero) : null
      const viaIA = numIA ? (d.expedientes.find((e) => e.numero === numIA.valor)?.via ?? viaPorEspecialidad(numIA.especialidad)) : via
      const r = await c.ia.analizarNotificacion(texto, actosDeVia(viaIA).map((a) => ({ id: a.id, nombre: a.nombre })))
      if (r.numero) setNumero(r.numero)
      if (r.asunto) setAsunto(r.asunto)
      if (r.recibido) setRecibido(r.recibido)
      if (r.actoId && actosDeVia(viaIA).some((a) => a.id === r.actoId)) setActoId(r.actoId)
      if (r.plazoFijado) setManual(r.plazoFijado)
      if (r.resumen) setResumen(r.resumen)
      setCasilla(base.casilla)
      toast.success('Claude propuso los datos. Revisa el plazo antes de guardar.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAnalizando(false)
    }
  }

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!num) return toast.error('El número de expediente no es válido.')
    setGuardando(true)
    try {
      const r = await registrarNotificacion(c, {
        numero,
        asunto,
        recibido,
        casilla,
        actoId: actoId || undefined,
        vencimientoManual: manual || undefined,
        resumen: resumen || undefined,
        texto: texto || undefined,
      })
      toast.success(r.expedienteCreado ? 'Notificación guardada y expediente creado' : 'Notificación guardada')
      cerrar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva notificación</DialogTitle>
          <DialogDescription>Pega el correo del SINOE o del juzgado. Nada se guarda hasta que lo confirmes.</DialogDescription>
        </DialogHeader>
        <form id="form-notif" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Texto del correo" className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />}
          </Campo>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={extraer}>
              <WandIcon aria-hidden /> Extraer datos
            </Button>
            <Button type="button" variant="secondary" onClick={analizar} disabled={analizando}>
              <SparklesIcon aria-hidden /> {analizando ? 'Analizando…' : 'Analizar con Claude'}
            </Button>
          </div>
          <Campo
            etiqueta="N.° de expediente"
            requerido
            ayuda={num ? (existente ? `Existe: ${etiquetaExp(existente)}` : `Nuevo · vía ${VIAS[via].nombre}`) : 'Formato 00000-0000-0-0000-XX-XX-00'}
          >
            {(p) => <Input {...p} className="font-mono" value={numero} onChange={(e) => setNumero(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Fecha de notificación" requerido>
            {(p) => <Input {...p} type="date" value={recibido} onChange={(e) => setRecibido(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Asunto" requerido className="sm:col-span-2">
            {(p) => <Input {...p} value={asunto} onChange={(e) => setAsunto(e.target.value)} />}
          </Campo>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="casilla" checked={casilla} onCheckedChange={(v) => setCasilla(Boolean(v))} />
            <Label htmlFor="casilla">Notificada por casilla electrónica (surte efecto al 2.º día hábil)</Label>
          </div>
          <Campo etiqueta="Acto a cumplir" className="sm:col-span-2">
            {(p) => (
              <SelectNativo {...p} value={actoId} onChange={(e) => setActoId(e.target.value)}>
                <option value="">Sin plazo del catálogo</option>
                {actos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} — {a.dias} {a.unidad === 'naturales' ? 'naturales' : 'hábiles'}
                    {a.obligado !== 'parte' ? ` (${a.obligado})` : ''}
                  </option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          {computo && (
            <p className="rounded-lg bg-accent/60 px-3 py-2 text-sm text-accent-foreground sm:col-span-2" aria-live="polite">
              {computo.detalle}
            </p>
          )}
          <Campo etiqueta="Vencimiento fijado por la resolución" ayuda="Solo si la resolución fija un plazo propio; reemplaza al cálculo.">
            {(p) => <Input {...p} type="date" value={manual} onChange={(e) => setManual(e.target.value)} />}
          </Campo>
          <Campo etiqueta="Resumen" className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={2} value={resumen} onChange={(e) => setResumen(e.target.value)} />}
          </Campo>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-notif" disabled={guardando || !num || !asunto.trim()}>
            {guardando ? 'Guardando…' : 'Guardar notificación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Bandeja() {
  const c = useContenedor()
  const d = useDatos()
  const [nueva, setNueva] = useState(false)
  const ordenadas = useMemo(
    () => [...d.notificaciones].sort((a, b) => (a.vencimiento ?? '9999').localeCompare(b.vencimiento ?? '9999')),
    [d.notificaciones],
  )

  const lista = (estado: 'pendiente' | 'atendida') => {
    const items = ordenadas.filter((n) => n.estado === estado)
    if (!items.length)
      return (
        <EstadoVacio titulo={estado === 'pendiente' ? 'No hay notificaciones pendientes' : 'Aún no hay notificaciones atendidas'} />
      )
    return (
      <ul className="grid gap-2">
        {items.map((n) => {
          const restantes = n.vencimiento ? d.calendario.habilesEntre(d.hoy, n.vencimiento) : undefined
          const sev = estado === 'atendida' ? 'info' : restantes === undefined ? 'proximo' : restantes < 0 ? 'vencido' : restantes <= 3 ? 'urgente' : 'proximo'
          const exp = n.expedienteId ? d.expPorId.get(n.expedienteId) : undefined
          return (
            <li key={n.id} className="flex overflow-hidden rounded-xl border bg-card">
              <span className={cn('w-1.5 shrink-0', FRANJA_SEVERIDAD[sev])} aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.asunto}</p>
                  <p className="text-sm text-muted-foreground">
                    {exp ? (
                      <Link to={`/expedientes/${exp.id}`} className="underline-offset-2 hover:underline">
                        {etiquetaExp(exp)}
                      </Link>
                    ) : (
                      <Mono>{n.numero}</Mono>
                    )}{' '}
                    · notificada {fecha(n.recibido)}
                    {n.casilla ? ' (casilla)' : ''}
                  </p>
                  {n.resumen && <p className="mt-1 text-sm">{n.resumen}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {n.vencimiento && (
                    <Severo severidad={sev}>
                      {estado === 'atendida' ? `Atendida ${fecha(n.atendidaEn)}` : `Vence ${fecha(n.vencimiento)}`}
                    </Severo>
                  )}
                  {estado === 'pendiente' ? (
                    <BotonEnlace a={`/registrar?notificacion=${n.id}`} size="sm">
                      Registrar acción
                    </BotonEnlace>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void c.notificaciones.actualizar(n.id, { estado: 'pendiente', atendidaEn: undefined })}
                    >
                      <RotateCcwIcon aria-hidden /> Reabrir
                    </Button>
                  )}
                  {estado === 'pendiente' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void c.notificaciones.actualizar(n.id, { estado: 'atendida', atendidaEn: d.hoy })}
                    >
                      Marcar atendida
                    </Button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    )
  }

  const pendientes = d.notificaciones.filter((n) => n.estado === 'pendiente').length
  return (
    <>
      <EncabezadoPagina
        titulo="Notificaciones"
        descripcion="Lo que llega del SINOE y de los juzgados, con su plazo calculado en días hábiles."
        acciones={
          <Button onClick={() => setNueva(true)}>
            <PlusIcon aria-hidden /> Nueva notificación
          </Button>
        }
      />
      <Tabs defaultValue="pendiente">
        <TabsList>
          <TabsTrigger value="pendiente">
            <InboxIcon aria-hidden /> Pendientes ({pendientes})
          </TabsTrigger>
          <TabsTrigger value="atendida">Atendidas</TabsTrigger>
        </TabsList>
        <TabsContent value="pendiente" className="mt-4">
          {lista('pendiente')}
        </TabsContent>
        <TabsContent value="atendida" className="mt-4">
          {lista('atendida')}
        </TabsContent>
      </Tabs>
      {nueva && <NuevaNotificacion abierto={nueva} cerrar={() => setNueva(false)} />}
    </>
  )
}
