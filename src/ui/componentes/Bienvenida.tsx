import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ArrowRightIcon, ChevronLeftIcon } from '@/ui/iconos'
import { useDatos } from '../contexto'
import { marcarPaso } from '../guia'
import { Michi, type Pose } from './marca'

interface Lamina {
  pose: Pose
  titulo: string
  texto: string
  puntos?: string[]
}

const claveVista = (usuario: string) => `expedita:bienvenida:${usuario}`

/**
 * Recorrido de bienvenida: se abre solo la primera vez que cada persona entra y
 * se puede volver a ver desde Ayuda. Cuatro láminas cortas con Michi.
 */
export function Bienvenida() {
  const { sesion } = useDatos()
  const { miembro } = sesion
  const navegar = useNavigate()
  const esAdmin = miembro.rol === 'admin'
  const [abierto, setAbierto] = useState(() => {
    try {
      return !localStorage.getItem(claveVista(miembro.userId))
    } catch {
      return false
    }
  })
  const [i, setI] = useState(0)

  useEffect(() => {
    const abrir = () => {
      setI(0)
      setAbierto(true)
    }
    window.addEventListener('expedita:recorrido', abrir)
    return () => window.removeEventListener('expedita:recorrido', abrir)
  }, [])

  const laminas: Lamina[] = [
    {
      pose: 'saludando',
      titulo: `Hola, ${miembro.nombre.split(' ')[0]}. Esto es Expedita`,
      texto: `Plazos, notificaciones y expedientes de ${sesion.orgNombre} en un solo lugar, para que ningún caso se quede sin impulso.`,
    },
    {
      pose: 'alerta',
      titulo: '«Hoy» te dice qué hacer',
      texto: 'Es la primera pantalla. Junta lo vencido, lo que vence esta semana y los expedientes que llevan tiempo quietos.',
      puntos: ['Rojo: vencido. Empieza por ahí.', 'Ocre: vence en 3 días hábiles o menos.', 'Cada fila te lleva al expediente.'],
    },
    {
      pose: 'martillo',
      titulo: 'Registra cada impulso',
      texto: 'Cada escrito, visita o revisión del CEJ se anota en «Registrar acción». Así el expediente deja de figurar sin movimiento y queda en su historial.',
      puntos: ['Las notificaciones calculan solas el vencimiento en días hábiles.', 'Anota la próxima acción con su fecha y Expedita te la recuerda.'],
    },
    {
      pose: 'libros',
      titulo: 'Todo lo demás, a un clic',
      texto: 'Agenda y audiencias, visitas a juzgados, escritos en Word con membrete y reportes del equipo.',
      puntos: ['Busca lo que sea con Ctrl + K.', 'El botón «?» junto a cada título explica cómo funciona esa pantalla.'],
    },
    esAdmin
      ? { pose: 'leyendo', titulo: 'Deja listo el estudio', texto: 'La guía de primeros pasos te lleva, uno por uno, a cargar los expedientes, invitar al equipo y conectar el SINOE.' }
      : { pose: 'feliz', titulo: '¡Listo para empezar!', texto: 'Si algo no está claro, abre la Ayuda desde el menú o pulsa el «?» de cada pantalla.' },
  ]
  const ultima = i === laminas.length - 1
  const l = laminas[i]

  const cerrar = (destino?: string) => {
    try {
      localStorage.setItem(claveVista(miembro.userId), '1')
    } catch {
      /* sin almacenamiento */
    }
    marcarPaso(miembro.orgId, miembro.userId, 'recorrido')
    setAbierto(false)
    if (destino) navegar(destino)
  }

  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && !ultima) setI(i + 1)
    if (e.key === 'ArrowLeft' && i > 0) setI(i - 1)
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md" onKeyDown={teclas}>
        <div className="grid place-items-center bg-secondary/60 pt-8 pb-6">
          <Michi key={l.pose} pose={l.pose} className="size-32 animate-entrar" />
        </div>
        <div key={i} className="grid min-h-60 animate-entrar content-start gap-3 px-7 pt-6 pb-2">
          <p className="text-xs font-medium text-muted-foreground tabular" aria-live="polite">
            {i + 1} de {laminas.length}
          </p>
          <DialogTitle className="text-xl leading-snug font-semibold">{l.titulo}</DialogTitle>
          <DialogDescription className="text-[0.9375rem] leading-relaxed">{l.texto}</DialogDescription>
          {l.puntos && (
            <ul className="grid gap-1.5 text-[0.9375rem]">
              {l.puntos.map((p) => (
                <li key={p} className="grid grid-cols-[0.75rem_1fr] gap-2.5">
                  <span className="mt-[0.6rem] size-1.5 rounded-full bg-ocre" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-7 pt-4 pb-6">
          <div className="flex gap-1.5" aria-hidden>
            {laminas.map((_, j) => (
              <span key={j} className={cn('h-1.5 rounded-full transition-all duration-300', j === i ? 'w-5 bg-primary' : 'w-1.5 bg-input')} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 ? (
              <Button variant="ghost" size="icon" onClick={() => setI(i - 1)} aria-label="Anterior">
                <ChevronLeftIcon />
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => cerrar()}>
                Saltar
              </Button>
            )}
            {!ultima ? (
              <Button onClick={() => setI(i + 1)} autoFocus>
                Siguiente <ArrowRightIcon aria-hidden />
              </Button>
            ) : esAdmin ? (
              <Button onClick={() => cerrar('/primeros-pasos')} autoFocus>
                Ir a primeros pasos <ArrowRightIcon aria-hidden />
              </Button>
            ) : (
              <Button onClick={() => cerrar()} autoFocus>
                Empezar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
