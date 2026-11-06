import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Expediente } from '@/domain/entidades'
import { buscarCarpeta, carpetaDeCliente, carpetaDeExpediente, similitud, type ArchivoDrive, type CatalogoDrive, type CarpetaDrive } from '@/domain/documentos/drive'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  DriveIcon,
  ExternalLinkIcon,
  FileDocIcon,
  FileIcon,
  FileImageIcon,
  FilePdfIcon,
  FileXlsIcon,
  FolderOpenIcon,
  RefreshIcon,
} from '@/ui/iconos'
import { useContenedor, useDatos } from '../contexto'
import { BotonEnlace, SelectNativo } from './base'

// ---------- Catálogo del Drive con caché compartida (5 min) ----------

type EstadoDrive =
  | { tipo: 'sin-conexion' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; catalogo: CatalogoDrive }

let cache: { clave: string; en: number; promesa: Promise<CatalogoDrive> } | null = null
const VIGENCIA = 5 * 60_000

export function useDrive() {
  const c = useContenedor()
  const { config } = useDatos()
  const url = config.driveUrl
  const clave = config.driveToken
  const [estado, setEstado] = useState<EstadoDrive>({ tipo: url && clave ? 'cargando' : 'sin-conexion' })

  const cargar = useCallback(
    async (fresco = false) => {
      if (!url || !clave) return setEstado({ tipo: 'sin-conexion' })
      const k = `${url}|${clave}`
      if (fresco || !cache || cache.clave !== k || Date.now() - cache.en > VIGENCIA) {
        cache = { clave: k, en: Date.now(), promesa: c.drive.catalogo(url, clave, fresco) }
      }
      setEstado({ tipo: 'cargando' })
      try {
        setEstado({ tipo: 'listo', catalogo: await cache.promesa })
      } catch (e) {
        cache = null
        setEstado({ tipo: 'error', mensaje: (e as Error).message })
      }
    },
    [c, url, clave],
  )

  useEffect(() => {
    void cargar()
  }, [cargar])

  return { estado, recargar: () => cargar(true) }
}

// ---------- Presentación ----------

function IconoArchivo({ tipo }: { tipo: string }) {
  const comun = 'size-5 shrink-0'
  if (tipo.includes('pdf')) return <FilePdfIcon className={cn(comun, 'text-destructive')} aria-hidden />
  if (tipo.includes('word') || tipo.includes('document')) return <FileDocIcon className={cn(comun, 'text-info-foreground')} aria-hidden />
  if (tipo.includes('sheet') || tipo.includes('excel')) return <FileXlsIcon className={cn(comun, 'text-success')} aria-hidden />
  if (tipo.startsWith('image/')) return <FileImageIcon className={cn(comun, 'text-ocre-texto')} aria-hidden />
  return <FileIcon className={cn(comun, 'text-muted-foreground')} aria-hidden />
}

const FECHA = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' })

