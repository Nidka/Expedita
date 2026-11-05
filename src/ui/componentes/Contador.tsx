import { useEffect, useRef, useState } from 'react'

const prefiereReducir = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Número que sube hasta su valor (600 ms, curva de salida). Sin animación si se pide reducir movimiento. */
export function Contador({ valor, className }: { valor: number; className?: string }) {
  const [mostrado, setMostrado] = useState(() => (prefiereReducir() ? valor : 0))
  const desde = useRef(mostrado)

  useEffect(() => {
    if (prefiereReducir()) {
      setMostrado(valor)
      return
    }
    const inicio = performance.now()
    const origen = desde.current
    let raf = 0
    const paso = (t: number) => {
      const p = Math.min(1, (t - inicio) / 600)
      const suave = 1 - Math.pow(1 - p, 3)
      const actual = Math.round(origen + (valor - origen) * suave)
      setMostrado(actual)
      desde.current = actual
      if (p < 1) raf = requestAnimationFrame(paso)
    }
    raf = requestAnimationFrame(paso)
    // Respaldo: si el navegador pausa la animación (pestaña en segundo plano), igual se muestra el valor real.
    const respaldo = window.setTimeout(() => {
      setMostrado(valor)
      desde.current = valor
    }, 700)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(respaldo)
    }
  }, [valor])

  return (
    <span className={className} aria-label={String(valor)}>
      <span aria-hidden>{mostrado}</span>
    </span>
  )
}
