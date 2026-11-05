import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { DownloadIcon, FileSpreadsheetIcon, Trash2Icon, UserPlusIcon } from 'lucide-react'
import { importarExpedientes } from '@/application/casos-uso/importar'
import { descargar, generarCSV } from '@/application/exportar'
import type { Invitacion } from '@/application/ports'
import type { Miembro, Rol } from '@/domain/entidades'
import { importarCuadro, type ResultadoImportacion } from '@/domain/expediente/importacion'
import { esFechaISO } from '@/domain/shared/fecha'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor, useDatos } from '../contexto'
import { Campo, EncabezadoPagina, EstadoVacio, SelectNativo } from '../componentes/base'
import { etiquetaExp, fecha, plural } from '../formato'

function Equipo() {
  const c = useContenedor()
  const { sesion } = useDatos()
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [invs, setInvs] = useState<Invitacion[]>([])
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('abogado')

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
            <Campo etiqueta="Rol">
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

const HOJAS = ['CASOS LABORALES', 'CASOS CIVILES', 'COMERCIALES', 'ADMINISTRATIVO', 'CONSTITUCIONAL', 'GESTIÓN DE CRÉDITOS', 'CASOS JUDICIALES - GAMALIEL']

function Importar() {
  const c = useContenedor()
  const [principal, setPrincipal] = useState<File | null>(null)
  const [actualizado, setActualizado] = useState<File | null>(null)
  const [hoja, setHoja] = useState(HOJAS[0])
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  const previsualizar = async () => {
    if (!principal) return toast.error('Elige el cuadro principal (el que tiene la columna CODIGO).')
    setTrabajando(true)
    try {
      const filasP = await c.excel.leerHoja(principal, hoja)
      const filasA = actualizado ? await c.excel.leerHoja(actualizado, hoja).catch(() => []) : []
      setResultado(importarCuadro(filasP, filasA))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTrabajando(false)
    }
  }

  const confirmar = async () => {
    if (!resultado) return
    setTrabajando(true)
    try {
      const r = await importarExpedientes(c, resultado.expedientes)
      toast.success(`${plural(r.creados, 'expediente importado', 'expedientes importados')}`, {
        description: r.omitidos.length ? `${r.omitidos.length} ya existían y no se tocaron.` : undefined,
      })
      setResultado(null)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[1.0625rem] font-semibold">Importar cuadro de expedientes</CardTitle>
        <CardDescription>
          Se lee solo la hoja elegida, en tu navegador. La «Hoja 8» nunca se abre. Si un número aparece en el cuadro actualizado, sus datos
          prevalecen; el código interno sale siempre del cuadro principal.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Cuadro principal (con CODIGO)" requerido>
            {(p) => <Input {...p} type="file" accept=".xlsx" onChange={(e) => setPrincipal(e.target.files?.[0] ?? null)} />}
          </Campo>
          <Campo opcional etiqueta="Cuadro actualizado">
            {(p) => <Input {...p} type="file" accept=".xlsx" onChange={(e) => setActualizado(e.target.files?.[0] ?? null)} />}
          </Campo>
          <Campo etiqueta="Hoja">
            {(p) => (
              <SelectNativo {...p} value={hoja} onChange={(e) => setHoja(e.target.value)}>
                {HOJAS.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </SelectNativo>
            )}
          </Campo>
        </div>
        <Button variant="outline" onClick={previsualizar} disabled={trabajando || !principal} className="justify-self-start">
          <FileSpreadsheetIcon aria-hidden /> {trabajando && !resultado ? 'Leyendo…' : 'Revisar antes de importar'}
        </Button>

        {resultado && (
          <div className="grid gap-4 border-t border-separator pt-6" aria-live="polite">
            <p className="font-medium">
              {plural(resultado.expedientes.length, 'expediente listo', 'expedientes listos')} ·{' '}
              {resultado.expedientes.filter((e) => e.estado === 'archivado').length} archivados
            </p>
            {resultado.fusionados.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Números repetidos que se fusionarán:</p>
                <ul className="list-disc pl-5">
                  {resultado.fusionados.map((f) => (
                    <li key={f.numero}>
                      {f.numero} ({f.codigos.join(' / ')})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultado.descartadas.length > 0 && (
              <div className="text-sm">
                <p className="font-medium">Filas sin número reconocible (no se importan):</p>
                <ul className="list-disc pl-5">
                  {resultado.descartadas.map((d) => (
                    <li key={d.fila}>
                      Fila {d.fila}: «{d.valor}»
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <details className="text-sm">
              <summary className="cursor-pointer">Ver los primeros 10</summary>
              <ul className="mt-2 grid gap-1">
                {resultado.expedientes.slice(0, 10).map((e) => (
                  <li key={e.numero}>
                    {etiquetaExp(e)} · {e.cliente ?? e.demandante ?? '—'} · {e.etapa ?? 'sin etapa'}
                  </li>
                ))}
              </ul>
            </details>
            <div className="flex gap-2">
              <Button onClick={confirmar} disabled={trabajando}>
                {trabajando ? 'Importando…' : 'Importar'}
              </Button>
              <Button variant="ghost" onClick={() => setResultado(null)}>
                Cancelar
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

export function Ajustes() {
  const { sesion } = useDatos()
  if (sesion.miembro.rol !== 'admin') return <EstadoVacio titulo="Solo los administradores pueden cambiar los ajustes" />
  return (
    <>
      <EncabezadoPagina titulo="Ajustes" descripcion={sesion.orgNombre} />
      <Tabs defaultValue="equipo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="equipo">Equipo</TabsTrigger>
          <TabsTrigger value="plazos">Plazos</TabsTrigger>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
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
      </Tabs>
    </>
  )
}
