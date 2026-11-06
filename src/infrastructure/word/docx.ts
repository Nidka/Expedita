import { strToU8, zipSync } from 'fflate'
import type { GeneradorWord, Membrete } from '@/application/ports'

/**
 * Genera un .docx (Office Open XML) sin librerías pesadas: solo XML y un zip.
 * Formato habitual de escritos en el Perú: A4, Arial 12, interlineado 1.5, texto justificado,
 * margen izquierdo de 3 cm. El membrete va en el encabezado de cada página y la numeración en el pie.
 *
 * Convenciones del texto: «>> » alinea a la derecha, «^^ » centra, **negrita**.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

/** Texto con **negrita** → runs de Word */
function runs(texto: string, rPr = ''): string {
  return texto
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((t) => {
      const negrita = t.startsWith('**') && t.endsWith('**') && t.length > 4
      const contenido = negrita ? t.slice(2, -2) : t
      const props = `${rPr}${negrita ? '<w:b/>' : ''}`
      return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(contenido)}</w:t></w:r>`
    })
    .join('')
}

function parrafo(linea: string): string {
  let alin = 'both'
  let t = linea
  if (t.startsWith('>> ')) {
    alin = 'right'
    t = t.slice(3)
  } else if (t.startsWith('^^ ')) {
    alin = 'center'
    t = t.slice(3)
  }
  // Las líneas de la cabecera (a la derecha) van juntas, sin espacio entre ellas
  const espacio = alin === 'both' ? '<w:spacing w:after="120"/>' : '<w:spacing w:after="0"/>'
  return `<w:p><w:pPr><w:jc w:val="${alin}"/>${espacio}</w:pPr>${t.trim() ? runs(t) : ''}</w:p>`
}

export function documentoXml(texto: string): string {
  const cuerpo = texto.replace(/\r\n?/g, '\n').split('\n').map(parrafo).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>${cuerpo}<w:sectPr><w:headerReference w:type="default" r:id="rIdEncabezado"/><w:footerReference w:type="default" r:id="rIdPie"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1134" w:left="1701" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`
}

function encabezadoXml(m: Membrete): string {
  const titulo = m.titulo?.trim()
  const lineas = (m.detalle ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  if (!titulo && !lineas.length) return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W}><w:p/></w:hdr>`
  const ultimo = lineas.length ? lineas.length - 1 : -1
  const borde = '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="8C1D2B"/></w:pBdr>'
  const p = (contenido: string, conBorde: boolean) =>
    `<w:p><w:pPr>${conBorde ? borde : ''}<w:jc w:val="center"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${contenido}</w:p>`
  const partes: string[] = []
  if (titulo) partes.push(p(runs(titulo, '<w:b/><w:color w:val="8C1D2B"/><w:sz w:val="28"/>'), ultimo < 0))
  lineas.forEach((l, i) => partes.push(p(runs(l, '<w:color w:val="595959"/><w:sz w:val="17"/>'), i === ultimo)))
  partes.push('<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W}>${partes.join('')}</w:hdr>`
}

const PIE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${W}><w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:color w:val="808080"/><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="es-PE"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`

const TIPOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`

const RELS_DOC = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdEstilos" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdEncabezado" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdPie" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`

const core = (titulo: string, autor: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(titulo)}</dc:title><dc:creator>${esc(autor)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`

export function generarDocx(texto: string, membrete: Membrete, titulo = 'Escrito'): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(TIPOS),
    '_rels/.rels': strToU8(RELS),
    'docProps/core.xml': strToU8(core(titulo, membrete.titulo || 'Expedita')),
    'word/document.xml': strToU8(documentoXml(texto)),
    'word/styles.xml': strToU8(ESTILOS),
    'word/header1.xml': strToU8(encabezadoXml(membrete)),
    'word/footer1.xml': strToU8(PIE),
    'word/_rels/document.xml.rels': strToU8(RELS_DOC),
  })
}

export const generadorWord: GeneradorWord = {
  generar: (texto, membrete, titulo) =>
    new Blob([generarDocx(texto, membrete, titulo) as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
}
