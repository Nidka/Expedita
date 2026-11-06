import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CopyIcon, DownloadIcon, FileSpreadsheetIcon, Trash2Icon, UserPlusIcon } from '@/ui/iconos'
import { importarExpedientes } from '@/application/casos-uso/importar'
import { descargar, generarCSV } from '@/application/exportar'
import type { Invitacion, RegistroAuditoria } from '@/application/ports'
import { describirCambio } from '@/domain/auditoria'
import { emparejar, type CatalogoDrive } from '@/domain/documentos/drive'
import scriptDrive from '../../../scripts/google/expedita-drive.gs?raw'
import scriptGmail from '../../../scripts/google/expedita-gmail.gs?raw'
import scriptRecordatorio from '../../../scripts/google/expedita-recordatorio.gs?raw'
import { extraerDeCorreo } from '@/domain/notificaciones/extraer'
import { Link, useSearchParams } from 'react-router-dom'
import type { Miembro, Rol } from '@/domain/entidades'
import { importarCuadro, type ResultadoImportacion } from '@/domain/expediente/importacion'
import { esFechaISO } from '@/domain/shared/fecha'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor, useDatos } from '../contexto'
import { Campo, EncabezadoPagina, EstadoVacio, SelectNativo } from '../componentes/base'
import { etiquetaExp, fecha, plural } from '../formato'
import { exito } from '../notificar'

