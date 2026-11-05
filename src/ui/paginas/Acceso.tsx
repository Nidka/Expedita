import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, Loader2Icon, LockIcon, MailIcon, ShieldCheckIcon } from '@/ui/iconos'
import { useContenedor } from '../contexto'
import { Michi } from '../componentes/marca'

const ILUSTRACIONES = import.meta.glob<string>('../../assets/michi/icono-*.webp', { eager: true, import: 'default', query: '?url' })
const ilustracion = (n: string) => ILUSTRACIONES[`../../assets/michi/${n}.webp`]

const BENEFICIOS = [
  { icono: 'icono-balanza', titulo: 'Plazos en días hábiles', texto: 'Feriados, inhábiles y efecto de la casilla electrónica incluidos.' },
  { icono: 'icono-pergamino', titulo: 'Notificaciones con su plazo', texto: 'Pega el aviso del SINOE y el vencimiento queda en la agenda.' },
  { icono: 'icono-libro', titulo: 'El expediente completo', texto: 'Acciones, audiencias, visitas y el historial del impulso.' },
]

/** Panel de marca (solo escritorio). Sobrio: un color sólido, tipografía grande y las ilustraciones de Michi. */
function PanelMarca() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#16263A] text-white lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12 xl:px-20" aria-label="Expedita">
      <div className="flex items-center gap-2.5">
        <Michi pose="sentado" className="size-9 [filter:drop-shadow(0_0_1px_rgb(255_255_255/0.6))]" />
        <span className="text-[1.0625rem] font-bold tracking-tight">Expedita</span>
      </div>

      <div className="relative z-10 grid max-w-md gap-12">
        <div className="animate-entrar">
          <p className="mb-5 h-px w-12 bg-ocre" aria-hidden />
          <p className="text-[2.625rem] leading-[1.08] font-bold tracking-tight">Ningún plazo del Poder Judicial se te pasa.</p>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-white/70">Procuración judicial para estudios que litigan en el Perú.</p>
        </div>
        <ul className="escalonar grid gap-7">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="flex items-start gap-4">
              <img src={ilustracion(b.icono)} alt="" className="size-10 shrink-0 object-contain" />
              <span>
                <span className="block text-[0.9375rem] font-semibold">{b.titulo}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-white/60">{b.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-end justify-between gap-6">
        <p className="max-w-xs text-xs leading-relaxed text-white/45">
          Cálculo referencial según el CPC, la NLPT y la Ley 27584. Verifica siempre el plazo en la resolución.
        </p>
        <Michi pose="leyendo" className="pointer-events-none size-44 shrink-0 animate-flotar [filter:drop-shadow(0_0_1px_rgb(255_255_255/0.5))]" />
      </div>
    </aside>
  )
}

/** Estructura común de las pantallas de acceso. */
function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <PanelMarca />
      <main className="flex flex-col px-6 py-10 sm:px-10">
        <div className="flex items-center gap-2 lg:hidden">
          <Michi pose="sentado" className="size-8" />
          <span className="font-bold tracking-tight">Expedita</span>
        </div>
        <div className="m-auto w-full max-w-[22rem] animate-entrar py-10">{children}</div>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 shrink-0" aria-hidden />
          Tus datos y los de tus clientes quedan solo en el espacio de tu estudio.
        </p>
      </main>
    </div>
  )
}

function Encabezado({ titulo, texto }: { titulo: string; texto: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{texto}</p>
    </div>
  )
}

