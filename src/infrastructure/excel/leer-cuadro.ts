import { readSheet, SheetNotFoundError } from 'read-excel-file/browser'
import { hojaPermitida, normalizarEncabezado, type FilaCuadro } from '@/domain/expediente/importacion'

/**
 * Lee UNA hoja del cuadro de expedientes. Solo se abre la hoja pedida:
 * la «Hoja 8» (credenciales en texto plano) nunca se lee.
 * Detecta la fila de encabezados aunque el cuadro tenga títulos arriba.
 */
export async function leerHojaCuadro(archivo: File, hoja: string): Promise<FilaCuadro[]> {
  if (!hojaPermitida(hoja)) throw new Error('Esa hoja no se puede importar.')
  let filas: unknown[][]
  try {
    filas = (await readSheet(archivo, hoja)) as unknown[][]
  } catch (e) {
    if (e instanceof SheetNotFoundError) throw new Error(`El archivo «${archivo.name}» no tiene la hoja «${hoja}».`)
    throw new Error(`No se pudo leer «${archivo.name}». ¿Es un .xlsx válido?`)
  }
  const iEncabezado = filas.findIndex((f) =>
    f.some((c) => typeof c === 'string' && /^n[o]? de expediente/.test(normalizarEncabezado(c))),
  )
  if (iEncabezado < 0) throw new Error(`No se encontró la columna «Nº de expedientes» en la hoja «${hoja}».`)
  const encabezados = filas[iEncabezado].map((c) => (c === null || c === undefined ? '' : String(c)))
  return filas
    .slice(iEncabezado + 1)
    .filter((f) => f.some((c) => c !== null && c !== undefined && String(c).trim() !== ''))
    .map((f) => Object.fromEntries(encabezados.map((h, i) => [h, f[i]]).filter(([h]) => h)))
}

/**
 * Nombres de las hojas tal como están en el archivo (incluidos espacios al final).
 * Solo lee el índice del libro (xl/workbook.xml), nunca el contenido de las hojas.
 * Las hojas prohibidas (credenciales) no se ofrecen.
 */
export async function hojasDelLibro(archivo: File): Promise<string[]> {
  const { unzipSync, strFromU8 } = await import('fflate')
  let indice: Uint8Array | undefined
  try {
    indice = unzipSync(new Uint8Array(await archivo.arrayBuffer()), { filter: (f) => f.name === 'xl/workbook.xml' })['xl/workbook.xml']
  } catch {
    throw new Error(`No se pudo leer «${archivo.name}». ¿Es un .xlsx válido?`)
  }
  if (!indice) throw new Error(`«${archivo.name}» no parece un libro de Excel (.xlsx).`)
  const xml = strFromU8(indice)
  const entidades: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
  return [...xml.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)]
    .map((m) => m[1].replace(/&(amp|lt|gt|quot|apos);/g, (e) => entidades[e]))
    .filter(hojaPermitida)
}
