import type { DrivePort } from '@/application/ports'
import type { CatalogoDrive } from '@/domain/documentos/drive'

/**
 * Adaptador del Drive: consulta el script de Google del estudio (aplicación web de Apps Script).
 * El script responde con metadatos (nombres, tipos, fechas y enlaces); nunca con el contenido.
 */
export const driveAppsScript: DrivePort = {
  async catalogo(url, clave, fresco = false) {
    let direccion: URL
    try {
      direccion = new URL(url)
    } catch {
      throw new Error('La dirección del script no es válida. Debe terminar en /exec.')
    }
    if (direccion.hostname !== 'script.google.com' || !direccion.pathname.endsWith('/exec')) {
      throw new Error('La dirección debe ser la del script de Google y terminar en /exec.')
    }
    direccion.searchParams.set('clave', clave)
    if (fresco) direccion.searchParams.set('fresco', '1')

    let respuesta: Response
    try {
      respuesta = await fetch(direccion, { redirect: 'follow' })
    } catch {
      throw new Error('No se pudo contactar al script de Google. Revisa que esté implementado como aplicación web con acceso para «Cualquier usuario».')
    }
    if (!respuesta.ok) throw new Error(`El script de Google respondió con error ${respuesta.status}.`)
    let datos: (CatalogoDrive & { error?: undefined }) | { error: string }
    try {
      datos = await respuesta.json()
    } catch {
      throw new Error('El script no devolvió datos. ¿Se implementó la última versión como aplicación web?')
    }
    if ('error' in datos && datos.error) throw new Error(datos.error === 'No autorizado' ? 'La clave no coincide con la del script.' : datos.error)
    return datos as CatalogoDrive
  },
}
