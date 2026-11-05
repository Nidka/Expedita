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
    return () => cancelAnimationFrame(raf)
  }, [valor])

  return (
    <span className={className} aria-label={String(valor)}>
      <span aria-hidden>{mostrado}</span>
    </span>
  )
}
