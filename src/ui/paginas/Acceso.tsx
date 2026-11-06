import { useEffect, useId, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, CheckIcon, EyeIcon, EyeOffIcon, Loader2Icon } from '@/ui/iconos'
import { useContenedor } from '../contexto'
import { Michi } from '../componentes/marca'

/**
 * Acceso al estilo de Apple: una columna centrada, un dato por paso,
 * campo con etiqueta flotante y botón de continuar dentro del campo.
 */

function Marco({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[22.5rem] animate-entrar">{children}</div>
      </main>
      <footer className="px-6 pb-8 text-center text-xs leading-relaxed text-muted-foreground">
        Tus datos y los de tus clientes quedan solo en el espacio de tu estudio.
        <br />
        Expedita · Procuración judicial · Perú ·{' '}
        <a href="/privacidad" className="underline outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25">
          Aviso de privacidad
        </a>
      </footer>
    </div>
  )
}

function Cabecera({ titulo, texto }: { titulo: string; texto?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col items-center text-center">
      <span className="mb-10 flex items-center gap-2" aria-hidden>
        <Michi pose="sentado" className="size-8" />
        <span className="text-[1.0625rem] font-bold tracking-tight">Expedita</span>
      </span>
      <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-[2rem]">{titulo}</h1>
      {texto && <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{texto}</p>}
    </div>
  )
}