/** Campo con ícono a la izquierda y botón opcional a la derecha. */
function CampoIcono({
  id,
  etiqueta,
  icono,
  derecha,
  error,
  ...props
}: {
  id: string
  etiqueta: string
  icono: ReactNode
  derecha?: ReactNode
  error?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[0.8125rem] font-medium">
        {etiqueta}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden>
          {icono}
        </span>
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn('h-11 pl-10 text-[0.9375rem] sm:h-11', derecha && 'pr-11')}
          {...props}
        />
        {derecha && <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{derecha}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function BotonPrincipal({ cargando, children, disabled }: { cargando: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <Button type="submit" size="lg" className="mt-2 h-11 w-full text-[0.9375rem]" disabled={cargando || disabled}>
      {cargando ? <Loader2Icon className="size-5 animate-spin" aria-hidden /> : null}
      {children}
      {!cargando && <ArrowRightIcon className="size-4" aria-hidden />}
    </Button>
  )
}

type Modo = 'enlace' | 'clave'

export function IniciarSesion({ alEntrar }: { alEntrar: () => void }) {
  const c = useContenedor()
  const [modo, setModo] = useState<Modo>('enlace')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string>()
  const [enviadoA, setEnviadoA] = useState<string>()
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [espera])

  const enviarEnlace = async (destino: string) => {
    await c.auth.enviarEnlaceMagico(destino)
    setEnviadoA(destino)
    setEspera(60)
  }

  const entrar = async (ev: FormEvent) => {
    ev.preventDefault()
    setError(undefined)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Escribe un correo válido.')
    if (modo === 'clave' && !password) return setError('Escribe tu contraseña.')
    setEnviando(true)
    try {
      if (modo === 'clave') {
        await c.auth.iniciarSesion(email.trim(), password)
        alEntrar()
      } else {
        await enviarEnlace(email.trim())
      }
    } catch (e) {
      const m = (e as Error).message
      setError(/rate limit|too many/i.test(m) ? 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.' : m)
    } finally {
      setEnviando(false)
    }
  }

  if (enviadoA)
    return (
      <Marco>
        <div className="flex flex-col items-start">
          <Michi pose="documento" className="mb-4 size-24" />
          <Encabezado
            titulo="Revisa tu correo"
            texto={
              <>
                Enviamos un enlace de acceso a <strong className="font-semibold text-foreground">{enviadoA}</strong>. Ábrelo en este mismo
                dispositivo para entrar. Si no lo ves, revisa la carpeta de spam.
              </>
            }
          />
          <div className="grid w-full gap-2">
            <Button
              variant="outline"
              size="lg"
              className="h-11 w-full"
              disabled={espera > 0 || enviando}
              onClick={async () => {
                setEnviando(true)
                try {
                  await enviarEnlace(enviadoA)
                } catch (e) {
                  setError((e as Error).message)
                } finally {
                  setEnviando(false)
                }
              }}
            >
              {espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar enlace'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setEnviadoA(undefined)}>
              <ArrowLeftIcon className="size-4" aria-hidden /> Usar otro correo
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </Marco>
    )

  return (
    <Marco>
      <Encabezado titulo="Bienvenido a Expedita" texto="Inicia sesión con el correo con el que te invitaron al estudio." />

      {/* Selector de método (control segmentado) */}
      <div role="tablist" aria-label="Método de acceso" className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
        {(
          [
            ['enlace', 'Enlace por correo'],
            ['clave', 'Contraseña'],
          ] as [Modo, string][]
        ).map(([m, texto]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => {
              setModo(m)
              setError(undefined)
            }}
            className={cn(
              'h-9 rounded-md text-sm font-medium outline-none transition-all duration-200 ease-(--ease-apple) focus-visible:ring-3 focus-visible:ring-ring/25',
              modo === m ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06),0_0_0_1px_var(--border)]' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {texto}
          </button>
        ))}
      </div>

      <form onSubmit={entrar} noValidate className="grid gap-4">
        <CampoIcono
          id="correo"
          etiqueta="Correo"
          icono={<MailIcon className="size-[1.125rem]" />}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          placeholder="nombre@estudio.pe"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={modo === 'enlace' ? error : undefined}
        />

        {modo === 'clave' && (
          <div className="animate-entrar">
            <CampoIcono
              id="clave"
              etiqueta="Contraseña"
              icono={<LockIcon className="size-[1.125rem]" />}
              type={verClave ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={error}
              derecha={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verClave}
                >
                  {verClave ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              }
            />
          </div>
        )}

        <BotonPrincipal cargando={enviando}>
          {modo === 'enlace' ? (enviando ? 'Enviando enlace…' : 'Enviarme un enlace') : enviando ? 'Entrando…' : 'Iniciar sesión'}
        </BotonPrincipal>
      </form>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {modo === 'enlace'
          ? 'Te llegará un enlace para entrar sin contraseña. Es la forma más segura.'
          : '¿Aún no tienes contraseña? Usa el enlace por correo.'}
      </p>

      <div className="my-8 h-px bg-separator" aria-hidden />
      <p className="text-sm text-muted-foreground">
        ¿No tienes acceso? Pide a la persona que administra tu estudio que te invite desde <strong className="font-medium text-foreground">Ajustes → Equipo</strong>.
      </p>
    </Marco>
  )
}

export function CrearEstudio({ email, alCrear }: { email: string; alCrear: () => void }) {
  const c = useContenedor()
  const [estudio, setEstudio] = useState('')
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string>()

  const crear = async (ev: FormEvent) => {
    ev.preventDefault()
    setError(undefined)
    setEnviando(true)
    try {
      await c.auth.crearEstudio(estudio.trim(), nombre.trim())
      alCrear()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Marco>
      <Michi pose="saludando" className="mb-4 size-24" />
      <Encabezado
        titulo="Crea tu estudio"
        texto={
          <>
            <strong className="font-semibold text-foreground">{email}</strong> todavía no pertenece a ningún estudio. Si eres la primera persona, créalo
            aquí y serás su administradora. Si te invitaron, pide que revisen tu correo.
          </>
        }
      />
      <form onSubmit={crear} className="grid gap-4">
        <div className="grid gap-1.5">
          <label htmlFor="estudio" className="text-[0.8125rem] font-medium">
            Nombre del estudio
          </label>
          <Input id="estudio" className="h-11 text-[0.9375rem]" placeholder="Estudio Jurídico …" value={estudio} onChange={(e) => setEstudio(e.target.value)} autoFocus />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="nombre" className="text-[0.8125rem] font-medium">
            Tu nombre
          </label>
          <Input id="nombre" className="h-11 text-[0.9375rem]" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <BotonPrincipal cargando={enviando} disabled={!estudio.trim() || !nombre.trim()}>
          {enviando ? 'Creando…' : 'Crear estudio'}
        </BotonPrincipal>
      </form>
      <Button variant="ghost" className="mt-3 w-full" onClick={() => void c.auth.cerrarSesion().then(() => location.reload())}>
        <ArrowLeftIcon className="size-4" aria-hidden /> Usar otra cuenta
      </Button>
    </Marco>
  )
}
