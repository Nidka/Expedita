import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { descargar } from '@/application/exportar'
import { MODELOS_BASE } from '@/domain/escritos/modelos-base'
import { datosDeExpediente, nombreArchivo, pendientes, rellenar, VARIABLES, type ModeloEscrito } from '@/domain/escritos/plantilla'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { BooksIcon, CopyIcon, FileDocIcon, PencilIcon, PlusIcon, RefreshIcon, Trash2Icon } from '@/ui/iconos'
import { useContenedor, useDatos } from '../contexto'
import { Campo, EncabezadoPagina, SelectNativo } from '../componentes/base'
import { SelectorExpediente } from '../componentes/SelectorExpediente'

type Elegido = { origen: 'base' | 'estudio'; id: string; titulo: string; contenido: string }

/** RF-36 y RF-37: redactar escritos desde modelos del estudio y descargarlos en Word con membrete. */
export function Escritos() {
  const c = useContenedor()
  const d = useDatos()
  const [params] = useSearchParams()
  const estadoNav = useLocation().state as { texto?: string; expId?: string } | null
  const esAdmin = d.sesion.miembro.rol === 'admin'

  const [modelos, setModelos] = useState<ModeloEscrito[]>([])
  const [pestana, setPestana] = useState<'escrito' | 'jurisprudencia'>('escrito')
  const [expId, setExpId] = useState<string | undefined>(estadoNav?.expId ?? params.get('exp') ?? undefined)
  const [elegido, setElegido] = useState<Elegido | null>(null)
  const [texto, setTexto] = useState(estadoNav?.texto ?? '')
  const [editado, setEditado] = useState(Boolean(estadoNav?.texto))
  const [editor, setEditor] = useState<Partial<ModeloEscrito> | null>(null)
  const [membreteAbierto, setMembreteAbierto] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)

  const cargar = useCallback(async () => {
    try {
      setModelos(await c.modelos.listar())
    } catch {
      toast.error('No se pudo cargar la biblioteca')
    }
  }, [c])
  useEffect(() => void cargar(), [cargar])

  const exp = expId ? d.expPorId.get(expId) : undefined
  const datosPara = (e?: typeof exp) =>
    datosDeExpediente(e, { abogado: d.sesion.miembro.nombre, estudio: d.sesion.orgNombre, ciudad: d.config.ciudad, hoy: d.hoy })
  const datos = datosPara(exp)
  const faltan = pendientes(texto)

  const usar = (m: Elegido) => {
    if (editado && texto.trim() && !window.confirm('Se reemplazará el texto que estás editando. ¿Continuar?')) return
    setElegido(m)
    setTexto(rellenar(m.contenido, datos))
    setEditado(false)
  }

  // Al cambiar de expediente, se vuelve a rellenar el modelo si aún no se editó a mano
  const cambiarExpediente = (id?: string) => {
    setExpId(id)
    if (elegido && !editado) setTexto(rellenar(elegido.contenido, datosPara(id ? d.expPorId.get(id) : undefined)))
  }

  const insertar = (contenido: string) => {
    const t = area.current
    const pos = t ? t.selectionStart : texto.length
    const bloque = `\n${rellenar(contenido, datos)}\n`
    setTexto(texto.slice(0, pos) + bloque + texto.slice(pos))
    setEditado(true)
    toast.success('Jurisprudencia insertada')
  }

  const descargarWord = () => {
    if (!texto.trim()) return toast.error('El escrito está vacío.')
    const titulo = elegido?.titulo ?? 'Escrito'
    const blob = c.word.generar(texto, { titulo: d.config.membreteTitulo || d.sesion.orgNombre, detalle: d.config.membreteDetalle }, titulo)
    descargar(nombreArchivo(titulo, exp), blob)
    if (faltan.length) toast.warning('Descargado con datos por completar', { description: faltan.join(', ') })
    else toast.success('Escrito descargado')
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto.replace(/^(>>|\^\^) /gm, '').replace(/\*\*/g, ''))
      toast.success('Texto copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const eliminar = async (m: ModeloEscrito) => {
    if (!window.confirm(`¿Eliminar «${m.titulo}» de la biblioteca?`)) return
    await c.modelos.eliminar(m.id)
    await cargar()
    toast.success('Eliminado de la biblioteca')
  }

  const propios = modelos.filter((m) => m.categoria === pestana)

  return (
    <>
      <EncabezadoPagina
        titulo="Escritos"
        descripcion="Elige un modelo, revisa el texto y descárgalo en Word con el membrete del estudio."
        acciones={
          <Button variant="outline" onClick={() => setMembreteAbierto(true)}>
            <PencilIcon aria-hidden /> Membrete
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        {/* Biblioteca */}
        <aside aria-label="Biblioteca" className="grid content-start gap-4">
          <div role="tablist" aria-label="Tipo de documento" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['escrito', 'jurisprudencia'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={pestana === p}
                onClick={() => setPestana(p)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  pestana === p ? 'bg-card text-foreground shadow-[0_0_0_1px_var(--border)]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p === 'escrito' ? 'Modelos' : 'Jurisprudencia'}
              </button>
            ))}
          </div>

          <ul className="grid gap-1">
            {pestana === 'escrito' &&
              MODELOS_BASE.map((m) => (
                <ItemBiblioteca key={m.id} titulo={m.titulo} detalle="Incluido" activo={elegido?.id === m.id} onUsar={() => usar({ origen: 'base', ...m })} />
              ))}
            {propios.map((m) => (
              <ItemBiblioteca
                key={m.id}
                titulo={m.titulo}
                detalle={m.categoria === 'jurisprudencia' ? 'Insertar en el texto' : 'Del estudio'}
                activo={elegido?.id === m.id}
                onUsar={() => (m.categoria === 'jurisprudencia' ? insertar(m.contenido) : usar({ origen: 'estudio', ...m }))}
                onEditar={() => setEditor(m)}
                onEliminar={() => eliminar(m)}
              />
            ))}
            {pestana === 'jurisprudencia' && !propios.length && (
              <li className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                Guarda aquí casaciones, plenos y criterios que usen seguido. Al elegir una, se inserta donde está el cursor.
              </li>
            )}
          </ul>

          <Button variant="outline" onClick={() => setEditor({ categoria: pestana, titulo: '', contenido: '' })}>
            <PlusIcon aria-hidden /> {pestana === 'escrito' ? 'Nuevo modelo' : 'Nueva jurisprudencia'}
          </Button>
        </aside>

        {/* Editor */}
        <section aria-label="Escrito" className="grid min-w-0 content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Campo etiqueta="Expediente" opcional ayuda="Completa número, juzgado, partes y especialista.">
              {(p) => <SelectorExpediente {...p} valor={expId} onCambio={(e) => cambiarExpediente(e?.id)} />}
            </Campo>
            {elegido && editado && (
              <Button variant="ghost" onClick={() => (setTexto(rellenar(elegido.contenido, datos)), setEditado(false))} className="sm:mb-6">
                <RefreshIcon aria-hidden /> Volver al modelo
              </Button>
            )}
          </div>

          {!texto && !elegido ? (
            <div className="grid justify-items-center gap-3 rounded-xl bg-card px-6 py-16 text-center shadow-[0_0_0_1px_var(--border)]">
              <BooksIcon className="size-8 text-muted-foreground" aria-hidden />
              <p className="font-medium">Elige un modelo de la biblioteca</p>
              <p className="max-w-sm text-sm text-muted-foreground">O escribe desde cero: el texto se descarga en Word con el membrete, Arial 12 e interlineado 1.5.</p>
              <Button variant="outline" size="sm" onClick={() => (setElegido({ origen: 'base', id: 'vacio', titulo: 'Escrito', contenido: '' }), setTexto(' '))}>
                Empezar en blanco
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--border)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-separator px-5 py-2.5">
                  <p className="truncate text-sm font-medium">{elegido?.titulo ?? 'Escrito'}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>&gt;&gt;</code> derecha · <code>^^</code> centro · <code>**negrita**</code>
                  </p>
                </div>
                <Textarea
                  ref={area}
                  aria-label="Texto del escrito"
                  value={texto}
                  onChange={(e) => (setTexto(e.target.value), setEditado(true))}
                  className="min-h-[60dvh] resize-y rounded-none border-0 bg-transparent px-6 py-5 font-serif text-[0.975rem] leading-relaxed [font-variant-numeric:lining-nums] shadow-none focus-visible:ring-0 sm:px-10"
                  spellCheck
                  lang="es"
                />
              </div>

              {faltan.length > 0 && (
                <p className="flex flex-wrap items-center gap-1.5 text-sm" role="status">
                  <span className="text-muted-foreground">Por completar:</span>
                  {faltan.map((f) => (
                    <span key={f} className="rounded-md bg-ocre/15 px-2 py-0.5 text-xs font-medium text-ocre-texto">
                      {f}
                    </span>
                  ))}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={descargarWord}>
                  <FileDocIcon aria-hidden /> Descargar Word
                </Button>
                <Button variant="outline" onClick={copiar}>
                  <CopyIcon aria-hidden /> Copiar texto
                </Button>
                <Button variant="ghost" onClick={() => setEditor({ categoria: 'escrito', titulo: elegido?.titulo ? `${elegido.titulo} (copia)` : '', contenido: elegido?.contenido || texto })}>
                  Guardar como modelo
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      {editor && <EditorModelo inicial={editor} onCerrar={() => setEditor(null)} onGuardado={cargar} />}
      {membreteAbierto && <EditorMembrete onCerrar={() => setMembreteAbierto(false)} puedeEditar={esAdmin} />}
    </>
  )
}

function ItemBiblioteca({
  titulo,
  detalle,
  activo,
  onUsar,
  onEditar,
  onEliminar,
}: {
  titulo: string
  detalle: string
  activo: boolean
  onUsar: () => void
  onEditar?: () => void
  onEliminar?: () => void
}) {
  return (
    <li className={cn('group flex items-center rounded-lg transition-colors', activo ? 'bg-secondary' : 'hover:bg-muted')}>
      <button type="button" onClick={onUsar} aria-current={activo || undefined} className="grid min-w-0 flex-1 gap-0.5 px-3 py-2.5 text-left">
        <span className="truncate text-sm font-medium">{titulo}</span>
        <span className="text-xs text-muted-foreground">{detalle}</span>
      </button>
      {onEditar && (
        <Button variant="ghost" size="icon-sm" onClick={onEditar} aria-label={`Editar ${titulo}`} className="opacity-60 group-hover:opacity-100">
          <PencilIcon />
        </Button>
      )}
      {onEliminar && (
        <Button variant="ghost" size="icon-sm" onClick={onEliminar} aria-label={`Eliminar ${titulo}`} className="mr-1 opacity-60 group-hover:opacity-100">
          <Trash2Icon />
        </Button>
      )}
    </li>
  )
}

function EditorModelo({ inicial, onCerrar, onGuardado }: { inicial: Partial<ModeloEscrito>; onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const c = useContenedor()
  const [titulo, setTitulo] = useState(inicial.titulo ?? '')
  const [categoria, setCategoria] = useState<ModeloEscrito['categoria']>(inicial.categoria ?? 'escrito')
  const [contenido, setContenido] = useState(inicial.contenido ?? '')
  const [ocupado, setOcupado] = useState(false)

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return toast.error('Ponle un título.')
    setOcupado(true)
    try {
      if (inicial.id) await c.modelos.actualizar(inicial.id, { titulo: titulo.trim(), categoria, contenido })
      else await c.modelos.crear({ titulo: titulo.trim(), categoria, contenido })
      await onGuardado()
      toast.success('Guardado en la biblioteca')
      onCerrar()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={guardar} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{inicial.id ? 'Editar' : 'Agregar a la biblioteca'}</DialogTitle>
            <DialogDescription>Lo verá todo el estudio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <Campo etiqueta="Título" requerido>
              {(p) => <Input {...p} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Pedido de embargo" />}
            </Campo>
            <Campo etiqueta="Tipo">
              {(p) => (
                <SelectNativo {...p} value={categoria} onChange={(e) => setCategoria(e.target.value as ModeloEscrito['categoria'])}>
                  <option value="escrito">Modelo de escrito</option>
                  <option value="jurisprudencia">Jurisprudencia</option>
                </SelectNativo>
              )}
            </Campo>
          </div>
          <Campo
            etiqueta="Contenido"
            ayuda={
              <>
                Datos que se completan solos:{' '}
                {Object.entries(VARIABLES).map(([k, v], i) => (
                  <span key={k}>
                    {i > 0 && ', '}
                    <code title={v}>{`{{${k}}}`}</code>
                  </span>
                ))}
                .
              </>
            }
          >
            {(p) => <Textarea {...p} rows={14} value={contenido} onChange={(e) => setContenido(e.target.value)} className="font-serif text-[0.9375rem] leading-relaxed" />}
          </Campo>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={ocupado}>
              {ocupado ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditorMembrete({ onCerrar, puedeEditar }: { onCerrar: () => void; puedeEditar: boolean }) {
  const c = useContenedor()
  const d = useDatos()
  const [titulo, setTitulo] = useState(d.config.membreteTitulo ?? d.sesion.orgNombre)
  const [detalle, setDetalle] = useState(d.config.membreteDetalle ?? '')
  const [ciudad, setCiudad] = useState(d.config.ciudad ?? 'Lima')
  const [ocupado, setOcupado] = useState(false)

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setOcupado(true)
    try {
      await c.config.guardar({ membreteTitulo: titulo.trim(), membreteDetalle: detalle.trim(), ciudad: ciudad.trim() || 'Lima' })
      await d.recargar('config')
      toast.success('Membrete guardado')
      onCerrar()
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={guardar} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Membrete del estudio</DialogTitle>
            <DialogDescription>Aparece arriba de cada página de los escritos en Word.</DialogDescription>
          </DialogHeader>

          {/* Vista previa */}
          <div className="rounded-lg bg-white px-6 py-5 text-center text-[#1D1D1F] shadow-[0_0_0_1px_var(--border)]" aria-hidden>
            <p className="font-bold text-[#8C1D2B]">{titulo || 'Nombre del estudio'}</p>
            <p className="mt-0.5 border-b border-[#8C1D2B] pb-2 text-[0.6875rem] whitespace-pre-line text-[#595959]">{detalle || 'Dirección · teléfono · correo'}</p>
          </div>

          <fieldset disabled={!puedeEditar} className="grid gap-4">
            <Campo etiqueta="Nombre">
              {(p) => <Input {...p} value={titulo} onChange={(e) => setTitulo(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Datos de contacto" opcional ayuda="Una línea por renglón: dirección, teléfono, correo.">
              {(p) => <Textarea {...p} rows={3} value={detalle} onChange={(e) => setDetalle(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Ciudad" ayuda="Para la fecha al final del escrito.">
              {(p) => <Input {...p} value={ciudad} onChange={(e) => setCiudad(e.target.value)} />}
            </Campo>
          </fieldset>
          {!puedeEditar && <p className="text-sm text-muted-foreground">Solo un administrador puede cambiar el membrete.</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCerrar}>
              Cerrar
            </Button>
            {puedeEditar && (
              <Button type="submit" disabled={ocupado}>
                {ocupado ? 'Guardando…' : 'Guardar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
