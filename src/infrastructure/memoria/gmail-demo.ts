import type { GmailPort } from '@/application/ports'

/** Gmail ficticio para el modo demo: un aviso del SINOE de un expediente de la semilla. */
export const gmailDemo: GmailPort = {
  async mensajes() {
    const ayer = new Date(Date.now() - 86_400_000)
    return [
      {
        id: 'demo-sinoe-1',
        fecha: ayer.toISOString(),
        de: 'Notificaciones SINOE <sinoe@pj.gob.pe>',
        asunto: 'Notificación electrónica: Resolución N.° 7',
        texto:
          'Se le comunica que en su casilla electrónica se ha depositado la notificación del EXPEDIENTE N° 00456-2024-0-1801-JP-LA-02 · Resolución N.° 7 (ficticio).',
      },
    ]
  },
}
