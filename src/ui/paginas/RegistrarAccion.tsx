import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { registrarAccion } from '@/application/casos-uso/acciones'
import { TIPOS_ACCION, type TipoAccion } from '@/domain/entidades'
import { VIAS } from '@/domain/plazos/catalogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useContenedor, useDatos } from '../contexto'
import { Campo, EncabezadoPagina, SelectNativo } from '../componentes/base'
import { SelectorExpediente } from '../componentes/SelectorExpediente'
import { ImportarWhatsApp } from '../componentes/ImportarWhatsApp'
import { etiquetaExp, fecha as fmtFecha } from '../formato'
import { exito } from '../notificar'

const CLAVE_RESPONSABLE = 'expedita.responsable'

function leerResponsable(porDefecto: string) {
  try {
    return localStorage.getItem(CLAVE_RESPONSABLE) || porDefecto
  } catch {
    return porDefecto
  }
}

export function RegistrarAccion() {
  const c = useContenedor()
  const d = useDatos()
  const navegar = useNavigate()
  const [whatsapp, setWhatsapp] = useState(false)
  const [params] = useSearchParams()
  const notificacionId = params.get('notificacion') ?? undefined
  const notificacion = notificacionId ? d.notificaciones.find((n) => n.id === notificacionId) : undefined

  const [expId, setExpId] = useState<string | undefined>(params.get('exp') ?? notificacion?.expedienteId ?? undefined)
  const [fecha, setFecha] = useState(d.hoy)
  const [tipo, setTipo] = useState<TipoAccion>((params.get('tipo') as TipoAccion) || 'Escrito de impulso')
  const [descripcion, setDescripcion] = useState('')
  const [responsable, setResponsable] = useState(() => leerResponsable(d.sesion.miembro.nombre))
  const [cargo, setCargo] = useState('')
  const [etapa, setEtapa] = useState('')
  const [proxima, setProxima] = useState('')
  const [proximaFecha, setProximaFecha] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (notificacion?.expedienteId) setExpId(notificacion.expedienteId)
  }, [notificacion?.expedienteId])

  const exp = expId ? d.expPorId.get(expId) : undefined

  const sumarHabiles = (n: number) => {
    setProximaFecha(d.calendario.sumarHabiles(fecha || d.hoy, n))
    if (!proxima) setProxima(tipo === 'Revisión en CEJ' ? 'Volver a revisar el CEJ' : 'Revisar si el juzgado proveyó')
  }

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    const err: Record<string, string> = {}
    if (!exp) err.exp = 'Elige un expediente de la lista.'
    if (!descripcion.trim()) err.descripcion = 'Describe lo que se hizo.'
    if (!responsable.trim()) err.responsable = 'Indica quién lo hizo.'
    if (proximaFecha && !proxima.trim()) err.proxima = 'Indica la próxima acción.'
    setErrores(err)
    if (Object.keys(err).length) return
    setGuardando(true)
    try {
      await registrarAccion(c, {
        expedienteId: exp!.id,
        fecha,
        tipo,
        descripcion,
        responsable,
        cargo,
        proxima,
        proximaFecha: proximaFecha || undefined,
        etapaNueva: etapa || undefined,
        notificacionId,
        origen: notificacionId ? 'notificacion' : tipo === 'Revisión en CEJ' ? 'cej' : 'manual',
      })
      try {
        localStorage.setItem(CLAVE_RESPONSABLE, responsable)
      } catch {
        /* sin almacenamiento */
      }
      exito('Acción registrada', { descripcion: etiquetaExp(exp), pose: 'martillo' })
      navegar(`/expedientes/${exp!.id}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina
        ayuda="registrar"
        titulo="Registrar acción"
        descripcion={notificacion ? `Atiende la notificación «${notificacion.asunto}»` : 'Escritos, visitas, llamadas y revisiones del CEJ'}
        acciones={
          !notificacion && (
            <Button variant="outline" onClick={() => setWhatsapp(true)}>
              Importar de WhatsApp
            </Button>
          )
        }
      />
      {whatsapp && <ImportarWhatsApp abierto cerrar={() => setWhatsapp(false)} />}
      <Card className="max-w-3xl">
        <CardContent>
          <form onSubmit={enviar} noValidate className="grid gap-6 sm:grid-cols-2">
            <Campo etiqueta="Expediente" requerido error={errores.exp} className="sm:col-span-2">
              {(p) => <SelectorExpediente {...p} valor={expId} onCambio={(e) => setExpId(e?.id)} />}
            </Campo>
            <Campo etiqueta="Fecha" requerido>
              {(p) => <Input {...p} type="date" value={fecha} max={d.hoy} onChange={(e) => setFecha(e.target.value)} />}
            </Campo>
            <Campo etiqueta="Tipo de acción" requerido>
              {(p) => (
                <SelectNativo {...p} value={tipo} onChange={(e) => setTipo(e.target.value as TipoAccion)}>
                  {TIPOS_ACCION.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </SelectNativo>
              )}
            </Campo>
            <Campo etiqueta="Detalle" requerido error={errores.descripcion} className="sm:col-span-2">
              {(p) => (
                <Textarea
                  {...p}
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej.: Se presentó escrito solicitando se expida sentencia."
                />
              )}
            </Campo>
            <Campo etiqueta="Responsable" requerido error={errores.responsable} ayuda="Se recuerda en este dispositivo.">
              {(p) => <Input {...p} value={responsable} onChange={(e) => setResponsable(e.target.value)} autoComplete="name" />}
            </Campo>
            <Campo opcional etiqueta="N.° de cargo o ingreso">
              {(p) => <Input {...p} value={cargo} onChange={(e) => setCargo(e.target.value)} inputMode="numeric" />}
            </Campo>
            <Campo opcional etiqueta="Etapa después de esta acción" ayuda={exp?.etapa ? `Etapa actual: ${exp.etapa}` : undefined} className="sm:col-span-2">
              {(p) => (
                <SelectNativo {...p} value={etapa} onChange={(e) => setEtapa(e.target.value)} disabled={!exp}>
                  <option value="">Sin cambio</option>
                  {exp && VIAS[exp.via].etapas.map((e) => <option key={e}>{e}</option>)}
                </SelectNativo>
              )}
            </Campo>

            <fieldset className="grid gap-5 border-t border-separator pt-6 sm:col-span-2 sm:grid-cols-2">
              <legend className="float-left mb-1 w-full text-[0.9375rem] font-semibold sm:col-span-2">Próxima acción</legend>
              <Campo opcional etiqueta="¿Qué sigue?" error={errores.proxima}>
                {(p) => <Input {...p} value={proxima} onChange={(e) => setProxima(e.target.value)} placeholder="Ej.: Revisar CEJ" />}
              </Campo>
              <Campo opcional etiqueta="Fecha límite" ayuda={proximaFecha ? fmtFecha(proximaFecha) : 'Atajos en días hábiles'}>
                {(p) => (
                  <div className="grid gap-2">
                    <Input {...p} type="date" value={proximaFecha} onChange={(e) => setProximaFecha(e.target.value)} />
                    <div className="flex gap-2" role="group" aria-label="Sumar días hábiles">
                      {[5, 10, 15].map((n) => (
                        <Button key={n} type="button" size="sm" variant="outline" onClick={() => sumarHabiles(n)}>
                          +{n} hábiles
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Campo>
            </fieldset>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              Al guardar, las próximas acciones abiertas de este expediente se marcan como cumplidas
              {notificacion ? ' y la notificación queda atendida' : ''}.
            </p>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Registrar acción'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => navegar(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
