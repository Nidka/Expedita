import { useMemo, useState } from 'react'
import { registrarAccion } from '@/application/casos-uso/acciones'
import type { AccionPropuestaIA } from '@/application/ports'
import { TIPOS_ACCION, type Expediente, type TipoAccion } from '@/domain/entidades'
import { normalizarCodigo } from '@/domain/expediente/importacion'
import { parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { filtrarMensajes, leerChat, type MensajeChat } from '@/domain/whatsapp/chat'
import { sumarDias } from '@/domain/shared/fecha'
import { proponerSeguimiento } from '@/domain/agenda/seguimiento'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor, useDatos } from '../contexto'
import { exito } from '../notificar'
import { Campo } from './base'
import { Michi } from './marca'
import { etiquetaExp, fecha as fmtFecha, plural } from '../formato'

/** Mensajes ya registrados desde este dispositivo, para no duplicarlos si se vuelve a pegar el mismo chat. */
const CLAVE_IMPORTADOS = 'expedita.whatsapp-importados'
const MAX_POR_LOTE = 80

function leerImportados(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_IMPORTADOS) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function guardarImportados(ids: Set<string>) {
  try {
    localStorage.setItem(CLAVE_IMPORTADOS, JSON.stringify([...ids].slice(-2000)))
  } catch {
    /* sin almacenamiento */
  }
}

/** Huella estable de un mensaje (no depende del orden en que se exporta el chat) */
const huella = (m: MensajeChat) => `${m.fecha} ${m.hora} ${m.autor} ${m.texto.slice(0, 60)}`

interface Propuesta extends AccionPropuestaIA {
  mensaje: MensajeChat
  expediente?: Expediente
  marcada: boolean
}

function buscarExpediente(ref: string | undefined, expedientes: readonly Expediente[]): Expediente | undefined {
  if (!ref) return undefined
  const num = parsearNumeroExpediente(ref)
  if (num) return expedientes.find((e) => e.numero === num.valor)
  const cod = normalizarCodigo(ref)
  return expedientes.find((e) => e.codigo && e.codigo.split(' / ').some((c) => c === cod))
}

