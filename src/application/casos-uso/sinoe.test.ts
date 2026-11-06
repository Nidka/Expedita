import { describe, expect, it } from 'vitest'
import { contenedorMemoria } from '@/infrastructure/memoria/repositorios'
import { importarAvisosSinoe } from './sinoe'

const aviso = (id: string, texto: string, fecha = '2026-11-04T20:30:00Z') => ({
  id,
  fecha,
  de: 'SINOE <sinoe@pj.gob.pe>',
  asunto: 'Notificación electrónica',
  texto,
})

describe('avisos del SINOE desde Gmail', () => {
  it('registra cada aviso una sola vez, con su expediente y la fecha de Lima', async () => {
    const c = contenedorMemoria()
    const exp = await c.expedientes.crear({ numero: '00456-2024-0-1801-JP-LA-02', via: 'lab-ord', estado: 'activo' })
    // 04/11 20:30 UTC = 04/11 15:30 en Lima; 05/11 03:00 UTC = 04/11 22:00 en Lima
    const mensajes = [aviso('m1', 'EXPEDIENTE N° 00456-2024-0-1801-JP-LA-02 Resolución 7'), aviso('m2', 'Exp. 9999-2026-0-1801-JR-LA-01', '2026-11-05T03:00:00Z')]

    const r1 = await importarAvisosSinoe(c, mensajes)
    expect(r1.nuevas).toHaveLength(2)
    const deExp = r1.nuevas.find((n) => n.numero === exp.numero)!
    expect(deExp).toMatchObject({ expedienteId: exp.id, casilla: true, origen: 'gmail', origenRef: 'm1', recibido: '2026-11-04', estado: 'pendiente' })
    expect(r1.nuevas.find((n) => n.origenRef === 'm2')?.recibido).toBe('2026-11-04')
    // El expediente desconocido se crea
    expect(await c.expedientes.porNumero('09999-2026-0-1801-JR-LA-01')).not.toBeNull()

    const r2 = await importarAvisosSinoe(c, mensajes)
    expect(r2.nuevas).toHaveLength(0)
    expect(r2.yaRegistrados).toBe(2)
    expect(await c.notificaciones.listar()).toHaveLength(2)
  })

  it('separa los correos sin número de expediente', async () => {
    const c = contenedorMemoria()
    const r = await importarAvisosSinoe(c, [aviso('x', 'Mantenimiento programado del SINOE el sábado')])
    expect(r.nuevas).toHaveLength(0)
    expect(r.sinNumero.map((m) => m.id)).toEqual(['x'])
  })
})
