import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArchiveIcon, ArchiveRestoreIcon, CalendarPlusIcon, CheckIcon, CopyIcon, ExternalLinkIcon, PencilIcon, PenLineIcon, SearchCheckIcon } from 'lucide-react'
import type { Expediente } from '@/domain/entidades'
import { parsearNumeroExpediente, ESPECIALIDADES, INSTANCIAS } from '@/domain/expediente/numero-expediente'
import { estadoMovimiento } from '@/domain/agenda/que-toca-hoy'
import { SUGERENCIA_POR_ETAPA, VIAS, esViaId, type ViaId } from '@/domain/plazos/catalogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useContenedor, useDatos } from '../contexto'
import { BotonEnlace, Campo, EncabezadoPagina, EstadoVacio, Mono, SelectNativo, Severo } from '../componentes/base'
import { fecha, partes, soles } from '../formato'

const URL_CEJ = 'https://cej.pj.gob.pe/cej/forms/busquedaform.html'

function RutaEtapas({ via, etapa }: { via: ViaId; etapa?: string }) {
  const etapas = VIAS[via]?.etapas ?? []
  const actual = etapa ? etapas.indexOf(etapa) : -1
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Ruta de etapas">
      {etapas.map((e, i) => (
        <li
          key={e}
          aria-current={i === actual ? 'step' : undefined}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs',
            i < actual && 'border-transparent bg-secondary text-secondary-foreground',
            i === actual && 'border-primary bg-primary font-medium text-primary-foreground',
            i > actual && 'text-muted-foreground',
          )}
        >
          {i < actual && <CheckIcon className="size-3" aria-hidden />}
          {e}
          {i === actual && <span className="sr-only"> (etapa actual)</span>}
        </li>
      ))}
    </ol>
  )
}

