/**
 * Expedita · Conexión con Google Drive (Google Apps Script)
 *
 * Lista las carpetas de clientes de UNA carpeta raíz y sus archivos (solo nombre, tipo,
 * fecha y enlace). No lee ni copia el contenido de los archivos: para abrirlos, Google
 * sigue pidiendo los permisos normales del Drive.
 *
 * Instalación (una sola vez, con la cuenta dueña del Drive):
 *   1. script.google.com → Nuevo proyecto → pega este archivo completo.
 *   2. En la línea CARPETA_RAIZ pega el ID de la carpeta de clientes
 *      (lo que va después de /folders/ en la dirección de la carpeta).
 *   3. Ejecuta la función «configurar» (botón ▶) y autoriza. En «Registro de ejecución» aparece la CLAVE.
 *   4. Implementar → Nueva implementación → tipo «Aplicación web»
 *        · Ejecutar como: Yo
 *        · Quién tiene acceso: Cualquier usuario
 *      Copia la URL que termina en /exec.
 *   5. En Expedita → Ajustes → Drive pega la URL y la CLAVE.
 */
const CARPETA_RAIZ = 'PEGA_AQUI_EL_ID_DE_LA_CARPETA_DE_CLIENTES'
const MAX_ARCHIVOS_POR_CARPETA = 150
const PROFUNDIDAD = 2 // cliente → subcarpeta (p. ej. por expediente)

function configurar() {
  const props = PropertiesService.getScriptProperties()
  let clave = props.getProperty('CLAVE')
  if (!clave) {
    clave = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '')
    props.setProperty('CLAVE', clave)
  }
  DriveApp.getFolderById(CARPETA_RAIZ) // valida el ID y pide permisos
  Logger.log('CLAVE para Expedita: ' + clave)
}

/** Para cambiar la clave si se filtró: ejecutar y copiar la nueva en Expedita. */
function renovarClave() {
  PropertiesService.getScriptProperties().deleteProperty('CLAVE')
  configurar()
}

function doGet(e) {
  const clave = PropertiesService.getScriptProperties().getProperty('CLAVE')
  if (!clave || !e || !e.parameter || e.parameter.clave !== clave) {
    return json({ error: 'No autorizado' })
  }
  const cache = CacheService.getScriptCache()
  if (e.parameter.fresco !== '1') {
    const guardado = leerCache(cache)
    if (guardado) return ContentService.createTextOutput(guardado).setMimeType(ContentService.MimeType.JSON)
  }
  const raiz = DriveApp.getFolderById(CARPETA_RAIZ)
  const carpetas = []
  const it = raiz.getFolders()
  while (it.hasNext()) carpetas.push(carpeta(it.next(), 1))
  const texto = JSON.stringify({ raiz: raiz.getName(), generado: new Date().toISOString(), carpetas: carpetas })
  guardarCache(cache, texto)
  return ContentService.createTextOutput(texto).setMimeType(ContentService.MimeType.JSON)
}

function carpeta(f, nivel) {
  const archivos = []
  const fi = f.getFiles()
  while (fi.hasNext() && archivos.length < MAX_ARCHIVOS_POR_CARPETA) {
    const a = fi.next()
    archivos.push({
      id: a.getId(),
      nombre: a.getName(),
      tipo: a.getMimeType(),
      url: a.getUrl(),
      actualizado: a.getLastUpdated().toISOString(),
      tamano: a.getSize(),
    })
  }
  const subcarpetas = []
  if (nivel < PROFUNDIDAD) {
    const si = f.getFolders()
    while (si.hasNext()) subcarpetas.push(carpeta(si.next(), nivel + 1))
  }
  return { id: f.getId(), nombre: f.getName(), url: f.getUrl(), actualizado: f.getLastUpdated().toISOString(), archivos: archivos, subcarpetas: subcarpetas }
}

// Caché de 10 minutos, en trozos de 90 KB (límite de CacheService: 100 KB por clave)
function guardarCache(cache, texto) {
  const trozos = Math.ceil(texto.length / 90000)
  const valores = { 'catalogo:n': String(trozos) }
  for (let i = 0; i < trozos; i++) valores['catalogo:' + i] = texto.slice(i * 90000, (i + 1) * 90000)
  try {
    cache.putAll(valores, 600)
  } catch (err) {
    /* catálogo muy grande: sin caché */
  }
}

function leerCache(cache) {
  const n = Number(cache.get('catalogo:n') || 0)
  if (!n) return null
  const claves = []
  for (let i = 0; i < n; i++) claves.push('catalogo:' + i)
  const partes = cache.getAll(claves)
  if (Object.keys(partes).length !== n) return null
  return claves.map(function (k) { return partes[k] }).join('')
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
