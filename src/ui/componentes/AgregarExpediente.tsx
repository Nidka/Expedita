import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2Icon } from '@/ui/iconos'
import { agregarExpediente, distritoConocido } from '@/application/casos-uso/expedientes'
import { ESPECIALIDADES, INSTANCIAS, parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { VIAS, viaPorEspecialidad } from '@/domain/plazos/catalogo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useContenedor, useDatos } from '../contexto'
import { Campo } from './base'
import { exito } from '../notificar'

export function AgregarExpediente({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const c = useContenedor()
  const { expedientes } = useDatos()
  const navegar = useNavigate()
  const [numero, setNumero] = useState('')
  const [codigo, setCodigo] = useState('')
  const [cliente, setCliente] = useState('')
  const [materia, setMateria] = useState('')
  const [guardando, setGuardando] = useState(false)

  const n = parsearNumeroExpediente(numero)
  const existente = n ? expedientes.find((e) => e.numero === n.valor) : undefined
  const distrito = useMemo(() => (n ? distritoConocido(n.valor, expedientes) : undefined), [n, expedientes])
  const materias = useMemo(() => [...new Set(expedientes.map((e) => e.materia).filter(Boolean))].sort(), [expedientes])

  const error = numero.trim() && !n ? 'Revisa el formato: 00000-0000-0-0000-XX-XX-00' : existente ? 'Ya está registrado.' : undefined

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    setGuardando(true)
    try {
      const e = await agregarExpediente(c, { numero, codigo, cliente, materia })
      exito('Expediente agregado', { descripcion: e.numero, pose: 'libros' })
      cerrar()
      navegar(`/expedientes/${e.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar expediente</DialogTitle>
          <DialogDescription>Basta con el número. El resto lo deducimos y puedes completarlo después.</DialogDescription>
        </DialogHeader>
        <form id="form-agregar" onSubmit={guardar} className="grid gap-4">
          <Campo etiqueta="Número de expediente" requerido error={error}>
            {(p) => (
              <Input
                {...p}
                autoFocus
                className="h-11 font-mono text-base tracking-tight"
                placeholder="01234-2025-0-1801-JR-LA-05"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Campo>
          {n && !existente && (
            <div className="flex gap-3 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground" aria-live="polite">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                {ESPECIALIDADES[n.especialidad] ?? n.especialidad} · {INSTANCIAS[n.instancia] ?? n.instancia} n.° {Number(n.juzgado)} · año {n.anio}
                {distrito ? ` · ${distrito}` : ` · distrito ${n.distrito}`}
                <br />
                Vía: {VIAS[viaPorEspecialidad(n.especialidad)].nombre}
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo opcional etiqueta="Código interno">
              {(p) => <Input {...p} placeholder="LA-182" value={codigo} onChange={(e) => setCodigo(e.target.value)} />}
            </Campo>
            <Campo opcional etiqueta="Cliente">
              {(p) => <Input {...p} value={cliente} onChange={(e) => setCliente(e.target.value)} />}
            </Campo>
            <Campo opcional etiqueta="Materia (carpeta)" className="sm:col-span-2">
              {(p) => (
                <>
                  <Input {...p} list="materias-alta" value={materia} onChange={(e) => setMateria(e.target.value)} />
                  <datalist id="materias-alta">
                    {materias.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </>
              )}
            </Campo>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={cerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-agregar" disabled={guardando || !n || Boolean(existente)}>
            {guardando ? 'Agregando…' : 'Agregar expediente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
