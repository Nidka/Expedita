import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Expediente } from '@/domain/entidades'
import { enlaceVigente, type EnlaceCliente } from '@/domain/avance/avance'
import { sumarDias } from '@/domain/shared/fecha'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CopyIcon, ExternalLinkIcon, LinkIcon, ShareIcon, WhatsappIcon } from '@/ui/iconos'
import { useContenedor, useDatos } from '../contexto'
import { SelectNativo } from './base'
import { fecha } from '../formato'

const VIGENCIAS: [string, string][] = [
  ['30', '30 días'],
  ['90', '90 días'],
  ['180', '6 meses'],
  ['', 'Sin vencimiento'],
]

export const urlAvance = (token: string) => `${location.origin}/avance/${token}`

/** RF-40: crea, copia y revoca enlaces privados para que el cliente vea el avance de su expediente. */
export function CompartirAvance({
  exp,
  control,
}: {
  exp: Expediente
  /** Si se pasa, el diálogo lo abre otro (p. ej. el menú «Más») y no se muestra el botón propio */
  control?: { abierto: boolean; setAbierto: (v: boolean) => void }
}) {
  const c = useContenedor()
  const { hoy } = useDatos()
  const [abiertoPropio, setAbiertoPropio] = useState(false)
  const abierto = control?.abierto ?? abiertoPropio
  const setAbierto = control?.setAbierto ?? setAbiertoPropio
  const [enlaces, setEnlaces] = useState<EnlaceCliente[] | null>(null)
  const [vigencia, setVigencia] = useState('90')
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      setEnlaces(await c.enlaces.delExpediente(exp.id))
    } catch {
      setEnlaces([])
      toast.error('No se pudieron cargar los enlaces')
    }
  }, [c, exp.id])

  useEffect(() => {
    if (abierto) void cargar()
  }, [abierto, cargar])

  const vigentes = (enlaces ?? []).filter((e) => enlaceVigente(e, hoy))

  const copiar = async (token: string) => {
    try {
      await navigator.clipboard.writeText(urlAvance(token))
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const crear = async () => {
    setOcupado(true)
    try {
      const e = await c.enlaces.crear(exp.id, vigencia ? sumarDias(hoy, Number(vigencia)) : undefined)
      await cargar()
      await copiar(e.token)
    } catch {
      toast.error('No se pudo crear el enlace')
    } finally {
      setOcupado(false)
    }
  }

  const revocar = async (id: string) => {
    try {
      await c.enlaces.revocar(id)
      await cargar()
      toast.success('Enlace desactivado', { description: 'Quien lo tenga ya no podrá abrirlo.' })
    } catch {
      toast.error('No se pudo desactivar')
    }
  }

  const whatsapp = (token: string) =>
    `https://wa.me/?text=${encodeURIComponent(`Hola, aquí puede revisar el avance de su expediente ${exp.numero}: ${urlAvance(token)}`)}`

  return (
    <>
      {!control && (
        <Button variant="outline" onClick={() => setAbierto(true)}>
          <ShareIcon aria-hidden /> Compartir avance
        </Button>
      )}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartir avance con el cliente</DialogTitle>
            <DialogDescription>
              El cliente verá la etapa, las fechas y tipos de movimiento y sus próximas audiencias. No verá notas, descripciones, responsables ni
              documentos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <SelectNativo aria-label="Vigencia del enlace" value={vigencia} onChange={(e) => setVigencia(e.target.value)} className="sm:w-44">
                {VIGENCIAS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </SelectNativo>
              <Button onClick={crear} disabled={ocupado} className="sm:flex-1">
                <LinkIcon aria-hidden /> {ocupado ? 'Creando…' : 'Crear y copiar enlace'}
              </Button>
            </div>

            <section aria-labelledby="enlaces-activos" className="grid gap-2">
              <h3 id="enlaces-activos" className="text-sm font-medium text-muted-foreground">
                Enlaces activos {enlaces && <span className="tabular">({vigentes.length})</span>}
              </h3>
              {enlaces === null ? (
                <p className="py-3 text-sm text-muted-foreground">Cargando…</p>
              ) : !vigentes.length ? (
                <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">Todavía no has compartido este expediente.</p>
              ) : (
                <ul className="grid divide-y divide-separator rounded-lg shadow-[0_0_0_1px_var(--border)]">
                  {vigentes.map((e) => (
                    <li key={e.id} className="grid gap-2 px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate font-mono text-xs text-muted-foreground" title={urlAvance(e.token)}>
                          …/avance/{e.token.slice(0, 10)}…
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{e.expira ? `Vence el ${fecha(e.expira)}` : 'Sin vencimiento'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => copiar(e.token)}>
                          <CopyIcon aria-hidden /> Copiar
                        </Button>
                        <Button size="sm" variant="outline" render={<a href={whatsapp(e.token)} target="_blank" rel="noreferrer" />} nativeButton={false}>
                          <WhatsappIcon aria-hidden /> WhatsApp
                        </Button>
                        <Button size="sm" variant="ghost" render={<a href={urlAvance(e.token)} target="_blank" rel="noreferrer" />} nativeButton={false}>
                          <ExternalLinkIcon aria-hidden /> Ver
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => revocar(e.id)}>
                          Desactivar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