/** Campo con etiqueta flotante (como Apple ID) y botón de continuar integrado. */
function CampoFlotante({
  etiqueta,
  cargando,
  conBoton = true,
  extra,
  error,
  ...props
}: {
  etiqueta: string
  cargando?: boolean
  conBoton?: boolean
  extra?: ReactNode
  error?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div>
      <div
        className={cn(
          'relative rounded-xl bg-card shadow-[0_0_0_1px_var(--input)] transition-shadow duration-200 focus-within:shadow-[0_0_0_2px_var(--ring)]',
          error && 'shadow-[0_0_0_1px_var(--destructive)] focus-within:shadow-[0_0_0_2px_var(--destructive)]',
        )}
      >
        <input
          id={id}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'peer h-14 w-full rounded-xl bg-transparent px-4 pt-5 pb-1.5 text-[1.0625rem] text-foreground outline-none',
            (conBoton || extra) && 'pr-14',
            conBoton && extra && 'pr-24',
          )}
          {...props}
        />
        <label
          htmlFor={id}
          className="pointer-events-none absolute top-1/2 left-4 origin-left -translate-y-1/2 text-[1.0625rem] text-muted-foreground transition-all duration-200 ease-(--ease-apple) peer-focus:top-3.5 peer-focus:scale-[0.72] peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:scale-[0.72]"
        >
          {etiqueta}
        </label>
        <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1">
          {extra}
          {conBoton && (
            <button
              type="submit"
              aria-label="Continuar"
              disabled={cargando}
              className="grid size-9 place-items-center rounded-full border border-input text-foreground outline-none transition-[background-color,transform] duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/25 active:scale-95 disabled:opacity-60"
            >
              {cargando ? <Loader2Icon className="size-4 animate-spin" /> : <ArrowRightIcon className="size-4" />}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 px-1 text-[0.8125rem] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function Enlace({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded text-[0.9375rem] text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/25">
      {children}
    </button>
  )
}

/**
 * Acceso por enlace de correo: oculto mientras se use el correo gratuito de Supabase (2 envíos por hora).
 * Para activarlo, definir VITE_ENLACE_CORREO=si en las variables de compilación (tras conectar un SMTP propio).
 */
const ENLACE_POR_CORREO = import.meta.env.VITE_ENLACE_CORREO === 'si'

type Paso = 'correo' | 'metodo' | 'clave' | 'crear' | 'enviado'

export function IniciarSesion({ alEntrar }: { alEntrar: () => void }) {
  const c = useContenedor()
  const [paso, setPaso] = useState<Paso>('correo')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string>()
  const [espera, setEspera] = useState(0)
  const [motivo, setMotivo] = useState<'acceso' | 'recuperar'>('acceso')

  useEffect(() => {
    if (espera <= 0) return
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [espera])

  const mensaje = (e: unknown) => {
    const m = (e as Error).message
    return /rate limit|too many/i.test(m) ? 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.' : m
  }

  const continuarCorreo = (ev: FormEvent) => {
    ev.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Escribe un correo válido.')
    setError(undefined)
    setPaso('metodo')
  }

  const recuperar = async () => {
    setCargando(true)
    setError(undefined)
    try {
      await c.auth.recuperarClave(email.trim())
      setMotivo('recuperar')
      setPaso('enviado')
      setEspera(60)
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setCargando(false)
    }
  }

  const enviarEnlace = async () => {
    setMotivo('acceso')
    setCargando(true)
    setError(undefined)
    try {
      await c.auth.enviarEnlaceMagico(email.trim())
      setPaso('enviado')
      setEspera(60)
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setCargando(false)
    }
  }

  const entrarConClave = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!password) return setError('Escribe tu contraseña.')
    setCargando(true)
    setError(undefined)
    try {
      await c.auth.iniciarSesion(email.trim(), password)
      alEntrar()
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setCargando(false)
    }
  }

  const crearCuenta = async (ev: FormEvent) => {
    ev.preventDefault()
    if (password.length < 10) return setError('Usa al menos 10 caracteres.')
    if (password !== repetir) return setError('Las contraseñas no coinciden.')
    setCargando(true)
    setError(undefined)
    try {
      const conSesion = await c.auth.registrar(email.trim(), password)
      if (conSesion) {
        try {
          localStorage.setItem('expedita.clave-definida', '1')
        } catch {
          /* sin almacenamiento */
        }
        alEntrar()
      } else {
        // Supabase aún exige confirmar el correo: se envió un mensaje de confirmación.
        setPaso('enviado')
        setEspera(60)
      }
    } catch (e) {
      setError(mensaje(e))
    } finally {
      setCargando(false)
    }
  }

  const volver = () => {
    setPaso('correo')
    setPassword('')
    setRepetir('')
    setError(undefined)
  }

  /** Correo elegido, con opción de cambiarlo (como en Apple ID) */
  const correoElegido = (
    <div className="mb-6 flex items-center justify-center gap-2 text-[0.9375rem]">
      <span className="truncate font-medium">{email}</span>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <Enlace onClick={volver}>Cambiar</Enlace>
    </div>
  )

  if (paso === 'enviado')
    return (
      <Marco>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">Revisa tu correo</h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {motivo === 'recuperar' ? 'Enviamos un enlace para crear una contraseña nueva a ' : 'Enviamos un enlace de acceso a '}
            <span className="font-medium text-foreground">{email}</span>. Ábrelo en este dispositivo.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Si no lo ves en unos minutos, revisa la carpeta de spam.</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={espera > 0 || cargando}
              onClick={() => void (motivo === 'recuperar' ? recuperar() : enviarEnlace())}
              className="text-[0.9375rem] text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/25 disabled:text-muted-foreground disabled:no-underline"
            >
              {espera > 0 ? `Reenviar enlace en ${espera} s` : 'Reenviar enlace'}
            </button>
            <Enlace onClick={volver}>Usar otro correo</Enlace>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </Marco>
    )

  return (
    <Marco>
      <Cabecera titulo="Inicia sesión en Expedita" texto={paso === 'correo' ? 'Usa el correo con el que te invitaron al estudio.' : undefined} />

      {paso === 'correo' && (
        <form onSubmit={continuarCorreo} noValidate className="animate-entrar">
          <CampoFlotante
            etiqueta="Correo electrónico"
            type="email"
            inputMode="email"
            autoComplete="username email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(undefined)
            }}
            error={error}
          />
        </form>
      )}

      {paso === 'metodo' && (
        <div className="animate-entrar">
          {correoElegido}
          <div className="grid gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => {
                setError(undefined)
                setPaso('clave')
              }}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[1.0625rem] font-medium text-primary-foreground outline-none transition-[background-color,transform] duration-150 hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.98]"
            >
              Entrar con mi contraseña
            </button>
            <button
              type="button"
              onClick={() => {
                setError(undefined)
                setPaso('crear')
              }}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-card text-[1.0625rem] font-medium shadow-[0_0_0_1px_var(--input)] outline-none transition-[background-color,transform] duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/25 active:scale-[0.98]"
            >
              Primera vez: crear mi contraseña
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-center text-[0.8125rem] text-destructive">
              {error}
            </p>
          )}
          {ENLACE_POR_CORREO && (
            <div className="mt-8 flex flex-col items-center gap-1 text-center">
              <button
                type="button"
                onClick={() => void enviarEnlace()}
                disabled={cargando}
                className="rounded text-[0.9375rem] text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/25 disabled:text-muted-foreground"
              >
                {cargando ? 'Enviando enlace…' : 'Prefiero recibir un enlace por correo'}
              </button>
            </div>
          )}
        </div>
      )}

      {paso === 'crear' && (
        <form onSubmit={crearCuenta} noValidate className="animate-entrar">
          {correoElegido}
          <div className="grid gap-3">
            <CampoFlotante
              etiqueta="Crea una contraseña"
              type="password"
              autoComplete="new-password"
              autoFocus
              conBoton={false}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(undefined)
              }}
            />
            <CampoFlotante
              etiqueta="Repítela"
              type="password"
              autoComplete="new-password"
              conBoton={false}
              value={repetir}
              onChange={(e) => {
                setRepetir(e.target.value)
                setError(undefined)
              }}
              error={error}
            />
          </div>
          <p className="mt-3 px-1 text-[0.8125rem] text-muted-foreground">Al menos 10 caracteres. Mejor una frase que puedas recordar.</p>
          <button
            type="submit"
            disabled={cargando}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[1.0625rem] font-medium text-primary-foreground outline-none transition-[background-color,transform] duration-150 hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.98] disabled:opacity-70"
          >
            {cargando && <Loader2Icon className="size-5 animate-spin" />}
            {cargando ? 'Creando cuenta…' : 'Crear cuenta y entrar'}
          </button>
          <div className="mt-8 text-center">
            <Enlace
              onClick={() => {
                setError(undefined)
                setPaso('metodo')
              }}
            >
              Ya tengo contraseña
            </Enlace>
          </div>
        </form>
      )}

      {paso === 'clave' && (
        <form onSubmit={entrarConClave} noValidate className="animate-entrar">
          {correoElegido}
          <CampoFlotante
            autoFocus
            etiqueta="Contraseña"
            type={verClave ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(undefined)
            }}
            cargando={cargando}
            error={error}
            extra={
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verClave}
                className="grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                {verClave ? <EyeOffIcon className="size-[1.125rem]" /> : <EyeIcon className="size-[1.125rem]" />}
              </button>
            }
          />
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <Enlace onClick={() => void recuperar()}>{cargando ? 'Enviando…' : '¿Olvidaste tu contraseña?'}</Enlace>
            <Enlace
              onClick={() => {
                setError(undefined)
                setPaso('metodo')
              }}
            >
              Otras formas de entrar
            </Enlace>
          </div>
        </form>
      )}

      {paso === 'correo' && (
        <p className="mt-12 text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
          ¿No tienes acceso? Pide a quien administra tu estudio que te invite desde Ajustes → Equipo.
        </p>
      )}
    </Marco>
  )
}

