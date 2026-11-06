import { useMemo, useState } from 'react'
import { previsualizarPlazo } from '@/application/casos-uso/notificaciones'
import type { Notificacion } from '@/domain/entidades'
import { parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { actosDeVia, viaPorEspecialidad } from '@/domain/plazos/catalogo'
import { fechaEfecto } from '@/domain/plazos/computo'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useContenedor, useDatos } from '../contexto'
import { exito } from '../notificar'
import { Campo, SelectNativo } from './base'

/** Completa el plazo de un aviso ya registrado (p. ej. los que llegan solos del SINOE). */
export function DefinirPlazo({ notificacion, cerrar }: { notificacion: Notificacion; cerrar: () => void }) {
  const c = useContenedor()
  const d = useDatos()
  const exp = notificacion.expedienteId ? d.expPorId.get(notificacion.expedienteId) : undefined
  const via = exp?.via ?? viaPorEspecialidad(parsearNumeroExpediente(notificacion.numero)?.especialidad ?? '')
  const actos = actosDeVia(via)
  const [actoId, setActoId] = useState(notificacion.actoId ?? '')
  const [casilla, setCasilla] = useState(notificacion.casilla)
  const [manual, setManual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const computo = useMemo(() => previsualizarPlazo(d.calendario, { recibido: notificacion.recibido, casilla, actoId }), [d.calendario, notificacion.recibido, casilla, actoId])

  const guardar = async () => {
    setGuardando(true)
    try {
      await c.notificaciones.actualizar(notificacion.id, {
        actoId: actoId || undefined,
        casilla,
        efecto: computo?.efecto ?? fechaEfecto(d.calendario, notificacion.recibido, casilla),
        vencimiento: manual || computo?.vencimiento,
      })
      exito('Plazo definido', { pose: 'balanza', descripcion: manual || computo?.vencimiento ? `Vence el ${manual || computo?.vencimiento}` : undefined })
      cerrar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Definir plazo</DialogTitle>
          <DialogDescription>
            {notificacion.asunto} · notificada el {notificacion.recibido}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Campo etiqueta="Acto a cumplir">
            {(p) => (
              <SelectNativo {...p} value={actoId} onChange={(e) => setActoId(e.target.value)} autoFocus>
                <option value="">Sin plazo del catálogo</option>
                {actos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} — {a.dias} {a.unidad === 'naturales' ? 'naturales' : 'hábiles'}
                  </option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          <Label className="font-normal">
            <Checkbox checked={casilla} onCheckedChange={(v) => setCasilla(Boolean(v))} />
            Notificada por casilla electrónica (surte efecto al 2.º día hábil)
          </Label>
          {computo && <p className="text-sm">{computo.detalle}</p>}
          <Campo opcional etiqueta="Vencimiento fijado por la resolución" ayuda="Solo si la resolución fija un plazo propio; reemplaza al cálculo.">
            {(p) => <Input {...p} type="date" value={manual} onChange={(e) => setManual(e.target.value)} />}
          </Campo>
          {notificacion.texto && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Ver el texto del aviso</summary>
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs">{notificacion.texto}</p>
            </details>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando || (!actoId && !manual)}>
            {guardando ? 'Guardando…' : 'Guardar plazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