export function ImportarWhatsApp({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const c = useContenedor()
  const d = useDatos()
  const [texto, setTexto] = useState('')
  const [desde, setDesde] = useState(() => sumarDias(d.hoy, -7))
  const [autores, setAutores] = useState<Set<string> | null>(null)
  const [propuestas, setPropuestas] = useState<Propuesta[] | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string>()

  const mensajes = useMemo(() => leerChat(texto), [texto])
  const todosAutores = useMemo(() => [...new Set(mensajes.map((m) => m.autor))].sort((a, b) => a.localeCompare(b, 'es')), [mensajes])
  const elegidos = autores ?? new Set(todosAutores)
  const importados = useMemo(() => leerImportados(), [abierto]) // eslint-disable-line react-hooks/exhaustive-deps
  const candidatos = filtrarMensajes(mensajes, desde, [...elegidos]).filter((m) => !importados.has(huella(m)))

  const leerArchivo = async (f: File | undefined) => {
    if (!f) return
    setTexto(await f.text())
    setPropuestas(null)
    setAutores(null)
  }

  const interpretar = async () => {
    if (!candidatos.length) return setError('No hay mensajes nuevos con esos filtros.')
    setError(undefined)
    setTrabajando(true)
    try {
      const lote = candidatos.slice(-MAX_POR_LOTE)
      const porId = new Map(lote.map((m) => [m.id, m]))
      const r = await c.ia.interpretarMensajes(
        lote.map((m) => ({ id: m.id, telefono: m.autor, texto: m.texto, fecha: m.fecha })),
        d.expedientes.filter((e) => e.estado === 'activo').map((e) => ({ numero: e.numero, codigo: e.codigo, cliente: e.cliente })),
      )
      setPropuestas(
        r
          .filter((p) => porId.has(p.mensajeId) && p.descripcion)
          .map((p) => {
            const expediente = buscarExpediente(p.numero, d.expedientes)
            return { ...p, mensaje: porId.get(p.mensajeId)!, expediente, marcada: Boolean(expediente) && !p.duda }
          }),
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTrabajando(false)
    }
  }

  const registrar = async () => {
    const elegidas = (propuestas ?? []).filter((p) => p.marcada && p.expediente)
    if (!elegidas.length) return
    setTrabajando(true)
    setError(undefined)
    const hechos = leerImportados()
    let n = 0
    try {
      for (const p of elegidas) {
        const fechaAccion = p.fecha ?? p.mensaje.fecha
        const tipo = (TIPOS_ACCION as readonly string[]).includes(p.tipo ?? '') ? (p.tipo as TipoAccion) : 'Otra'
        const auto = proponerSeguimiento(tipo, fechaAccion, d.calendario)
        const proximaFecha =
          p.proximaFecha ?? (p.proximaDiasHabiles ? d.calendario.sumarHabiles(fechaAccion, p.proximaDiasHabiles) : p.proxima ? undefined : auto?.proximaFecha)
        await registrarAccion(c, {
          expedienteId: p.expediente!.id,
          fecha: fechaAccion,
          tipo,
          descripcion: p.descripcion!,
          responsable: p.mensaje.autor,
          cargo: p.cargo,
          proxima: proximaFecha ? (p.proxima ?? auto?.proxima ?? 'Revisar si el juzgado proveyó') : p.proxima,
          proximaFecha,
          origen: 'whatsapp',
        })
        hechos.add(huella(p.mensaje))
        n++
      }
      exito(plural(n, 'acción registrada desde WhatsApp', 'acciones registradas desde WhatsApp'), { pose: 'martillo' })
      guardarImportados(hechos)
      cerrar()
    } catch (e) {
      guardarImportados(hechos)
      setError(`Se registraron ${n} y luego hubo un error: ${(e as Error).message}`)
    } finally {
      setTrabajando(false)
    }
  }

  const marcadas = propuestas?.filter((p) => p.marcada && p.expediente).length ?? 0

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar acciones desde WhatsApp</DialogTitle>
          <DialogDescription>
            En el grupo del estudio: menú ⋮ → Más → Exportar chat → Sin archivos. Pega aquí el texto o sube el archivo .txt. Claude propone una acción por mensaje y
            tú eliges cuáles registrar.
          </DialogDescription>
        </DialogHeader>

        {!propuestas ? (
          <div className="grid gap-5">
            <Campo etiqueta="Chat exportado">
              {(p) => (
                <Textarea
                  {...p}
                  rows={6}
                  value={texto}
                  onChange={(e) => {
                    setTexto(e.target.value)
                    setAutores(null)
                  }}
                  placeholder="05/11/2026, 14:33 - María: Exp LA-04 presenté pedido de sentencia, cargo 4521-2026"
                />
              )}
            </Campo>
            <Input type="file" accept=".txt,text/plain" aria-label="Subir el chat exportado (.txt)" onChange={(e) => void leerArchivo(e.target.files?.[0])} />

            {mensajes.length > 0 && (
              <div className="grid animate-entrar gap-4 sm:grid-cols-[12rem_1fr]">
                <Campo etiqueta="Mensajes desde">
                  {(p) => <Input {...p} type="date" value={desde} max={d.hoy} onChange={(e) => setDesde(e.target.value)} />}
                </Campo>
                <fieldset className="grid gap-2">
                  <legend className="mb-1.5 text-[0.8125rem] font-medium">Quién los escribió</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {todosAutores.map((a) => (
                      <Label key={a} className="font-normal">
                        <Checkbox
                          checked={elegidos.has(a)}
                          onCheckedChange={(v) => {
                            const s = new Set(elegidos)
                            if (v) s.add(a)
                            else s.delete(a)
                            setAutores(s)
                          }}
                        />
                        {a}
                      </Label>
                    ))}
                  </div>
                </fieldset>
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  {plural(candidatos.length, 'mensaje nuevo', 'mensajes nuevos')} para revisar
                  {candidatos.length > MAX_POR_LOTE ? ` (se procesan los últimos ${MAX_POR_LOTE})` : ''}. Los ya registrados desde este dispositivo se omiten.
                </p>
              </div>
            )}
          </div>
        ) : propuestas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Michi pose="pensando" className="size-20" />
            <p className="text-sm text-muted-foreground">Claude no encontró acciones de impulso en esos mensajes.</p>
          </div>
        ) : (
          <ul className="grid gap-3" aria-label="Acciones propuestas">
            {propuestas.map((p, i) => (
              <li key={p.mensajeId} className="rounded-xl bg-muted/50 p-4">
                <Label className="items-start gap-3 font-normal">
                  <Checkbox
                    className="mt-0.5"
                    disabled={!p.expediente}
                    checked={p.marcada && Boolean(p.expediente)}
                    onCheckedChange={(v) => setPropuestas((ps) => ps!.map((x, j) => (j === i ? { ...x, marcada: Boolean(v) } : x)))}
                  />
                  <span className="grid gap-1">
                    <span className="font-medium">
                      {p.expediente ? etiquetaExp(p.expediente) : 'Expediente no identificado'} · {p.tipo ?? 'Otra'}
                    </span>
                    <span className="text-sm">{p.descripcion}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.mensaje.autor} · {fmtFecha(p.fecha ?? p.mensaje.fecha)}
                      {p.cargo ? ` · cargo ${p.cargo}` : ''}
                      {p.proxima ? ` · próximo: ${p.proxima}` : ''}
                    </span>
                    {(p.duda || !p.expediente) && (
                      <span className="text-xs font-medium text-warning-foreground">
                        {p.duda ?? 'Indica el código o número del expediente en el mensaje y vuelve a intentarlo.'}
                      </span>
                    )}
                    <span className="mt-1 text-xs text-muted-foreground italic">«{p.mensaje.texto.slice(0, 160)}»</span>
                  </span>
                </Label>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={propuestas ? () => setPropuestas(null) : cerrar}>
            {propuestas ? 'Volver' : 'Cancelar'}
          </Button>
          {propuestas ? (
            <Button onClick={registrar} disabled={trabajando || marcadas === 0}>
              {trabajando ? 'Registrando…' : `Registrar ${plural(marcadas, 'acción', 'acciones')}`}
            </Button>
          ) : (
            <Button onClick={interpretar} disabled={trabajando || candidatos.length === 0}>
              {trabajando ? 'Claude está leyendo…' : 'Proponer acciones'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