function ListaArchivos({ archivos }: { archivos: ArchivoDrive[] }) {
  const ordenados = [...archivos].sort((a, b) => b.actualizado.localeCompare(a.actualizado))
  if (!ordenados.length) return <p className="py-2 text-sm text-muted-foreground">La carpeta está vacía.</p>
  return (
    <ul className="divide-y divide-separator">
      {ordenados.map((a) => (
        <li key={a.id}>
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-md py-2.5 outline-none hover:bg-muted/50 focus-visible:bg-muted"
          >
            <IconoArchivo tipo={a.tipo} />
            <span className="min-w-0 flex-1 truncate text-sm group-hover:underline">{a.nombre}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular">{FECHA.format(new Date(a.actualizado))}</span>
            <span className="sr-only"> (se abre en Drive)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

/** Asignación manual cuando no se encontró la carpeta del cliente: las más parecidas primero. */
function AsignarCarpeta({ exp, catalogo }: { exp: Expediente; catalogo: CatalogoDrive }) {
  const c = useContenedor()
  const nombre = exp.cliente || exp.demandante || ''
  const opciones = useMemo(
    () => [...catalogo.carpetas].sort((a, b) => similitud(nombre, b.nombre) - similitud(nombre, a.nombre) || a.nombre.localeCompare(b.nombre, 'es')),
    [catalogo, nombre],
  )
  const [elegida, setElegida] = useState('')
  const guardar = async () => {
    if (!elegida) return
    await c.expedientes.actualizar(exp.id, { driveCarpetaId: elegida })
    toast.success('Carpeta asignada')
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        No encontramos una carpeta para <strong className="font-medium text-foreground">{nombre || 'este cliente'}</strong> en «{catalogo.raiz}». Elígela una vez y quedará
        asignada.
      </p>
      <div className="flex flex-wrap gap-2">
        <SelectNativo aria-label="Carpeta del Drive" value={elegida} onChange={(e) => setElegida(e.target.value)} className="min-w-56 flex-1">
          <option value="">Elegir carpeta…</option>
          {opciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </SelectNativo>
        <Button onClick={guardar} disabled={!elegida}>
          Asignar
        </Button>
      </div>
    </div>
  )
}

/** RF-34: documentos del expediente, leídos del Drive del estudio. */
export function SeccionDocumentos({ exp }: { exp: Expediente }) {
  const c = useContenedor()
  const { sesion } = useDatos()
  const { estado, recargar } = useDrive()

  // Carpeta del expediente y, si es una subcarpeta, la carpeta general del cliente (DNI, contratos…)
  const { carpeta, delCliente } = useMemo((): { carpeta?: CarpetaDrive; delCliente?: CarpetaDrive } => {
    if (estado.tipo !== 'listo') return {}
    if (exp.driveCarpetaId) return { carpeta: buscarCarpeta(estado.catalogo, exp.driveCarpetaId) }
    const cliente = carpetaDeCliente(exp, estado.catalogo.carpetas)
    if (!cliente) return {}
    const propia = carpetaDeExpediente(exp.numero, cliente)
    return { carpeta: propia, delCliente: propia.id !== cliente.id ? cliente : undefined }
  }, [estado, exp])

  const cabecera = (
    <CardHeader className="flex flex-row items-center justify-between gap-2">
      <CardTitle className="flex items-center gap-2 text-[1.0625rem] font-semibold">
        <DriveIcon className="size-5 text-muted-foreground" aria-hidden /> Documentos
      </CardTitle>
      {estado.tipo === 'listo' && (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => void recargar()} aria-label="Actualizar desde Drive" title="Actualizar desde Drive">
            <RefreshIcon />
          </Button>
          {carpeta && (
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={carpeta.url} target="_blank" rel="noreferrer" />}>
              <FolderOpenIcon aria-hidden /> Abrir en Drive<span className="sr-only"> (otra pestaña)</span>
            </Button>
          )}
        </div>
      )}
    </CardHeader>
  )

  return (
    <Card>
      {cabecera}
      <CardContent className="grid gap-3">
        {estado.tipo === 'sin-conexion' &&
          (sesion.miembro.rol === 'admin' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Conecta el Drive del estudio para ver aquí los escritos, resoluciones y documentos del cliente.</p>
              <BotonEnlace a="/ajustes?pestana=drive" variant="outline" size="sm">
                Conectar Drive
              </BotonEnlace>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">El Drive del estudio aún no está conectado. Pídeselo a quien administra Expedita.</p>
          ))}
        {estado.tipo === 'cargando' && (
          <div className="grid gap-2" aria-busy="true" aria-label="Cargando documentos">
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        )}
        {estado.tipo === 'error' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-destructive">
              {estado.mensaje}
            </p>
            <Button variant="outline" size="sm" onClick={() => void recargar()}>
              Reintentar
            </Button>
          </div>
        )}
        {estado.tipo === 'listo' &&
          (carpeta ? (
            <>
              <p className="text-xs text-muted-foreground">
                Carpeta: <span className="font-medium text-foreground">{carpeta.nombre}</span>
                {exp.driveCarpetaId ? ' (asignada a mano)' : ''}
                {carpeta.subcarpetas.length > 0 && ` · ${carpeta.subcarpetas.length} subcarpeta${carpeta.subcarpetas.length > 1 ? 's' : ''}`}
                {exp.driveCarpetaId && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() => void c.expedientes.actualizar(exp.id, { driveCarpetaId: undefined }).then(() => toast.success('Asignación quitada'))}
                    >
                      Quitar asignación
                    </button>
                  </>
                )}
              </p>
              <ListaArchivos archivos={carpeta.archivos} />
              {delCliente && delCliente.archivos.length > 0 && (
                <details className="rounded-lg">
                  <summary className="cursor-pointer py-1 text-sm font-medium">
                    Documentos generales del cliente <span className="font-normal text-muted-foreground">· {delCliente.archivos.length}</span>
                  </summary>
                  <div className="pl-2">
                    <ListaArchivos archivos={delCliente.archivos} />
                  </div>
                </details>
              )}
              {carpeta.subcarpetas.map((s) => (
                <details key={s.id} className="rounded-lg">
                  <summary className="cursor-pointer py-1 text-sm font-medium">
                    {s.nombre} <span className="font-normal text-muted-foreground">· {s.archivos.length}</span>
                  </summary>
                  <div className="pl-2">
                    <ListaArchivos archivos={s.archivos} />
                    <a href={s.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Abrir subcarpeta <ExternalLinkIcon className="size-3" aria-hidden />
                    </a>
                  </div>
                </details>
              ))}
            </>
          ) : (
            <AsignarCarpeta exp={exp} catalogo={estado.catalogo} />
          ))}
      </CardContent>
    </Card>
  )
}
