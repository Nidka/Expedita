import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { esAdmin } from '@/domain/permisos'
import { CalendarDaysIcon, CopyIcon } from '@/ui/iconos'
import { useContenedor, useDatos } from '../contexto'

/** Clave nueva de 256 bits en hexadecimal (64 caracteres). */
function claveNueva(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const PASOS: [string, string[]][] = [
  [
    'Google Calendar (computadora)',
    ['Abre calendar.google.com.', 'A la izquierda, junto a «Otros calendarios», pulsa «+» → «Desde URL».', 'Pega la dirección y pulsa «Añadir calendario».', 'Aparecerá en tu celular si usas la app de Google Calendar con la misma cuenta.'],
  ],
  ['iPhone', ['Ajustes → Calendario → Cuentas → Añadir cuenta → Otra.', '«Añadir calendario suscrito» y pega la dirección.']],
  ['Outlook', ['Calendario → Agregar calendario → Suscribirse desde la web.', 'Pega la dirección y ponle un nombre.']],
]

/** RF-30: plazos, audiencias y próximas acciones en el calendario de cada abogado, sin conectar cuentas. */
export function SuscribirCalendario() {
  const c = useContenedor()
  const d = useDatos()
  const [abierto, setAbierto] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const token = d.config.tokenCalendario
  const url = token ? `${location.origin}/calendario/${token}.ics` : ''

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Dirección copiada')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const cambiar = async () => {
    if (!window.confirm('La dirección actual dejará de funcionar en todos los calendarios donde se agregó. ¿Continuar?')) return
    setCambiando(true)
    try {
      await c.config.guardar({ tokenCalendario: claveNueva() })
      await d.recargar('config')
      toast.success('Dirección nueva creada', { description: 'Compártela con el equipo para que vuelvan a suscribirse.' })
    } catch {
      toast.error('No se pudo cambiar')
    } finally {
      setCambiando(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAbierto(true)}>
        <CalendarDaysIcon aria-hidden /> Suscribirse
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ver la agenda en tu calendario</DialogTitle>
            <DialogDescription>
              Plazos, audiencias y próximas acciones del estudio en Google Calendar, el iPhone u Outlook. Se actualiza solo, cada pocas horas (lo decide
              cada calendario).
            </DialogDescription>
          </DialogHeader>

          {!url ? (
            <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">Disponible cuando el estudio está conectado a la base de datos.</p>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={url}
                    aria-label="Dirección del calendario"
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-9 min-w-0 flex-1 rounded-lg bg-muted px-3 font-mono text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Button onClick={copiar}>
                    <CopyIcon aria-hidden /> Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Es privada: quien la tenga verá los plazos y audiencias con los nombres de los clientes. No la publiques.
                </p>
              </div>

              <div className="grid gap-4">
                {PASOS.map(([titulo, pasos]) => (
                  <section key={titulo} className="grid gap-1.5">
                    <h3 className="text-sm font-semibold">{titulo}</h3>
                    <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground marker:text-muted-foreground">
                      {pasos.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>

              {esAdmin(d.sesion.miembro) && (
                <div className="flex items-center justify-between gap-3 border-t border-separator pt-4">
                  <p className="text-xs text-muted-foreground">¿Se filtró la dirección o salió alguien del equipo?</p>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={cambiar} disabled={cambiando}>
                    {cambiando ? 'Cambiando…' : 'Cambiar dirección'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
