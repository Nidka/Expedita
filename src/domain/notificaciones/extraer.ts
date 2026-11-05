import { extraerNumeroExpediente } from '../expediente/numero-expediente'
import { esFechaISO, type FechaISO } from '../shared/fecha'

export interface DatosExtraidos {
  numero?: string
  asunto?: string
  recibido?: FechaISO
  casilla: boolean
}

/** Extracción sin IA (RF-07): número, asunto y fecha a partir del texto pegado del correo. */
export function extraerDeCorreo(texto: string): DatosExtraidos {
  const numero = extraerNumeroExpediente(texto)?.numero.valor
  const asunto =
    texto.match(/^\s*asunto\s*:\s*(.+)$/im)?.[1]?.trim() ??
    texto.match(/(RESOLUCI[OÓ]N\s*(?:N[°º.o]*\s*)?\d+[^\n]{0,80})/i)?.[1]?.trim()

  let recibido: FechaISO | undefined
  const m = texto.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    if (esFechaISO(iso)) recibido = iso
  }
  const casilla = /casilla|SINOE|notificaci[oó]n electr[oó]nica/i.test(texto)
  return { numero, asunto, recibido, casilla }
}
