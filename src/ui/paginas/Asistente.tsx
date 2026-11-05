import { useState } from 'react'
import { toast } from 'sonner'
import { CopyIcon, FileTextIcon, SparklesIcon } from 'lucide-react'
import type { ResumenExpedienteIA } from '@/application/ports'
import { calcularPendientes, estadoMovimiento } from '@/domain/agenda/que-toca-hoy'
import { TIPOS_ESCRITO } from '@/domain/entidades'
import { VIAS } from '@/domain/plazos/catalogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor, useDatos } from '../contexto'
import { Campo, EncabezadoPagina, SelectNativo } from '../componentes/base'
import { Michi } from '../componentes/marca'
import { SelectorExpediente } from '../componentes/SelectorExpediente'
import { etiquetaExp } from '../formato'

function Resultado({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      toast.success('Copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase">{etiqueta} · borrador para revisar</p>
        <Button variant="ghost" size="sm" onClick={copiar}>
          <CopyIcon aria-hidden /> Copiar
        </Button>
      </div>
      <div className="max-h-[60dvh] overflow-y-auto rounded-lg border bg-muted/40 p-4 font-heading text-[0.95rem] leading-relaxed whitespace-pre-wrap" tabIndex={0} aria-label={etiqueta}>
        {texto}
      </div>
    </div>
  )
}

function Sugerencias() {
  const c = useContenedor()
  const d = useDatos()
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)

  const pedir = async () => {
    setCargando(true)
    try {
      const ctx = { hoy: d.hoy, calendario: d.calendario, diasSinMovimiento: d.config.diasSinMovimiento }
      const { pendientes } = calcularPendientes(d, ctx)
      const resumenes: ResumenExpedienteIA[] = d.expedientes
        .filter((e) => e.estado === 'activo')
        .map((e) => {
          const acciones = d.acciones.filter((a) => a.expedienteId === e.id).sort((a, b) => b.fecha.localeCompare(a.fecha))
          const prox = acciones.find((a) => a.proximaFecha && !a.proximaCumplida)
          return {
            id: e.id,
            etiqueta: etiquetaExp(e),
            via: VIAS[e.via].nombre,
            etapa: e.etapa,
            diasSinMovimiento: estadoMovimiento(e, d.acciones, ctx)?.dias,
            proximoPlazo: prox ? `${prox.proxima} (${prox.proximaFecha})` : undefined,
            alertas: pendientes.filter((p) => p.expedienteId === e.id).map((p) => `${p.titulo}: ${p.detalle}`),
            ultimasAcciones: acciones.slice(0, 6).map((a) => `${a.fecha} ${a.tipo}: ${a.descripcion}`),
          }
        })
      setTexto(await c.ia.sugerirImpulsos(resumenes))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Sugerencias de impulso</CardTitle>
        <CardDescription>Claude revisa etapa, plazos y días sin movimiento de cada expediente activo y propone qué hacer primero.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button onClick={pedir} disabled={cargando} className="justify-self-start">
          <SparklesIcon aria-hidden /> {cargando ? 'Revisando expedientes…' : 'Pedir sugerencias'}
        </Button>
        <div aria-live="polite">{texto && <Resultado texto={texto} etiqueta="Sugerencias" />}</div>
      </CardContent>
    </Card>
  )
}

function Redactar() {
  const c = useContenedor()
  const d = useDatos()
  const [expId, setExpId] = useState<string>()
  const [tipo, setTipo] = useState<string>(TIPOS_ESCRITO[0])
  const [indicaciones, setIndicaciones] = useState('')
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)

  const redactar = async () => {
    const exp = expId ? d.expPorId.get(expId) : undefined
    if (!exp) return toast.error('Elige un expediente.')
    setCargando(true)
    try {
      setTexto(await c.ia.redactarEscrito({ expediente: exp, tipo, indicaciones }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Redactar escrito</CardTitle>
        <CardDescription>Borrador con formato peruano. Los datos que falten quedan entre [CORCHETES].</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Expediente" requerido>
            {(p) => <SelectorExpediente {...p} valor={expId} onCambio={(e) => setExpId(e?.id)} />}
          </Campo>
          <Campo etiqueta="Tipo de escrito">
            {(p) => (
              <SelectNativo {...p} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS_ESCRITO.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          <Campo etiqueta="Indicaciones" className="sm:col-span-2" ayuda="Ej.: mencionar que la audiencia se frustró dos veces.">
            {(p) => <Textarea {...p} rows={2} value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />}
          </Campo>
        </div>
        <Button onClick={redactar} disabled={cargando} className="justify-self-start">
          <FileTextIcon aria-hidden /> {cargando ? 'Redactando…' : 'Redactar borrador'}
        </Button>
        <div aria-live="polite">{texto && <Resultado texto={texto} etiqueta="Escrito" />}</div>
      </CardContent>
    </Card>
  )
}

export function Asistente() {
  return (
    <>
      <EncabezadoPagina
        titulo="Asistente"
        descripcion={
          <span className="flex items-center gap-2">
            <Michi className="size-6 text-primary" /> Michi propone; un abogado revisa y decide. Nada se presenta ni se guarda solo.
          </span>
        }
      />
      <div className="grid gap-6">
        <Sugerencias />
        <Redactar />
      </div>
    </>
  )
}
