/**
 * Expedita · Avisos del SINOE desde Gmail (Google Apps Script)
 *
 * Devuelve los correos de aviso de notificaciones de los últimos días (asunto, fecha, remitente
 * y texto) para que Expedita los registre en la bandeja con su expediente.
 * No envía ni borra correos; solo los lee.
 *
 * Instalación (una sola vez, con la cuenta de Gmail que recibe los avisos del SINOE):
 *   1. script.google.com → Nuevo proyecto → pega este archivo completo.
 *   2. Si hace falta, ajusta CONSULTA (misma sintaxis que el buscador de Gmail).
 *   3. Ejecuta «configurar» (▶) y autoriza. En «Registro de ejecución» aparece la CLAVE.
 *   4. Implementar → Nueva implementación → «Aplicación web»
 *        · Ejecutar como: Yo   · Quién tiene acceso: Cualquier usuario
 *      Copia la URL que termina en /exec.
 *   5. En Expedita → Ajustes → SINOE pega la URL y la CLAVE.
 */
const CONSULTA = 'from:pj.gob.pe newer_than:15d'
const MAX_MENSAJES = 60
const MAX_TEXTO = 6000

function configurar() {
  const props = PropertiesService.getScriptProperties()
  let clave = props.getProperty('CLAVE')
  if (!clave) {
    clave = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '')
    props.setProperty('CLAVE', clave)
  }
  GmailApp.search(CONSULTA, 0, 1) // pide permisos
  Logger.log('CLAVE para Expedita: ' + clave)
}

function renovarClave() {
  PropertiesService.getScriptProperties().deleteProperty('CLAVE')
  configurar()
}

function doGet(e) {
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE')
  if (!clave || !e || !e.parameter || e.parameter.clave !== clave) return json({ error: 'No autorizado' })
  const mensajes = []
  const hilos = GmailApp.search(CONSULTA, 0, 40)
  for (let i = 0; i < hilos.length && mensajes.length < MAX_MENSAJES; i++) {
    const delHilo = hilos[i].getMessages()
    for (let j = 0; j < delHilo.length && mensajes.length < MAX_MENSAJES; j++) {
      const m = delHilo[j]
      mensajes.push({
        id: m.getId(),
        fecha: m.getDate().toISOString(),
        de: m.getFrom(),
        asunto: m.getSubject(),
        texto: (m.getPlainBody() || '').slice(0, MAX_TEXTO),
      })
    }
  }
  return json({ consulta: CONSULTA, generado: new Date().toISOString(), mensajes: mensajes })
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