function Equipo() {
  const c = useContenedor()
  const { sesion } = useDatos()
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [invs, setInvs] = useState<Invitacion[]>([])
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('abogado')
  const [quitando, setQuitando] = useState<Miembro>()

  const quitar = async () => {
    if (!quitando) return
    try {
      await c.equipo.quitarMiembro(quitando.id)
      toast.success(`${quitando.nombre} ya no tiene acceso al estudio`)
      setQuitando(undefined)
      await cargar()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const cargar = async () => {
    const [m, i] = await Promise.all([c.equipo.miembros(), c.equipo.invitaciones()])
    setMiembros(m)
    setInvs(i)
  }
  useEffect(() => {
    void cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const invitar = async (ev: FormEvent) => {
    ev.preventDefault()
    try {
      await c.equipo.invitar({ email, nombre, rol })
      toast.success('Invitación guardada', { description: `${email} entrará al estudio la primera vez que inicie sesión.` })
      setEmail('')
      setNombre('')
      await cargar()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {quitando && (
        <Dialog open onOpenChange={(o) => !o && setQuitando(undefined)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>¿Quitar a {quitando.nombre} del estudio?</DialogTitle>
              <DialogDescription>
                Dejará de ver los expedientes de inmediato. Las acciones que registró se conservan. Puedes volver a invitarla cuando quieras.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQuitando(undefined)} autoFocus>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={quitar}>
                Quitar acceso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Miembros</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {miembros.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.nombre}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                </div>
                <SelectNativo
                  aria-label={`Rol de ${m.nombre}`}
                  value={m.rol}
                  disabled={m.userId === sesion.miembro.userId}
                  onChange={async (e) => {
                    await c.equipo.cambiarRol(m.id, e.target.value as Rol)
                    toast.success('Rol actualizado')
                    void cargar()
                  }}
                >
                  <option value="admin">Administrador</option>
                  <option value="abogado">Abogado</option>
                </SelectNativo>
                {m.userId !== sesion.miembro.userId && (
                  <Button variant="ghost" size="icon-sm" aria-label={`Quitar a ${m.nombre} del estudio`} title="Quitar del estudio" onClick={() => setQuitando(m)}>
                    <Trash2Icon />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Invitar</CardTitle>
          <CardDescription>La persona entra con su correo (enlace o contraseña). No se envía nada automáticamente: avísale tú.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={invitar} className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Correo" requerido>
              {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Nombre" requerido>
              {(p) => <Input {...p} value={nombre} onChange={(e) => setNombre(e.target.value)} />}
            </Campo>
            <Campo
              etiqueta="Rol"
              ayuda={rol === "admin" ? "Todo, incluidos ajustes, equipo, historial de cambios y eliminar registros." : "Registra y edita todo; solo elimina las acciones y modelos que creó."}
            >
              {(p) => (
                <SelectNativo {...p} value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
                  <option value="abogado">Abogado</option>
                  <option value="admin">Administrador</option>
                </SelectNativo>
              )}
            </Campo>
            <Button type="submit" className="self-end" disabled={!email || !nombre}>
              <UserPlusIcon aria-hidden /> Invitar
            </Button>
          </form>
          {invs.length > 0 && (
            <ul className="divide-y divide-separator border-t border-separator">
              {invs.map((i) => (
                <li key={i.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {i.nombre} · {i.email} · {i.rol}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar invitación de ${i.email}`}
                    onClick={async () => {
                      await c.equipo.quitarInvitacion(i.id)
                      void cargar()
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Plazos() {
  const c = useContenedor()
  const { config, feriados, hoy } = useDatos()
  const [dias, setDias] = useState(String(config.diasSinMovimiento))
  const [inhabiles, setInhabiles] = useState(config.diasInhabiles.join('\n'))
  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    const lista = [...new Set(inhabiles.split(/[\s,;]+/).filter(Boolean))]
    const malas = lista.filter((f) => !esFechaISO(f))
    if (malas.length) return toast.error(`Fechas no válidas: ${malas.join(', ')}. Usa AAAA-MM-DD.`)
    const n = Number(dias)
    if (!Number.isInteger(n) || n < 1 || n > 365) return toast.error('El umbral debe ser un número entre 1 y 365.')
    await c.config.guardar({ diasSinMovimiento: n, diasInhabiles: lista.sort() })
    toast.success('Ajustes de plazos guardados')
  }
  const anioActual = hoy.slice(0, 4)
  const ultimoAnio = feriados.at(-1)?.fecha.slice(0, 4)
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Cómputo y alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardar} className="grid gap-4">
            <Campo etiqueta="Alertar «sin movimiento» desde (días)">
              {(p) => <Input {...p} type="number" min={1} max={365} value={dias} onChange={(e) => setDias(e.target.value)} />}
            </Campo>
            <Campo
              etiqueta="Días inhábiles adicionales"
              ayuda="Uno por línea, formato AAAA-MM-DD. Ej.: días no laborables del Poder Judicial o de la corte."
            >
              {(p) => <Textarea {...p} rows={6} className="font-mono" value={inhabiles} onChange={(e) => setInhabiles(e.target.value)} />}
            </Campo>
            <Button type="submit" className="justify-self-start">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Feriados nacionales cargados</CardTitle>
          <CardDescription>
            Cubre hasta {ultimoAnio ?? '—'}.{' '}
            {ultimoAnio && ultimoAnio <= anioActual && <strong className="text-destructive">Hay que cargar los feriados del próximo año.</strong>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid max-h-80 gap-1 overflow-y-auto text-sm" tabIndex={0} aria-label="Feriados">
            {feriados
              .filter((f) => f.fecha >= `${anioActual}-01-01`)
              .map((f) => (
                <li key={f.fecha} className="flex justify-between gap-2">
                  <span>{f.nombre}</span>
                  <span className="text-muted-foreground tabular-nums">{fecha(f.fecha)}</span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

/** Hoja más probable según su nombre (p. ej. «con codigo» como principal y «sin codigo» como actualizada). */
function sugerirHojas(hojas: string[]): { principal: string; actualizada: string } {
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const principal = hojas.find((h) => /con codigo|laboral/.test(n(h))) ?? hojas[0] ?? ''
  const actualizada = hojas.find((h) => h !== principal && /sin codigo|actualiz/.test(n(h))) ?? ''
  return { principal, actualizada }
}

function Importar() {
  const c = useContenedor()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [hojas, setHojas] = useState<string[]>([])
  const [principal, setPrincipal] = useState('')
  const [actualizada, setActualizada] = useState('')
  const [otroArchivo, setOtroArchivo] = useState<File | null>(null)
  const [hojasOtro, setHojasOtro] = useState<string[]>([])
  const [incluirSinCodigo, setIncluirSinCodigo] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string>()

  const elegirArchivo = async (f: File | null) => {
    setArchivo(f)
    setResultado(null)
    setError(undefined)
    setHojas([])
    if (!f) return
    try {
      const h = await c.excel.hojas(f)
      if (!h.length) throw new Error('El archivo no tiene hojas que se puedan importar.')
      setHojas(h)
      const s = sugerirHojas(h)
      setPrincipal(s.principal)
      setActualizada(s.actualizada)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const elegirOtro = async (f: File | null) => {
    setOtroArchivo(f)
    setResultado(null)
    setHojasOtro([])
    if (!f) return setActualizada(sugerirHojas(hojas).actualizada)
    try {
      const h = await c.excel.hojas(f)
      setHojasOtro(h)
      setActualizada(h.includes(principal) ? principal : (h[0] ?? ''))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const revisar = async () => {
    if (!archivo || !principal) return
    setTrabajando(true)
    setError(undefined)
    try {
      const filasP = await c.excel.leerHoja(archivo, principal)
      const fuente = otroArchivo ?? archivo
      const filasA = actualizada ? await c.excel.leerHoja(fuente, actualizada) : []
      setResultado(importarCuadro(filasP, filasA))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTrabajando(false)
    }
  }

  const confirmar = async () => {
    if (!resultado) return
    setTrabajando(true)
    try {
      const lista = incluirSinCodigo ? [...resultado.expedientes, ...resultado.soloEnActualizado] : resultado.expedientes
      const r = await importarExpedientes(c, lista)
      exito(`${plural(r.creados, 'expediente importado', 'expedientes importados')}`, {
        pose: 'libros',
        descripcion: r.omitidos.length ? `${r.omitidos.length} ya existían y no se tocaron.` : undefined,
      })
      setResultado(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTrabajando(false)
    }
  }

  const hojasActualizada = otroArchivo ? hojasOtro : hojas.filter((h) => h !== principal)
  const archivados = resultado?.expedientes.filter((e) => e.estado === 'archivado').length ?? 0
  const total = (resultado?.expedientes.length ?? 0) + (incluirSinCodigo ? (resultado?.soloEnActualizado.length ?? 0) : 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[1.0625rem] font-semibold">Importar cuadro de expedientes</CardTitle>
        <CardDescription>
          El archivo se lee en tu navegador y solo se abren las hojas que elijas. El código interno sale de la hoja principal; si un expediente
          también está en la hoja actualizada, sus datos más recientes prevalecen.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Campo etiqueta="1. Archivo de Excel (.xlsx)">
          {(p) => <Input {...p} type="file" accept=".xlsx" onChange={(e) => void elegirArchivo(e.target.files?.[0] ?? null)} />}
        </Campo>

        {hojas.length > 0 && (
          <div className="grid animate-entrar gap-4 sm:grid-cols-2">
            <Campo etiqueta="2. Hoja principal (con código)">
              {(p) => (
                <SelectNativo
                  {...p}
                  value={principal}
                  onChange={(e) => {
                    setPrincipal(e.target.value)
                    setResultado(null)
                  }}
                >
                  {hojas.map((h) => (
                    <option key={h} value={h}>
                      {h.trim()}
                    </option>
                  ))}
                </SelectNativo>
              )}
            </Campo>
            <Campo opcional etiqueta="Hoja actualizada (sin código)" ayuda="Aporta los datos más recientes de cada expediente.">
              {(p) => (
                <SelectNativo
                  {...p}
                  value={actualizada}
                  onChange={(e) => {
                    setActualizada(e.target.value)
                    setResultado(null)
                  }}
                >
                  <option value="">No usar</option>
                  {hojasActualizada.map((h) => (
                    <option key={h} value={h}>
                      {h.trim()}
                    </option>
                  ))}
                </SelectNativo>
              )}
            </Campo>
            <details className="text-sm sm:col-span-2">
              <summary className="cursor-pointer text-muted-foreground">¿La hoja actualizada está en otro archivo?</summary>
              <div className="mt-3">
                <Input type="file" accept=".xlsx" aria-label="Archivo con la hoja actualizada" onChange={(e) => void elegirOtro(e.target.files?.[0] ?? null)} />
              </div>
            </details>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {hojas.length > 0 && !resultado && (
          <Button variant="outline" onClick={revisar} disabled={trabajando || !principal} className="justify-self-start">
            <FileSpreadsheetIcon aria-hidden /> {trabajando ? 'Leyendo…' : '3. Revisar antes de importar'}
          </Button>
        )}

        {resultado && (
          <div className="grid animate-entrar gap-5 border-t border-separator pt-6" aria-live="polite">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(
                [
                  ['Listos para importar', resultado.expedientes.length],
                  ['Activos', resultado.expedientes.length - archivados],
                  ['Archivados', archivados],
                  ['Fusionados', resultado.fusionados.length],
                ] as [string, number][]
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="tabular text-2xl font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            {resultado.fusionados.length > 0 && (
              <p className="text-sm">
                <span className="font-medium">Números repetidos que se unen en un solo expediente:</span>{' '}
                {resultado.fusionados.map((f) => f.codigos.join(' / ')).join(' · ')}
              </p>
            )}

            {resultado.soloEnActualizado.length > 0 && (
              <Label className="items-start gap-3 rounded-lg bg-muted/60 p-4 font-normal">
                <Checkbox checked={incluirSinCodigo} onCheckedChange={(v) => setIncluirSinCodigo(Boolean(v))} className="mt-0.5" />
                <span className="grid gap-1">
                  <span className="font-medium">
                    Incluir también {plural(resultado.soloEnActualizado.length, 'expediente que solo está', 'expedientes que solo están')} en la hoja
                    actualizada
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Se importan sin código interno; puedes asignárselo después. {resultado.soloEnActualizado.map((e) => e.numero).join(', ')}
                  </span>
                </span>
              </Label>
            )}

            {resultado.descartadas.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Filas sin número reconocible (no se importan):</p>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {resultado.descartadas.map((d) => (
                    <li key={d.fila}>
                      Fila {d.fila}: «{d.valor}»
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Ver los primeros 10</summary>
              <ul className="mt-2 grid gap-1">
                {resultado.expedientes.slice(0, 10).map((e) => (
                  <li key={e.numero}>
                    {etiquetaExp(e)} · {e.cliente ?? e.demandante ?? '—'} · {e.etapa ?? 'sin etapa'}
                  </li>
                ))}
              </ul>
            </details>

            <div className="flex flex-wrap gap-2">
              <Button onClick={confirmar} disabled={trabajando}>
                {trabajando ? 'Importando…' : `Importar ${plural(total, 'expediente', 'expedientes')}`}
              </Button>
              <Button variant="ghost" onClick={() => setResultado(null)}>
                Volver
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Exportar() {
  const d = useDatos()
  const exportarAcciones = () => {
    const filas = [...d.acciones]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .map((a) => {
        const e = d.expPorId.get(a.expedienteId)
        return {
          Fecha: a.fecha,
          Código: e?.codigo ?? '',
          Expediente: e?.numero ?? '',
          Cliente: e?.cliente ?? '',
          Tipo: a.tipo,
          Detalle: a.descripcion,
          Responsable: a.responsable,
          Cargo: a.cargo ?? '',
          'Próxima acción': a.proxima ?? '',
          'Fecha próxima': a.proximaFecha ?? '',
          Cumplida: a.proximaCumplida ? 'Sí' : 'No',
          Origen: a.origen,
        }
      })
    if (!filas.length) return toast.info('Aún no hay acciones.')
    descargar(`expedita-acciones-${d.hoy}.csv`, generarCSV(filas), 'text/csv;charset=utf-8')
  }
  const exportarExpedientes = () => {
    const filas = d.expedientes.map((e) => ({
      Código: e.codigo ?? '',
      Número: e.numero,
      Estado: e.estado,
      Vía: e.via,
      Etapa: e.etapa ?? '',
      Materia: e.materia ?? '',
      Cliente: e.cliente ?? '',
      Demandante: e.demandante ?? '',
      Demandado: e.demandado ?? '',
      Juzgado: e.organo ?? '',
      Especialista: e.especialista ?? '',
      Distrito: e.distrito ?? '',
      Notas: e.notas ?? '',
    }))
    descargar(`expedita-expedientes-${d.hoy}.csv`, generarCSV(filas), 'text/csv;charset=utf-8')
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[1.0625rem] font-semibold">Exportar</CardTitle>
        <CardDescription>Archivos CSV que abren en Excel o se suben a Google Sheets. Además hay respaldo automático cada noche.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportarAcciones}>
          <DownloadIcon aria-hidden /> Acciones (.csv)
        </Button>
        <Button variant="outline" onClick={exportarExpedientes}>
          <DownloadIcon aria-hidden /> Expedientes (.csv)
        </Button>
      </CardContent>
    </Card>
  )
}

/** RF-39: historial de cambios del estudio, en frases legibles. */
function Actividad() {
  const c = useContenedor()
  const [registros, setRegistros] = useState<RegistroAuditoria[] | null>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    Promise.all([c.auditoria.recientes(150), c.equipo.miembros()])
      .then(([r, m]) => {
        setRegistros(r)
        setMiembros(m)
      })
      .catch((e: Error) => setError(e.message))
  }, [c])

  const nombre = (u?: string) => miembros.find((m) => m.userId === u)?.nombre ?? (u ? 'Ex-miembro' : 'Sistema')
  const hora = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' })

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!registros) return <p className="text-sm text-muted-foreground">Cargando actividad…</p>
  if (!registros.length) return <EstadoVacio pose="leyendo" titulo="Aún no hay actividad registrada" />
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[1.0625rem] font-semibold">Actividad reciente</CardTitle>
        <CardDescription>Los últimos 150 cambios: quién hizo qué y cuándo. Solo lo ven los administradores.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y divide-separator">
          {registros.map((r) => (
            <li key={r.id} className="grid gap-0.5 py-3 sm:grid-cols-[9rem_10rem_1fr] sm:gap-4">
              <span className="text-xs text-muted-foreground tabular sm:text-sm">{hora.format(new Date(r.en))}</span>
              <span className="truncate text-sm font-medium">{nombre(r.usuario)}</span>
              <span className="text-sm">{describirCambio(r)}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

/** Ajustes → Recordatorio: correo diario de lo urgente (RF-42), enviado por un script de Google del estudio. */
function Recordatorio() {
  const c = useContenedor()
  const [copiando, setCopiando] = useState(false)

  const copiar = async () => {
    setCopiando(true)
    try {
      const d = await c.config.datosIntegracion()
      const texto = scriptRecordatorio
        .replace('__SUPABASE_URL__', d.supabaseUrl)
        .replace('__CLAVE_PUBLICA__', d.clavePublica)
        .replace('__CLAVE_ESTUDIO__', d.claveEstudio)
        .replace('__APP_URL__', window.location.origin)
      await navigator.clipboard.writeText(texto)
      toast.success('Script copiado con los datos del estudio', { description: 'Pégalo en script.google.com y ejecuta «activar».' })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCopiando(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Recordatorio diario por correo</CardTitle>
          <CardDescription>
            De lunes a viernes a las 8:00 (hora de Lima) llega a todo el equipo un correo con lo vencido, lo que vence en los próximos 7 días y las
            audiencias de los próximos 3 días. Si no hay nada pendiente, no se envía. Lo envía el Gmail del estudio, sin límites de Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <ol className="grid list-decimal gap-3 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-muted-foreground">
            <li>
              Pulsa{' '}
              <Button variant="outline" size="xs" onClick={copiar} disabled={copiando} className="align-middle">
                <CopyIcon aria-hidden /> {copiando ? 'Preparando…' : 'Copiar script'}
              </Button>{' '}
              (ya incluye los datos del estudio).
            </li>
            <li>
              Con el Gmail del estudio entra a{' '}
              <a className="text-primary underline-offset-2 hover:underline" href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer">
                script.google.com
              </a>
              , crea un proyecto nuevo, pega el script y guarda.
            </li>
            <li>
              Elige la función <strong>activar</strong>, pulsa <strong>Ejecutar</strong> y autoriza. Queda programado.
            </li>
            <li>
              Para probarlo al momento, ejecuta <strong>enviarAhora</strong>: llega el correo a todo el equipo.
            </li>
          </ol>
          <p className="rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
            El script lleva la clave secreta del estudio: no lo compartas fuera del estudio. Para quitar el recordatorio, ejecuta <strong>desactivar</strong>.
          </p>
        </CardContent>
      </Card>
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Quién lo recibe</CardTitle>
          <CardDescription>Todas las personas del equipo (Ajustes → Equipo), en el correo con el que entran a Expedita.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

/** Ajustes → SINOE: conexión con el Gmail que recibe los avisos de notificación. */
function Sinoe() {
  const c = useContenedor()
  const { config } = useDatos()
  const [url, setUrl] = useState(config.gmailUrl && config.gmailUrl !== 'demo' ? config.gmailUrl : '')
  const [clave, setClave] = useState(config.gmailToken && config.gmailToken !== 'demo' ? config.gmailToken : '')
  const [probando, setProbando] = useState(false)
  const [error, setError] = useState<string>()
  const [prueba, setPrueba] = useState<{ total: number; conNumero: number; ejemplos: string[] } | null>(null)

  const copiarScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptGmail)
      toast.success('Script copiado', { description: 'Pégalo en script.google.com.' })
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const guardarYProbar = async (ev: FormEvent) => {
    ev.preventDefault()
    setError(undefined)
    setPrueba(null)
    setProbando(true)
    try {
      const mensajes = await c.gmail.mensajes(url.trim(), clave.trim())
      await c.config.guardar({ gmailUrl: url.trim(), gmailToken: clave.trim() })
      const conNumero = mensajes.filter((m) => extraerDeCorreo(`${m.asunto}\n${m.texto}`).numero).length
      setPrueba({ total: mensajes.length, conNumero, ejemplos: mensajes.slice(0, 5).map((m) => m.asunto) })
      exito('Correo del SINOE conectado', {
        pose: 'documento',
        descripcion: `${mensajes.length} avisos de los últimos 15 días; se registrarán solos en la bandeja.`,
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProbando(false)
    }
  }

  const conectado = Boolean(config.gmailUrl && config.gmailToken && config.gmailUrl !== 'demo')
  const codigo = 'rounded bg-muted px-1 font-mono text-xs'

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Avisos del SINOE desde Gmail</CardTitle>
          <CardDescription>
            Mientras alguien del estudio tenga Expedita abierta, cada 10 minutos se revisa el correo y cada aviso nuevo entra a la bandeja con su
            expediente. El script solo lee; no envía ni borra correos, y no se guarda ninguna contraseña del SINOE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid list-decimal gap-3 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-muted-foreground">
            <li>
              Con la cuenta de Gmail que recibe los avisos, entra a{' '}
              <a className="text-primary underline-offset-2 hover:underline" href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer">
                script.google.com
              </a>{' '}
              y crea un proyecto nuevo.
            </li>
            <li>
              Borra lo que aparece, pega el script{' '}
              <Button variant="outline" size="xs" onClick={copiarScript} className="align-middle">
                <CopyIcon aria-hidden /> Copiar script
              </Button>{' '}
              y guarda.
            </li>
            <li>
              Si los avisos no llegan desde una dirección <code className={codigo}>@pj.gob.pe</code>, ajusta la línea <code className={codigo}>CONSULTA</code> (se escribe igual
              que en el buscador de Gmail).
            </li>
            <li>
              Elige la función <strong>configurar</strong>, pulsa <strong>Ejecutar</strong> y autoriza. En el registro aparece la <strong>CLAVE</strong>.
            </li>
            <li>
              <strong>Implementar → Nueva implementación → Aplicación web</strong>: «Ejecutar como: Yo» y «Quién tiene acceso: Cualquier usuario». Copia la
              URL que termina en <code className={codigo}>/exec</code>.
            </li>
            <li>Pega la URL y la clave aquí y pulsa «Guardar y probar».</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid content-start gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-[1.0625rem] font-semibold">{conectado ? 'Conexión' : 'Datos de conexión'}</CardTitle>
            {conectado && <CardDescription>El correo está conectado y se revisa automáticamente.</CardDescription>}
          </CardHeader>
          <CardContent>
            <form onSubmit={guardarYProbar} noValidate className="grid gap-4">
              <Campo etiqueta="URL del script (termina en /exec)">
                {(p) => <Input {...p} type="url" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />}
              </Campo>
              <Campo etiqueta="Clave" ayuda="La que aparece en el registro al ejecutar «configurar».">
                {(p) => <Input {...p} className="font-mono" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} />}
              </Campo>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={probando || !url.trim() || !clave.trim()} className="justify-self-start">
                {probando ? 'Leyendo el correo…' : 'Guardar y probar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {prueba && (
          <Card className="animate-entrar">
            <CardHeader>
              <CardTitle className="text-[1.0625rem] font-semibold">Resultado</CardTitle>
              <CardDescription>
                {prueba.total} correos encontrados · {prueba.conNumero} con número de expediente
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm">
              {prueba.total === 0 ? (
                <p className="text-muted-foreground">No hay avisos en los últimos 15 días con esa búsqueda. Revisa la línea CONSULTA del script.</p>
              ) : (
                <ul className="grid gap-1 text-muted-foreground">
                  {prueba.ejemplos.map((a, i) => (
                    <li key={i} className="truncate">
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/** Ajustes → Drive: conexión con el script de Google del estudio. */
function Drive() {
  const c = useContenedor()
  const { config, expedientes } = useDatos()
  const [url, setUrl] = useState(config.driveUrl && config.driveUrl !== 'demo' ? config.driveUrl : '')
  const [clave, setClave] = useState(config.driveToken && config.driveToken !== 'demo' ? config.driveToken : '')
  const [probando, setProbando] = useState(false)
  const [error, setError] = useState<string>()
  const [prueba, setPrueba] = useState<{ catalogo: CatalogoDrive; r: ReturnType<typeof emparejar> } | null>(null)

  const copiarScript = async () => {
    try {
      await navigator.clipboard.writeText(scriptDrive)
      toast.success('Script copiado', { description: 'Pégalo en script.google.com.' })
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const guardarYProbar = async (ev: FormEvent) => {
    ev.preventDefault()
    setError(undefined)
    setPrueba(null)
    setProbando(true)
    try {
      const catalogo = await c.drive.catalogo(url.trim(), clave.trim(), true)
      await c.config.guardar({ driveUrl: url.trim(), driveToken: clave.trim() })
      setPrueba({ catalogo, r: emparejar(expedientes, catalogo) })
      exito('Drive conectado', { pose: 'feliz', descripcion: `${catalogo.carpetas.length} carpetas en «${catalogo.raiz}».` })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProbando(false)
    }
  }

  const conectado = Boolean(config.driveUrl && config.driveToken && config.driveUrl !== 'demo')
  const codigo = 'rounded bg-muted px-1 font-mono text-xs'

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Conectar el Drive del estudio</CardTitle>
          <CardDescription>
            Expedita muestra en cada expediente los archivos de la carpeta del cliente. Solo lee nombres y enlaces: los archivos se quedan en el Drive con
            sus permisos de siempre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid list-decimal gap-3 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-muted-foreground">
            <li>
              Con la cuenta dueña del Drive, entra a{' '}
              <a className="text-primary underline-offset-2 hover:underline" href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer">
                script.google.com
              </a>{' '}
              y crea un proyecto nuevo.
            </li>
            <li>
              Borra lo que aparece, pega el script{' '}
              <Button variant="outline" size="xs" onClick={copiarScript} className="align-middle">
                <CopyIcon aria-hidden /> Copiar script
              </Button>{' '}
              y guarda.
            </li>
            <li>
              En la línea <code className={codigo}>CARPETA_RAIZ</code> pega el ID de la carpeta de clientes: lo que va después de{' '}
              <code className={codigo}>/folders/</code> en la dirección de la carpeta.
            </li>
            <li>
              Elige la función <strong>configurar</strong>, pulsa <strong>Ejecutar</strong> y autoriza. En el registro aparece la <strong>CLAVE</strong>.
            </li>
            <li>
              <strong>Implementar → Nueva implementación → Aplicación web</strong>: «Ejecutar como: Yo» y «Quién tiene acceso: Cualquier usuario». Copia la
              URL que termina en <code className={codigo}>/exec</code>.
            </li>
            <li>Pega la URL y la clave aquí y pulsa «Guardar y probar».</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid content-start gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-[1.0625rem] font-semibold">{conectado ? 'Conexión' : 'Datos de conexión'}</CardTitle>
            {conectado && <CardDescription>El Drive está conectado. Puedes cambiar la dirección o la clave y volver a probar.</CardDescription>}
          </CardHeader>
          <CardContent>
            <form onSubmit={guardarYProbar} noValidate className="grid gap-4">
              <Campo etiqueta="URL del script (termina en /exec)">
                {(p) => <Input {...p} type="url" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />}
              </Campo>
              <Campo etiqueta="Clave" ayuda="La que aparece en el registro al ejecutar «configurar».">
                {(p) => <Input {...p} className="font-mono" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} />}
              </Campo>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={probando || !url.trim() || !clave.trim()} className="justify-self-start">
                {probando ? 'Leyendo el Drive…' : 'Guardar y probar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {prueba && (
          <Card className="animate-entrar">
            <CardHeader>
              <CardTitle className="text-[1.0625rem] font-semibold">Resultado</CardTitle>
              <CardDescription>
                {prueba.catalogo.carpetas.length} carpetas en «{prueba.catalogo.raiz}» · {prueba.r.porExpediente.size} de {expedientes.length} expedientes
                con carpeta
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              {prueba.r.sinCarpeta.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-medium">Expedientes sin carpeta ({prueba.r.sinCarpeta.length})</summary>
                  <p className="mt-2 text-muted-foreground">Asígnales su carpeta desde la sección Documentos de cada expediente.</p>
                  <ul className="mt-2 grid gap-1">
                    {prueba.r.sinCarpeta.slice(0, 30).map((e) => (
                      <li key={e.id}>
                        <Link to={`/expedientes/${e.id}`} className="text-primary underline-offset-2 hover:underline">
                          {etiquetaExp(e)}
                        </Link>{' '}
                        · {e.cliente ?? e.demandante ?? 'sin cliente'}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {prueba.r.carpetasSinExpediente.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-medium">Carpetas sin expediente ({prueba.r.carpetasSinExpediente.length})</summary>
                  <ul className="mt-2 grid gap-1 text-muted-foreground">
                    {prueba.r.carpetasSinExpediente.slice(0, 30).map((cp) => (
                      <li key={cp.id}>{cp.nombre}</li>
                    ))}
                  </ul>
                </details>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

const PESTANAS = ['equipo', 'plazos', 'importar', 'exportar', 'sinoe', 'drive', 'recordatorio', 'actividad']

export function Ajustes() {
  const { sesion } = useDatos()
  const [params] = useSearchParams()
  const inicial = PESTANAS.includes(params.get('pestana') ?? '') ? params.get('pestana')! : 'equipo'
  if (sesion.miembro.rol !== 'admin') return <EstadoVacio titulo="Solo los administradores pueden cambiar los ajustes" />
  return (
    <>
      <EncabezadoPagina titulo="Ajustes" descripcion={sesion.orgNombre} />
      <Tabs defaultValue={inicial}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
          <TabsTrigger value="plazos">Plazos</TabsTrigger>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
          <TabsTrigger value="sinoe">SINOE</TabsTrigger>
          <TabsTrigger value="drive">Drive</TabsTrigger>
          <TabsTrigger value="recordatorio">Recordatorio</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>
        <TabsContent value="equipo" className="mt-4">
          <Equipo />
        </TabsContent>
        <TabsContent value="plazos" className="mt-4">
          <Plazos />
        </TabsContent>
        <TabsContent value="importar" className="mt-4">
          <Importar />
        </TabsContent>
        <TabsContent value="exportar" className="mt-4">
          <Exportar />
        </TabsContent>
        <TabsContent value="sinoe" className="mt-4">
          <Sinoe />
        </TabsContent>
        <TabsContent value="drive" className="mt-4">
          <Drive />
        </TabsContent>
        <TabsContent value="recordatorio" className="mt-4">
          <Recordatorio />
        </TabsContent>
        <TabsContent value="actividad" className="mt-4">
          <Actividad />
        </TabsContent>
      </Tabs>
    </>
  )
}
