import type { AccionPropuestaIA, AnalisisNotificacion, AsistenteIA, ResumenExpedienteIA } from '@/application/ports'
import { TIPOS_ACCION, type Expediente } from '@/domain/entidades'
import { supabase } from '../supabase/cliente'

/** Respuesta del asistente (con null) → análisis del dominio (con undefined). */
function aAnalisis(r: Record<string, string | null>): AnalisisNotificacion {
  return {
    numero: r.numero ?? undefined,
    asunto: r.asunto ?? undefined,
    recibido: r.recibido ?? undefined,
    actoId: r.actoId ?? undefined,
    plazoFijado: r.plazoFijado ?? undefined,
    resumen: r.resumen ?? undefined,
  }
}

/** Adaptador de IA: llama a la Edge Function «asistente», que es la única que conoce la clave de Claude. */
export class AsistenteClaude implements AsistenteIA {
  private async invocar<T>(cuerpo: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase().functions.invoke('asistente', { body: cuerpo })
    if (error) {
      let mensaje = 'No se pudo contactar al asistente.'
      try {
        const detalle = await (error as { context?: Response }).context?.json()
        if (detalle?.error) mensaje = detalle.error
      } catch {
        /* sin detalle */
      }
      throw new Error(mensaje)
    }
    return (data as { resultado: T }).resultado
  }

  analizarNotificacion(texto: string, actos: { id: string; nombre: string }[]): Promise<AnalisisNotificacion> {
    return this.invocar<Record<string, string | null>>({ tipo: 'analizar-notificacion', texto, actos }).then(aAnalisis)
  }

  analizarResolucion(pdf: string, actos: { id: string; nombre: string }[]): Promise<AnalisisNotificacion> {
    return this.invocar<Record<string, string | null>>({ tipo: 'analizar-resolucion', pdf, actos }).then(aAnalisis)
  }

  async sugerirImpulsos(expedientes: ResumenExpedienteIA[]): Promise<string> {
    return (await this.invocar<{ texto: string }>({ tipo: 'sugerir-impulsos', expedientes })).texto
  }

  async redactarEscrito(d: { expediente: Expediente; tipo: string; indicaciones: string }): Promise<string> {
    const { id: _id, orgId: _org, creadoEn: _c, actualizadoEn: _a, ...datos } = d.expediente
    return (
      await this.invocar<{ texto: string }>({
        tipo: 'redactar-escrito',
        expediente: datos,
        tipoEscrito: d.tipo,
        indicaciones: d.indicaciones,
      })
    ).texto
  }

  async interpretarMensajes(
    mensajes: { id: string; telefono: string; texto: string; fecha: string }[],
    expedientes: { numero: string; codigo?: string; cliente?: string }[],
  ): Promise<AccionPropuestaIA[]> {
    const items = await this.invocar<Record<string, unknown>[]>({
      tipo: 'interpretar-mensajes',
      mensajes,
      expedientes,
      tiposAccion: TIPOS_ACCION,
    })
    return items.map((i) => {
      const limpio: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(i)) if (v !== null) limpio[k] = v
      return limpio as unknown as AccionPropuestaIA
    })
  }
}
