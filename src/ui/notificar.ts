import { createElement } from 'react'
import { toast } from 'sonner'
import { Michi, type Pose } from './componentes/marca'

/** Confirmación con Michi en la pose que corresponde a lo que se hizo. */
export function exito(mensaje: string, opciones: { descripcion?: string; pose?: Pose } = {}) {
  toast.success(mensaje, {
    description: opciones.descripcion,
    icon: createElement(Michi, { pose: opciones.pose ?? 'feliz', className: 'size-9' }),
  })
}
