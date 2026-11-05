import { useEffect, useId, useMemo, useState } from 'react'
import type { Expediente } from '@/domain/entidades'
import { parsearNumeroExpediente } from '@/domain/expediente/numero-expediente'
import { Input } from '@/components/ui/input'
import { useDatos } from '../contexto'

const etiqueta = (e: Expediente) => `${e.codigo ? e.codigo + ' · ' : ''}${e.numero}${e.cliente ? ' · ' + e.cliente : ''}`

/**
 * Campo de texto con sugerencias nativas (datalist): accesible y cómodo en celular.
 * Acepta el código interno, el número completo o el texto de la sugerencia.
 */
export function SelectorExpediente({
  valor,
  onCambio,
  soloActivos = true,
  ...props
}: {
  valor?: string
  onCambio: (exp: Expediente | undefined) => void
  soloActivos?: boolean
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  required?: boolean
}) {
  const { expedientes, expPorId } = useDatos()
  const listaId = useId()
  const opciones = useMemo(
    () => expedientes.filter((e) => !soloActivos || e.estado === 'activo').sort((a, b) => (a.codigo ?? '~').localeCompare(b.codigo ?? '~', 'es', { numeric: true })),
    [expedientes, soloActivos],
  )
  const [texto, setTexto] = useState('')

  useEffect(() => {
    const e = valor ? expPorId.get(valor) : undefined
    if (e) setTexto(etiqueta(e))
  }, [valor, expPorId])

  const resolver = (t: string) => {
    setTexto(t)
    const limpio = t.trim().toLowerCase()
    const num = parsearNumeroExpediente(t.split(' · ').find((p) => parsearNumeroExpediente(p)) ?? t)
    const exp =
      expedientes.find((e) => etiqueta(e).toLowerCase() === limpio) ??
      (num ? expedientes.find((e) => e.numero === num.valor) : undefined) ??
      expedientes.find((e) => e.codigo?.toLowerCase() === limpio)
    onCambio(exp)
  }

  return (
    <>
      <Input
        {...props}
        list={listaId}
        value={texto}
        onChange={(e) => resolver(e.target.value)}
        placeholder="Código (LA-04), número o cliente"
        autoComplete="off"
      />
      <datalist id={listaId}>
        {opciones.map((e) => (
          <option key={e.id} value={etiqueta(e)} />
        ))}
      </datalist>
    </>
  )
}
