import { describe, expect, it } from 'vitest'
import { filtrarMensajes, leerChat } from './chat'

describe('chat exportado de WhatsApp', () => {
  it('lee el formato de Android con mensajes de varias líneas', () => {
    const m = leerChat(
      [
        '05/11/2026, 09:12 - Los mensajes y las llamadas están cifrados de extremo a extremo.',
        '05/11/2026, 14:33 - María Pérez: Exp LA-04 presenté pedido de sentencia',
        'cargo 4521-2026',
        '05/11/2026, 14:40 - Juan: <Multimedia omitido>',
        '06/11/2026, 08:05 - Juan: Visité el 5° juzgado, falta proveer',
      ].join('\n'),
    )
    expect(m).toHaveLength(2)
    expect(m[0]).toMatchObject({ autor: 'María Pérez', fecha: '2026-11-05', hora: '14:33', texto: 'Exp LA-04 presenté pedido de sentencia\ncargo 4521-2026' })
    expect(m[1]).toMatchObject({ autor: 'Juan', fecha: '2026-11-06' })
  })

  it('lee el formato de iPhone con año de dos dígitos y segundos', () => {
    const m = leerChat('[5/11/26, 14:33:05] Rosa Quispe: Revisé CEJ del LA-02, sin novedades')
    expect(m[0]).toMatchObject({ autor: 'Rosa Quispe', fecha: '2026-11-05', hora: '14:33', texto: 'Revisé CEJ del LA-02, sin novedades' })
  })

  it('filtra por fecha y autor', () => {
    const m = leerChat(['01/11/2026, 10:00 - Ana: viejo', '05/11/2026, 10:00 - Ana: nuevo', '05/11/2026, 11:00 - Otro: ajeno'].join('\n'))
    expect(filtrarMensajes(m, '2026-11-03', ['ana']).map((x) => x.texto)).toEqual(['nuevo'])
  })
})
