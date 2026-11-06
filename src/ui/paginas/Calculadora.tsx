import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { calcularVencimiento } from '@/domain/plazos/computo'
import { actosDeVia, VIAS, type UnidadPlazo, type ViaId } from '@/domain/plazos/catalogo'
import { aDate, sumarDias } from '@/domain/shared/fecha'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CopyIcon } from '@/ui/iconos'
import { useDatos } from '../contexto'
import { BotonEnlace, Campo, EncabezadoPagina, SelectNativo, Vence } from '../componentes/base'
import { fechaLarga } from '../formato'

const OTRO = '__otro'

/** Calculadora de plazos: el mismo cómputo que usan las notificaciones, a mano y con el detalle a la vista. */
export function Calculadora() {
  const d = useDatos()
  const [via, setVia] = useState<ViaId>('lab-ord')
  const actos = actosDeVia(via)
  const [actoId, setActoId] = useState(actos[0]?.id ?? OTRO)
  const [dias, setDias] = useState(5)
  const [unidad, setUnidad] = useState<UnidadPlazo>('habiles')
  const [notificada, setNotificada] = useState(d.hoy)
  const [casilla, setCasilla] = useState(true)

  const acto = actos.find((a) => a.id === actoId)
  const plazo = acto ?? { dias, unidad, norma: 'plazo indicado' }

  const r = useMemo(
    () => (notificada && plazo.dias > 0 ? calcularVencimiento(d.calendario, notificada, plazo, casilla) : undefined),
    [d.calendario, notificada, plazo, casilla],
  )

  /** Días no hábiles que el cómputo saltó, con su motivo (feriados y días inhábiles del estudio). */
  const saltados = useMemo(() => {
    if (!r) return []
    const out: { fecha: string; motivo: string }[] = []
    for (let f = sumarDias(r.notificacion, 1); f <= r.vencimiento && out.length < 40; f = sumarDias(f, 1)) {
      const motivo = d.calendario.motivoInhabil(f)
      const finde = [0, 6].includes(aDate(f).getDay())
      if (motivo && !finde) out.push({ fecha: f, motivo })
    }
    return out
  }, [r, d.calendario])

  const texto = r
    ? `${acto ? `${acto.nombre}: ` : ''}vence el ${fechaLarga(r.vencimiento)}. Notificada el ${fechaLarga(r.notificacion)}${casilla ? ` por casilla; surte efecto el ${fechaLarga(r.efecto)} (CPC art. 155-C)` : ''}. Plazo: ${r.dias} ${r.unidad === 'naturales' ? 'días naturales' : 'días hábiles'} (${r.norma}).${saltados.length ? ` No se computan: ${saltados.map((s) => `${fechaLarga(s.fecha)} (${s.motivo})`).join('; ')}.` : ''}`
    : ''

  return (
    <>
      <EncabezadoPagina
        ayuda="notificaciones"
        titulo="Calculadora de plazos"
        descripcion="En días hábiles, con feriados nacionales, días inhábiles del estudio y el efecto de la casilla electrónica."
      />
      <div className="grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-5 rounded-xl bg-card p-5 shadow-[0_0_0_1px_var(--border)] sm:p-6" aria-label="Datos">
          <Campo etiqueta="Vía procesal">
            {(p) => (
              <SelectNativo
                {...p}
                value={via}
                onChange={(e) => {
                  const v = e.target.value as ViaId
                  setVia(v)
                  setActoId(actosDeVia(v)[0]?.id ?? OTRO)
                }}
              >
                {Object.values(VIAS).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </SelectNativo>
            )}
          </Campo>
          <Campo etiqueta="Acto" ayuda={acto ? `${acto.dias} ${acto.unidad === 'naturales' ? 'días naturales' : 'días hábiles'} · ${acto.norma}` : undefined}>
            {(p) => (
              <SelectNativo {...p} value={actoId} onChange={(e) => setActoId(e.target.value)}>
                {actos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
                <option value={OTRO}>Otro plazo (lo indico yo)</option>
              </SelectNativo>
            )}
          </Campo>
          {!acto && (
            <div className="grid animate-entrar grid-cols-2 gap-4">
              <Campo etiqueta="Días">
                {(p) => <Input {...p} type="number" min={1} max={365} value={dias} onChange={(e) => setDias(Math.max(1, Number(e.target.value) || 1))} />}
              </Campo>
              <Campo etiqueta="Se cuentan">
                {(p) => (
                  <SelectNativo {...p} value={unidad} onChange={(e) => setUnidad(e.target.value as UnidadPlazo)}>
                    <option value="habiles">Hábiles</option>
                    <option value="naturales">Naturales</option>
                  </SelectNativo>
                )}
              </Campo>
            </div>
          )}
          <Campo etiqueta="Fecha de notificación">
            {(p) => <Input {...p} type="date" value={notificada} onChange={(e) => setNotificada(e.target.value)} />}
          </Campo>
          <Label className="font-normal">
            <Checkbox checked={casilla} onCheckedChange={(v) => setCasilla(Boolean(v))} />
            Notificada por casilla electrónica (surte efecto al 2.º día hábil)
          </Label>
        </section>

        <section className="grid content-start gap-5" aria-live="polite" aria-label="Resultado">
          {r ? (
            <>
              <div className="grid gap-1">
                <p className="text-sm text-muted-foreground">Vence el</p>
                <p className="text-[1.75rem] leading-tight font-bold tracking-tight">{fechaLarga(r.vencimiento)}</p>
                <Vence fecha={r.vencimiento} hoy={d.hoy} habiles={d.calendario.habilesEntre(d.hoy, r.vencimiento)} className="mt-1 flex-row items-baseline gap-2 text-left" />
              </div>
              <ol className="relative grid gap-4 pl-5 before:absolute before:inset-y-1.5 before:left-[5px] before:w-px before:bg-separator">
                {[
                  ['Notificación', r.notificacion],
                  ...(casilla ? [['Surte efecto', r.efecto]] : []),
                  ['Vencimiento', r.vencimiento],
                ].map(([t, f], i, arr) => (
                  <li key={t} className="relative">
                    <span
                      className={`absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-background ${i === arr.length - 1 ? 'bg-primary' : 'bg-ocre'}`}
                      aria-hidden
                    />
                    <p className="text-sm font-medium">{t}</p>
                    <p className="text-sm text-muted-foreground">{fechaLarga(f)}</p>
                  </li>
                ))}
              </ol>
              <p className="medida text-sm text-foreground/85">
                Plazo de {r.dias} {r.unidad === 'naturales' ? 'días naturales' : 'días hábiles'} ({r.norma})
                {casilla ? ', contado desde que surte efecto la notificación en casilla (CPC art. 155-C).' : ', contado desde la notificación.'}
              </p>
              {saltados.length > 0 && (
                <div className="grid gap-1.5">
                  <p className="text-sm font-medium">Días no computados (además de fines de semana)</p>
                  <ul className="grid gap-1 text-sm text-muted-foreground">
                    {saltados.map((s) => (
                      <li key={s.fecha}>
                        {fechaLarga(s.fecha)} · {s.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard.writeText(texto).then(
                      () => toast.success('Cómputo copiado'),
                      () => toast.error('No se pudo copiar'),
                    )
                  }
                >
                  <CopyIcon aria-hidden /> Copiar cómputo
                </Button>
                <BotonEnlace a="/bandeja?nueva=1" variant="ghost">
                  Registrar notificación
                </BotonEnlace>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Indica la fecha de notificación.</p>
          )}
        </section>
      </div>
    </>
  )
}