export function CrearEstudio({ email, alCrear }: { email: string; alCrear: () => void }) {
  const c = useContenedor()
  const [estudio, setEstudio] = useState('')
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string>()

  const crear = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!estudio.trim() || !nombre.trim()) return setError('Completa el nombre del estudio y el tuyo.')
    setCargando(true)
    setError(undefined)
    try {
      await c.auth.crearEstudio(estudio.trim(), nombre.trim())
      alCrear()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Marco>
      <Cabecera
        titulo="Crea tu estudio"
        texto={
          <>
            <span className="font-medium text-foreground">{email}</span> aún no pertenece a ningún estudio. Si eres la primera persona, créalo y serás
            su administradora.
          </>
        }
      />
      <form onSubmit={crear} noValidate className="grid gap-3">
        <CampoFlotante etiqueta="Nombre del estudio" conBoton={false} autoFocus value={estudio} onChange={(e) => setEstudio(e.target.value)} />
        <CampoFlotante etiqueta="Tu nombre" conBoton={false} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        {error && (
          <p role="alert" className="px-1 text-[0.8125rem] text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={cargando}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[1.0625rem] font-medium text-primary-foreground outline-none transition-[background-color,transform] duration-150 hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.98] disabled:opacity-70"
        >
          {cargando ? <Loader2Icon className="size-5 animate-spin" /> : <CheckIcon className="size-5" />}
          {cargando ? 'Creando…' : 'Crear estudio'}
        </button>
      </form>
      <div className="mt-8 text-center">
        <Enlace onClick={() => void c.auth.cerrarSesion().then(() => location.reload())}>Usar otra cuenta</Enlace>
      </div>
    </Marco>
  )
}
