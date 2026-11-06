import { esFechaISO, type FechaISO } from '../shared/fecha'

/** Mensaje de un chat exportado de WhatsApp («Exportar chat» → «Sin archivos»). */
export interface MensajeChat {
  id: string
  autor: string
  fecha: FechaISO
  hora: string
  texto: string
}

// Android: «05/11/2026, 14:33 - Nombre: texto»   iPhone: «[5/11/26, 14:33:05] Nombre: texto»
const LINEA =
  /^‎?\[?(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}:\d{2})(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?([^:]{1,60}?):\s(.*)$/i

/** Mensajes del sistema o adjuntos omitidos que no son acciones. */
const RUIDO = /^(<?(multimedia|archivo|imagen|video|audio|sticker|documento)\s+omitid[oa]>?|<media omitted>|este mensaje fue eliminado|se eliminó este mensaje|los mensajes y las llamadas están cifrados)/i

function fechaISO(d: string, m: string, a: string): FechaISO | undefined {
  const anio = a.length === 2 ? `20${a}` : a
  const iso = `${anio}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  return esFechaISO(iso) ? iso : undefined
}

/** Convierte el texto exportado en mensajes. Las líneas sin encabezado continúan el mensaje anterior. */
export function leerChat(texto: string): MensajeChat[] {
  const mensajes: MensajeChat[] = []
  for (const cruda of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const linea = cruda.replace(/[‎‏‪-‮]/g, '')
    const m = LINEA.exec(linea)
    const fecha = m ? fechaISO(m[1], m[2], m[3]) : undefined
    if (m && fecha) {
      mensajes.push({ id: '', autor: m[5].trim(), fecha, hora: m[4].padStart(5, '0'), texto: m[6].trim() })
    } else if (mensajes.length && linea.trim()) {
      mensajes[mensajes.length - 1].texto += '\n' + linea.trim()
    }
  }
  return mensajes
    .filter((x) => x.texto && !RUIDO.test(x.texto))
    .map((x, i) => ({ ...x, id: `${x.fecha}T${x.hora}-${i}` }))
}

/** Solo los mensajes desde una fecha (inclusive) y, si se indica, de ciertos autores. */
export function filtrarMensajes(mensajes: readonly MensajeChat[], desde?: FechaISO, autores?: readonly string[]): MensajeChat[] {
  const permitidos = autores?.length ? new Set(autores.map((a) => a.toLowerCase())) : undefined
  return mensajes.filter((m) => (!desde || m.fecha >= desde) && (!permitidos || permitidos.has(m.autor.toLowerCase())))
}
