import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useContenedor, useDatos } from '../contexto'
import { Campo, EncabezadoPagina } from '../componentes/base'
import { exito } from '../notificar'

export const CLAVE_DEFINIDA = 'expedita.clave-definida'

export function marcarClaveDefinida() {
  try {
    localStorage.setItem(CLAVE_DEFINIDA, '1')
  } catch {
    /* sin almacenamiento */
  }
}

export function Cuenta() {
  const c = useContenedor()
  const { sesion } = useDatos()
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState<string>()
  const [guardando, setGuardando] = useState(false)

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault()
    if (nueva.length < 10) return setError('Usa al menos 10 caracteres.')
    if (nueva !== repetir) return setError('Las contraseñas no coinciden.')
    setError(undefined)
    setGuardando(true)
    try {
      await c.auth.cambiarClave(nueva)
      marcarClaveDefinida()
      setNueva('')
      setRepetir('')
      exito('Contraseña guardada', { pose: 'feliz', descripcion: 'La próxima vez entra con «Usar mi contraseña».' })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Mi cuenta" descripcion={`${sesion.miembro.nombre} · ${sesion.miembro.rol === 'admin' ? 'Administrador' : 'Abogado'} · ${sesion.orgNombre}`} />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-[1.0625rem] font-semibold">Contraseña</CardTitle>
          <CardDescription>
            Con una contraseña entras al instante, sin esperar el enlace por correo. Correo de acceso: <strong className="font-medium text-foreground">{sesion.miembro.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardar} noValidate className="grid gap-4">
            <Campo etiqueta="Nueva contraseña" ayuda="Al menos 10 caracteres. Mejor una frase que puedas recordar.">
              {(p) => <Input {...p} type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Repite la contraseña" error={error}>
              {(p) => <Input {...p} type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />}
            </Campo>
            <Button type="submit" disabled={guardando} className="justify-self-start">
              {guardando ? 'Guardando…' : 'Guardar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
