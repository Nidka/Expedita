import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AYUDA, NAVEGACION } from './layout/navegacion'

/** Acciones de creación: una sola tecla, desde cualquier pantalla. */
export const ATAJOS_CREAR = [
  { tecla: 'r', texto: 'Registrar acción', a: '/registrar' },
  { tecla: 'n', texto: 'Nueva notificación', a: '/bandeja?nueva=1' },
  { tecla: 'e', texto: 'Nuevo expediente', a: '/expedientes?nuevo=1' },
  { tecla: 'a', texto: 'Programar audiencia', a: '/agenda?audiencia=' },
] as const

const esMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const MOD = esMac ? '⌘' : 'Ctrl'

/** Tecla dibujada como en el teclado */
export function Tecla({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-grid h-5 min-w-5 place-items-center rounded-[5px] border border-b-2 border-input bg-card px-1 font-sans text-[0.6875rem] leading-none font-medium text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Combinacion({ teclas, separador = 'luego' }: { teclas: string[]; separador?: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {teclas.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-[0.6875rem] text-muted-foreground">{separador}</span>}
          <Tecla>{t}</Tecla>
        </span>
      ))}
    </span>
  )
}

function escribiendo(e: KeyboardEvent): boolean {
  const el = e.target
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  // Con un diálogo o menú abierto, las teclas son de ese diálogo
  return Boolean(el.closest('[role="dialog"],[role="menu"],[role="listbox"]'))
}

/**
 * Atajos globales:
 *   /  buscar · ?  ver atajos · T  tema claro/oscuro
 *   G + letra  ir a una sección
 *   R, N, E, A  crear (acción, notificación, expediente, audiencia)
 */
export function useAtajosGlobales({ buscar, verAtajos, esAdmin }: { buscar: () => void; verAtajos: () => void; esAdmin: boolean }) {
  const navegar = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()
  const esperandoG = useRef<number | null>(null)

  useEffect(() => {
    const destinos = [...NAVEGACION.filter((n) => !n.soloAdmin || esAdmin), AYUDA]
    const alPulsar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || escribiendo(e)) return
      const k = e.key.toLowerCase()

      if (esperandoG.current !== null) {
        window.clearTimeout(esperandoG.current)
        esperandoG.current = null
        const destino = destinos.find((d) => d.tecla === k)
        if (destino) {
          e.preventDefault()
          navegar(destino.a)
        }
        return
      }
      if (k === 'g') {
        esperandoG.current = window.setTimeout(() => (esperandoG.current = null), 1200)
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        return buscar()
      }
      if (e.key === '?') {
        e.preventDefault()
        return verAtajos()
      }
      if (k === 't') return setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
      const crear = ATAJOS_CREAR.find((c) => c.tecla === k)
      if (crear) {
        e.preventDefault()
        navegar(crear.a)
      }
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [navegar, buscar, verAtajos, esAdmin, resolvedTheme, setTheme])
}

export function DialogoAtajos({ abierto, cerrar, esAdmin }: { abierto: boolean; cerrar: () => void; esAdmin: boolean }) {
  const ir = [...NAVEGACION.filter((n) => n.tecla && (!n.soloAdmin || esAdmin)), AYUDA]
  const grupos: [string, [ReactNode, string][]][] = [
    [
      'General',
      [
        [<Combinacion key="k" teclas={[MOD, 'K']} separador="+" />, 'Buscar expedientes, secciones y ayuda'],
        [<Tecla key="/">/</Tecla>, 'Buscar (también)'],
        [<Tecla key="?">?</Tecla>, 'Ver estos atajos'],
        [<Tecla key="t">T</Tecla>, 'Cambiar entre tema claro y oscuro'],
        [<Tecla key="esc">Esc</Tecla>, 'Cerrar ventanas y paneles'],
      ],
    ],
    ['Crear', ATAJOS_CREAR.map((c) => [<Tecla key={c.tecla}>{c.tecla}</Tecla>, c.texto])],
    ['Ir a', ir.map((n) => [<Combinacion key={n.a} teclas={['G', n.tecla!]} />, n.texto])],
  ]
  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && cerrar()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>Funcionan en cualquier pantalla mientras no estés escribiendo en un campo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {grupos.map(([titulo, filas]) => (
            <section key={titulo} className={cn('grid content-start gap-1', titulo === 'Ir a' && 'sm:row-span-2')}>
              <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{titulo}</h3>
              <dl className="grid divide-y divide-separator">
                {filas.map(([teclas, texto], i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-2 text-sm">
                    <dt>{texto}</dt>
                    <dd className="shrink-0">{teclas}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