function DesgloseCej({ numero, onRevision }: { numero: string; onRevision: () => void }) {
  const n = parsearNumeroExpediente(numero)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(numero)
      toast.success('Número copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[1.0625rem] font-semibold">Consulta en el CEJ</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {n && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            {(
              [
                ['Número', n.numero],
                ['Año', n.anio],
                ['Incidente', n.incidente],
                ['Distrito', n.distrito],
                ['Instancia', n.instancia, INSTANCIAS[n.instancia]],
                ['Especialidad', n.especialidad, ESPECIALIDADES[n.especialidad]],
                ['Juzgado', n.juzgado],
              ] as [string, string, string?][]
            ).map(([k, codigo, nombre]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd>
                  <Mono>{codigo}</Mono>
                  {nombre && <span className="text-muted-foreground"> · {nombre}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-xs text-muted-foreground">
          Usa «Por código de expediente» en el CEJ y resuelve el captcha. Al terminar, registra lo que encontraste.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copiar}>
            <CopyIcon aria-hidden /> Copiar número
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href={URL_CEJ} target="_blank" rel="noreferrer" />}>
            <ExternalLinkIcon aria-hidden /> Abrir CEJ<span className="sr-only"> (se abre en otra pestaña)</span>
          </Button>
          <Button variant="secondary" onClick={onRevision}>
            <SearchCheckIcon aria-hidden /> Registrar revisión del CEJ
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EditarExpediente({ exp, abierto, cerrar }: { exp: Expediente; abierto: boolean; cerrar: () => void }) {
  const c = useContenedor()
  const { expedientes } = useDatos()
  const [f, setF] = useState(exp)
  const [guardando, setGuardando] = useState(false)
  const materias = useMemo(() => [...new Set(expedientes.map((e) => e.materia).filter(Boolean))].sort(), [expedientes])
  const set = <K extends keyof Expediente>(k: K, v: Expediente[K]) => setF((x) => ({ ...x, [k]: v }))

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    setGuardando(true)
    try {
      const { id: _i, orgId: _o, creadoEn: _c, actualizadoEn: _a, ...cambios } = f
      await c.expedientes.actualizar(exp.id, cambios)
      toast.success('Expediente actualizado')
      cerrar()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const texto = (k: keyof Expediente, etiqueta: string, extra?: object) => (
    <Campo etiqueta={etiqueta}>
      {(p) => <Input {...p} {...extra} value={(f[k] as string) ?? ''} onChange={(e) => set(k, e.target.value as never)} />}
    </Campo>
  )

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar expediente</DialogTitle>
          <DialogDescription>Cambia la materia para moverlo de carpeta.</DialogDescription>
        </DialogHeader>
        <form id="form-exp" onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          {texto('codigo', 'Código interno')}
          <Campo etiqueta="Materia (carpeta)">
            {(p) => (
              <>
                <Input {...p} list="materias" value={f.materia ?? ''} onChange={(e) => set('materia', e.target.value)} />
                <datalist id="materias">
                  {materias.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>
          <Campo etiqueta="Vía procesal">
            {(p) => (
              <SelectNativo {...p} value={f.via} onChange={(e) => esViaId(e.target.value) && set('via', e.target.value)}>
                {Object.values(VIAS).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          <Campo etiqueta="Etapa">
            {(p) => (
              <SelectNativo {...p} value={f.etapa ?? ''} onChange={(e) => set('etapa', e.target.value || undefined)}>
                <option value="">Sin etapa</option>
                {VIAS[f.via].etapas.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          {texto('cliente', 'Cliente')}
          {texto('demandante', 'Demandante')}
          {texto('demandado', 'Demandado')}
          {texto('organo', 'Juzgado / órgano')}
          {texto('especialista', 'Especialista')}
          {texto('distrito', 'Distrito judicial')}
          {texto('actuacionPendiente', 'Actuación pendiente')}
          {texto('estadoProceso', 'Estado del proceso (cuadro)')}
          <Campo etiqueta="Notas" className="sm:col-span-2">
            {(p) => <Textarea {...p} value={f.notas ?? ''} onChange={(e) => set('notas', e.target.value)} />}
          </Campo>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-exp" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FichaExpediente() {
  const { id } = useParams()
  const c = useContenedor()
  const d = useDatos()
  const exp = id ? d.expPorId.get(id) : undefined
  const [editando, setEditando] = useState(false)
  const navegar = useNavigate()

  const historial = useMemo(() => {
    if (!exp) return []
    const items = [
      ...d.acciones
        .filter((a) => a.expedienteId === exp.id)
        .map((a) => ({
          clave: `a${a.id}`,
          fecha: a.fecha,
          titulo: a.tipo,
          texto: a.descripcion,
          meta: [a.responsable, a.cargo && `Cargo ${a.cargo}`, a.proxima && `Próximo: ${a.proxima}${a.proximaFecha ? ` (${fecha(a.proximaFecha)})` : ''}${a.proximaCumplida ? ' ✓' : ''}`]
            .filter(Boolean)
            .join(' · '),
          tipo: 'Acción',
        })),
      ...d.notificaciones
        .filter((n) => n.expedienteId === exp.id)
        .map((n) => ({
          clave: `n${n.id}`,
          fecha: n.recibido,
          titulo: n.asunto,
          texto: n.resumen ?? '',
          meta: `${n.estado === 'pendiente' ? 'Pendiente' : 'Atendida'}${n.vencimiento ? ` · vence ${fecha(n.vencimiento)}` : ''}`,
          tipo: 'Notificación',
        })),
      ...d.audiencias
        .filter((a) => a.expedienteId === exp.id)
        .map((a) => ({
          clave: `h${a.id}`,
          fecha: a.fecha,
          titulo: `Audiencia de ${a.tipo.toLowerCase()}`,
          texto: a.lugar ?? '',
          meta: `${a.hora ?? ''} · ${a.modalidad} · ${a.estado}`,
          tipo: 'Audiencia',
        })),
    ]
    return items.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [exp, d.acciones, d.notificaciones, d.audiencias])

  if (!exp) {
    return d.cargando ? null : <EstadoVacio titulo="No se encontró el expediente" />
  }

  const mov = estadoMovimiento(exp, d.acciones, { hoy: d.hoy, calendario: d.calendario, diasSinMovimiento: d.config.diasSinMovimiento })
  const sugerencia = exp.etapa ? SUGERENCIA_POR_ETAPA[exp.etapa] : undefined
  const archivar = async () => {
    const nuevo = exp.estado === 'activo' ? 'archivado' : 'activo'
    await c.expedientes.actualizar(exp.id, { estado: nuevo })
    toast.success(nuevo === 'archivado' ? 'Expediente archivado' : 'Expediente reactivado')
  }

  return (
    <>
      <EncabezadoPagina
        titulo={exp.codigo ? `${exp.codigo}` : 'Expediente'}
        descripcion={
          <>
            <Mono className="text-foreground">{exp.numero}</Mono> · {partes(exp)}
          </>
        }
        acciones={
          <>
            <BotonEnlace a={`/registrar?exp=${exp.id}`}>
              <PenLineIcon aria-hidden /> Registrar acción
            </BotonEnlace>
            <BotonEnlace a={`/agenda?audiencia=${exp.id}`} variant="outline">
              <CalendarPlusIcon aria-hidden /> Audiencia
            </BotonEnlace>
            <Button variant="outline" size="icon" onClick={() => setEditando(true)} aria-label="Editar expediente" title="Editar expediente">
              <PencilIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={archivar}
              aria-label={exp.estado === 'activo' ? 'Archivar expediente' : 'Reactivar expediente'}
              title={exp.estado === 'activo' ? 'Archivar expediente' : 'Reactivar expediente'}
            >
              {exp.estado === 'activo' ? <ArchiveIcon /> : <ArchiveRestoreIcon />}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[1.0625rem] font-semibold">{VIAS[exp.via]?.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <RutaEtapas via={exp.via} etapa={exp.etapa} />
              {mov?.abandono && (
                <Severo severidad={mov.abandono === 'riesgo' ? 'vencido' : 'urgente'}>
                  {mov.abandono === 'riesgo' ? 'Riesgo de abandono' : 'Aviso de abandono'}: {mov.dias} días sin impulso
                </Severo>
              )}
              {sugerencia && (
                <p className="border-l-2 border-berry pl-3 text-sm">
                  <strong>Sugerencia:</strong> {sugerencia}
                </p>
              )}
            </CardContent>
          </Card>

          <section aria-labelledby="titulo-historial">
            <h2 id="titulo-historial" className="mb-3 text-lg font-semibold">
              Historial
            </h2>
            {historial.length === 0 ? (
              <EstadoVacio titulo="Sin movimientos registrados">Registra la primera acción de impulso.</EstadoVacio>
            ) : (
              <ol className="relative grid gap-4 border-l pl-5">
                {historial.map((h) => (
                  <li key={h.clave} className="relative">
                    <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden />
                    <p className="text-xs text-muted-foreground">
                      {fecha(h.fecha)} · {h.tipo}
                    </p>
                    <p className="font-medium">{h.titulo}</p>
                    {h.texto && <p className="text-sm whitespace-pre-line">{h.texto}</p>}
                    {h.meta && <p className="text-xs text-muted-foreground">{h.meta}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <DesgloseCej
            numero={exp.numero}
            onRevision={() => navegar(`/registrar?exp=${exp.id}&tipo=${encodeURIComponent('Revisión en CEJ')}`)}
          />
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-[1.0625rem] font-semibold">Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2.5 text-sm">
              {(
                [
                  ['Estado', exp.estado === 'activo' ? 'Activo' : 'Archivado'],
                  ['Materia', exp.materia],
                  ['Juzgado', exp.organo],
                  ['Especialista', exp.especialista],
                  ['Distrito', exp.distrito],
                  ['Demandante', exp.demandante],
                  ['Demandado', exp.demandado],
                  ['Petitorio', exp.montoPetitorio !== undefined ? soles(exp.montoPetitorio) : undefined],
                  ['Sentenciado', exp.montoSentenciado !== undefined ? soles(exp.montoSentenciado) : undefined],
                  ['Estado (cuadro)', exp.estadoProceso],
                  ['Último acto', exp.ultimoActo && `${exp.ultimoActo}${exp.fechaUltimoActo ? ` (${fecha(exp.fechaUltimoActo)})` : ''}`],
                  ['Actuación pendiente', exp.actuacionPendiente],
                  ['Última revisión CEJ', exp.ultimaRevisionCej && fecha(exp.ultimaRevisionCej)],
                  ['Días sin movimiento', mov ? String(mov.dias) : undefined],
                  ['Notas', exp.notas],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {editando && <EditarExpediente exp={exp} abierto={editando} cerrar={() => setEditando(false)} />}
    </>
  )
}
