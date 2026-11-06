import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { documentoXml, generarDocx } from './docx'

describe('generador de Word', () => {
  it('arma el paquete con membrete, pie y cuerpo', () => {
    const zip = unzipSync(generarDocx('>> Expediente: 1\n\n**SEÑOR JUEZ:**\nTexto con <signos> & más', { titulo: 'Estudio Ríos', detalle: 'Av. Lima 123\nTel. 999' }))
    expect(Object.keys(zip).sort()).toEqual(
      ['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/footer1.xml', 'word/header1.xml', 'word/styles.xml'].sort(),
    )
    const doc = strFromU8(zip['word/document.xml'])
    expect(doc).toContain('<w:jc w:val="right"/>')
    expect(doc).toContain('<w:b/></w:rPr><w:t xml:space="preserve">SEÑOR JUEZ:</w:t>')
    expect(doc).toContain('Texto con &lt;signos&gt; &amp; más')
    const enc = strFromU8(zip['word/header1.xml'])
    expect(enc).toContain('Estudio Ríos')
    expect(enc).toContain('Tel. 999')
  })

  it('centra con ^^ y deja párrafos vacíos para las líneas en blanco', () => {
    const doc = documentoXml('^^ Firma\n\nfin')
    expect(doc).toContain('<w:jc w:val="center"/>')
    expect(doc.match(/<w:p>/g)).toHaveLength(3)
  })
})
