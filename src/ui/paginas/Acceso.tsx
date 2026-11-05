import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useContenedor } from '../contexto'
import { Campo } from '../componentes/base'
import { Michi } from '../componentes/marca'

const BENEFICIOS: { icono: string; titulo: string; texto: string }[] = [
  { icono: 'icono-balanza', titulo: 'Plazos en días hábiles', texto: 'Feriados, inhábiles y efecto de la casilla electrónica incluidos.' },
  { icono: 'icono-pergamino', titulo: 'Notificaciones con su plazo', texto: 'Pega el aviso del SINOE y el vencimiento queda en la agenda.' },
  { icono: 'icono-libro', titulo: 'Todo el expediente en un lugar', texto: 'Acciones, audiencias, visitas y el historial del impulso.' },
]

const ILUSTRACIONES = import.meta.glob<string>('../../assets/michi/icono-*.webp', { eager: true, import: 'default', query: '?url' })

function Marco({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca (escritorio) */}
      <aside className="relative hidden overflow-hidden bg-[#1F3B57] text-white lg:flex lg:flex-col lg:justify-between lg:p-14" aria-label="Expedita">
        <div className="flex items-center gap-2.5">
          <Michi pose="sentado" className="size-10 [filter:drop-shadow(0_0_1px_rgb(255_255_255/0.6))]" />
          <span className="text-lg font-bold tracking-tight">Expedita</span>
        </div>
        <div className="grid max-w-md gap-10">
          <div className="animate-entrar">
            <p className="text-[2.5rem] leading-[1.1] font-bold tracking-tight">Ningún plazo del Poder Judicial se te pasa.</p>
            <p className="mt-4 text-[1.0625rem] text-white/75">Procuración judicial para estudios que litigan en el Perú.</p>
          </div>
          <ul className="escalonar grid gap-6">
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10">
                  <img src={ILUSTRACIONES[`../../assets/michi/${b.icono}.webp`]} alt="" className="size-9 object-contain" />
                </span>
                <span>
                  <span className="block font-semibold">{b.titulo}</span>
                  <span className="block text-sm text-white/70">{b.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Michi pose="leyendo" className="pointer-events-none absolute -right-6 bottom-6 size-56 opacity-95 [filter:drop-shadow(0_0_1px_rgb(255_255_255/0.5))]" />
      </aside>

      {/* Formulario */}
      <main className="grid place-items-center px-6 py-12">
        <div className="w-full max-w-sm animate-entrar">
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
            <Michi pose="saludando" className="size-24 lg:hidden" />
            <h1 className="text-[1.75rem] font-bold tracking-tight">{titulo}</h1>
            <p className="text-[0.9375rem] text-muted-foreground">{descripcion}</p>
          </div>
          {children}
          <p className="mt-10 text-center text-xs text-muted-foreground lg:text-left">
            Tus datos y los de tus clientes quedan solo en el espacio de tu estudio.
          </p>
        </div>
      </main>
    </div>
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
