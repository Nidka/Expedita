import type { DrivePort, GmailPort, MensajeCorreo } from '@/application/ports'
import type { CatalogoDrive } from '@/domain/documentos/drive'

/**
 * Consulta un script de Google (Apps Script publicado como aplicación web) del estudio.
 * El script valida la clave y responde JSON. Se usa para el Drive y para los avisos del SINOE en Gmail.
 */
export async function consultarScript<T>(url: string, parametros: Record<string, string>): Promise<T> {
  let direccion: URL
  try {
    direccion = new URL(url.trim())
  } catch {
    throw new Error('La dirección del script no es válida. Debe terminar en /exec.')
  }
  if (direccion.hostname !== 'script.google.com' || !direccion.pathname.endsWith('/exec')) {
    throw new Error('La dirección debe ser la del script de Google y terminar en /exec.')
  }
  for (const [k, v] of Object.entries(parametros)) direccion.searchParams.set(k, v)

  let respuesta: Response
  try {
    respuesta = await fetch(direccion, { redirect: 'follow' })
  } catch {
    throw new Error('No se pudo contactar al script de Google. Revisa que esté implementado como aplicación web con acceso para «Cualquier usuario».')
  }
  if (!respuesta.ok) throw new Error(`El script de Google respondió con error ${respuesta.status}.`)
  let datos: T | { error: string }
  try {
    datos = await respuesta.json()
  } catch {
    throw new Error('El script no devolvió datos. ¿Se implementó la última versión como aplicación web?')
  }
  if (datos && typeof datos === 'object' && 'error' in datos && datos.error) {
    throw new Error(datos.error === 'No autorizado' ? 'La clave no coincide con la del script.' : String(datos.error))
  }
  return datos as T
}

export const driveAppsScript: DrivePort = {
  catalogo: (url, clave, fresco = false) => consultarScript<CatalogoDrive>(url, fresco ? { clave, fresco: '1' } : { clave }),
}

export const gmailAppsScript: GmailPort = {
  async mensajes(url, clave) {
    const r = await consultarScript<{ mensajes: MensajeCorreo[] }>(url, { clave })
    return Array.isArray(r.mensajes) ? r.mensajes : []
  },
}
