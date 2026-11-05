import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useContenedor } from '../contexto'
import { Campo } from '../componentes/base'
import { Michi } from '../componentes/marca'

function Marco({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-sidebar px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-sidebar-foreground">
          <Michi className="size-16 text-sidebar-primary" />
          <p className="font-heading text-3xl font-semibold">Expedita</p>
          <p className="text-sm opacity-80">Procuración judicial sin plazos perdidos</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl">
              <h1>{titulo}</h1>
            </CardTitle>
            <CardDescription>{descripcion}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  )
}

export function IniciarSesion({ alEntrar }: { alEntrar: () => void }) {
  const c = useContenedor()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enlaceEnviado, setEnlaceEnviado] = useState(false)

  const entrar = async (ev: FormEvent) => {
    ev.preventDefault()
    setEnviando(true)
    try {
      if (password) {
        await c.auth.iniciarSesion(email, password)
        alEntrar()
      } else {
        await c.auth.enviarEnlaceMagico(email)
        setEnlaceEnviado(true)
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  if (enlaceEnviado)
    return (
      <Marco titulo="Revisa tu correo" descripcion={`Enviamos un enlace de acceso a ${email}. Ábrelo en este dispositivo.`}>
        <Button variant="outline" className="w-full" onClick={() => setEnlaceEnviado(false)}>
          Volver
        </Button>
      </Marco>
    )

  return (
    <Marco titulo="Iniciar sesión" descripcion="Usa el correo con el que te invitaron al estudio.">
      <form onSubmit={entrar} className="grid gap-4">
        <Campo etiqueta="Correo" requerido>
          {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Campo>
        <Campo etiqueta="Contraseña" ayuda="Déjala vacía para recibir un enlace de acceso por correo.">
          {(p) => (
            <Input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Campo>
        <Button type="submit" disabled={enviando || !email}>
          {enviando ? 'Entrando…' : password ? 'Entrar' : 'Enviarme un enlace'}
        </Button>
      </form>
    </Marco>
  )
}

export function CrearEstudio({ email, alCrear }: { email: string; alCrear: () => void }) {
  const c = useContenedor()
  const [estudio, setEstudio] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)

  const crear = async (ev: FormEvent) => {
    ev.preventDefault()
    setEnviando(true)
    try {
      await c.auth.crearEstudio(estudio.trim(), nombre.trim())
      alCrear()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Marco
      titulo="Bienvenido"
      descripcion={`${email} todavía no pertenece a ningún estudio. Si te invitaron, pide al administrador que revise tu correo. Si eres el primero, crea el estudio.`}
    >
      <form onSubmit={crear} className="grid gap-4">
        <Campo etiqueta="Nombre del estudio" requerido>
          {(p) => <Input {...p} value={estudio} onChange={(e) => setEstudio(e.target.value)} />}
        </Campo>
        <Campo etiqueta="Tu nombre" requerido>
          {(p) => <Input {...p} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />}
        </Campo>
        <Button type="submit" disabled={enviando || !estudio.trim() || !nombre.trim()}>
          {enviando ? 'Creando…' : 'Crear estudio (serás administrador)'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void c.auth.cerrarSesion().then(() => location.reload())}>
          Usar otra cuenta
        </Button>
      </form>
    </Marco>
  )
}
