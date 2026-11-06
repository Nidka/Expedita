import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { editarAccion, eliminarAccion } from '@/application/casos-uso/acciones'
import { TIPOS_ACCION, type Accion, type TipoAccion } from '@/domain/entidades'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor } from '../contexto'
import { exito } from '../notificar'
import { Campo, SelectNativo } from './base'

/** Corrige una acción ya registrada (RF-13). */
export function EditarAccion({ accion, cerrar }: { accion: Accion; cerrar: () => void }) {
  const c = useContenedor()
  const [f, setF] = useState({
    fecha: accion.fecha,
    tipo: accion.tipo,
    descripcion: accion.descripcion,
    responsable: accion.responsable,
    cargo: accion.cargo ?? '',
    proxima: accion.proxima ?? '',
    proximaFecha: accion.proximaFecha ?? '',
    proximaCumplida: accion.proximaCumplida,
  })
  const [error, setError] = useState<string>()
  const [guardando, setGuardando] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    setGuardando(true)
    setError(undefined)
    try {
      await editarAccion(c, accion.id, f)
      exito('Acción corregida', { pose: 'martillo' })
      cerrar()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar acción</DialogTitle>
          <DialogDescription>Los cambios quedan registrados en el historial de auditoría.</DialogDescription>
        </DialogHeader>
        <form id="form-editar-accion" onSubmit={guardar} noValidate className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Fecha">{(p) => <Input {...p} type="date" value={f.fecha} onChange={(e) => set('fecha', e.target.value)} />}</Campo>
          <Campo etiqueta="Tipo">
            {(p) => (
              <SelectNativo {...p} value={f.tipo} onChange={(e) => set('tipo', e.target.value as TipoAccion)}>
                {TIPOS_ACCION.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          <Campo etiqueta="Detalle" className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={3} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />}
          </Campo>
          <Campo etiqueta="Responsable">{(p) => <Input {...p} value={f.responsable} onChange={(e) => set('responsable', e.target.value)} />}</Campo>
          <Campo opcional etiqueta="N.° de cargo">{(p) => <Input {...p} value={f.cargo} onChange={(e) => set('cargo', e.target.value)} />}</Campo>
          <Campo opcional etiqueta="Próxima acción">{(p) => <Input {...p} value={f.proxima} onChange={(e) => set('proxima', e.target.value)} />}</Campo>
          <Campo opcional etiqueta="Fecha límite">
            {(p) => <Input {...p} type="date" value={f.proximaFecha} onChange={(e) => set('proximaFecha', e.target.value)} />}
          </Campo>
          {f.proxima && (
            <Label className="font-normal sm:col-span-2">
              <Checkbox checked={f.proximaCumplida} onCheckedChange={(v) => set('proximaCumplida', Boolean(v))} />
              La próxima acción ya se cumplió
            </Label>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-editar-accion" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Confirmación para eliminar: es irreversible, así que pide confirmar y deja un botón de cancelar. */
export function EliminarAccion({ accion, cerrar }: { accion: Accion; cerrar: () => void }) {
  const c = useContenedor()
  const [borrando, setBorrando] = useState(false)
  const eliminar = async () => {
    setBorrando(true)
    try {
      const r = await eliminarAccion(c, accion)
      toast.success('Acción eliminada', {
        description: r.notificacionReabierta ? 'La notificación que atendía volvió a quedar pendiente.' : undefined,
      })
      cerrar()
    } catch (e) {
      toast.error((e as Error).message)
      setBorrando(false)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Eliminar esta acción?</DialogTitle>
          <DialogDescription>
            «{accion.tipo}» del {accion.fecha}. No se puede deshacer
            {accion.notificacionId ? '; la notificación que atendía volverá a quedar pendiente' : ''}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar} autoFocus>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={eliminar} disabled={borrando}>
            {borrando ? 'Eliminando…' : 'Eliminar acción'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
