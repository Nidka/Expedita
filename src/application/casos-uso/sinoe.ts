import type { Notificacion } from '@/domain/entidades'
import { extraerDeCorreo } from '@/domain/notificaciones/extraer'
import { hoyEnLima } from '@/domain/shared/fecha'
import type { MensajeCorreo } from '../ports'
import type { Contenedor } from '../contenedor'
import { registrarNotificacion } from './notificaciones'

export interface ResultadoSinoe {
  nuevas: Notificacion[]
  /** Correos que no traen un número de expediente reconocible (se informan, no se registran) */
  sinNumero: MensajeCorreo[]
  yaRegistrados: number
}

/**
 * RF-11: registra en la bandeja los avisos del SINOE llegados a Gmail.
 * Cada correo se registra una sola vez (por su id); el plazo se completa al revisar el aviso.
 */
export async function importarAvisosSinoe(c: Contenedor, mensajes: MensajeCorreo[]): Promise<ResultadoSinoe> {
  const existentes = new Set((await c.notificaciones.listar()).map((n) => n.origenRef).filter(Boolean))
  const nuevas: Notificacion[] = []
  const sinNumero: MensajeCorreo[] = []
  let yaRegistrados = 0

  // Del más antiguo al más nuevo, para que la bandeja quede en orden
  for (const m of [...mensajes].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (existentes.has(m.id)) {
      yaRegistrados++
      continue
    }
    const datos = extraerDeCorreo(`${m.asunto}\n${m.texto}`)
    if (!datos.numero) {
      sinNumero.push(m)
      continue
    }
    try {
      const { notificacion } = await registrarNotificacion(c, {
        numero: datos.numero,
        asunto: m.asunto.trim() || 'Aviso del SINOE',
        recibido: hoyEnLima(new Date(m.fecha)),
        casilla: true,
        texto: m.texto,
        origen: 'gmail',
        origenRef: m.id,
      })
      nuevas.push(notificacion)
      existentes.add(m.id)
    } catch (e) {
      // Otro miembro lo registró en paralelo (restricción única por correo): no es un error
      if (/duplicate key|ya existe|unique/i.test((e as Error).message)) yaRegistrados++
      else throw e
    }
  }
  return { nuevas, sinNumero, yaRegistrados }
}
