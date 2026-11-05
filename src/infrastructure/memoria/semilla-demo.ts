import type { Contenedor } from '@/application/contenedor'
import { CalendarioHabil } from '@/domain/plazos/calendario-habil'
import { FERIADOS_NACIONALES } from '@/domain/plazos/feriados'
import { sumarDias } from '@/domain/shared/fecha'

/** Datos ficticios para el modo demo. No corresponden a clientes reales. */
export async function sembrarDemo(c: Contenedor): Promise<void> {
  if ((await c.expedientes.listar()).length) return
  const hoy = c.reloj.hoy()
  const cal = new CalendarioHabil(FERIADOS_NACIONALES)
  const habil = (n: number) => cal.sumarHabiles(hoy, n)
  const exps = await c.expedientes.crearVarios([
    {
      numero: '01234-2025-0-1801-JR-LA-05',
      codigo: 'LA-01',
      via: 'lab-ord',
      etapa: 'Audiencia de juzgamiento',
      estado: 'activo',
      distrito: 'Lima',
      organo: '5° Juzgado Especializado de Trabajo Permanente',
      especialista: 'Especialista A',
      demandante: 'María Pérez (ficticio)',
      demandado: 'Empresa Ejemplo S.A.C.',
      cliente: 'María Pérez (ficticio)',
      materia: 'Beneficios sociales',
      estadoProceso: 'En proceso',
      ultimoActo: 'Resolución que programa audiencia',
      fechaUltimoActo: sumarDias(hoy, -12),
      actuacionPendiente: 'I.P',
    },
    {
      numero: '00456-2024-0-1801-JP-LA-02',
      codigo: 'LA-02',
      via: 'lab-ord',
      etapa: 'Sentencia',
      estado: 'activo',
      distrito: 'Lima',
      organo: '2° Juzgado de Paz Letrado Laboral',
      demandante: 'Juan Torres (ficticio)',
      demandado: 'Comercial Demo E.I.R.L.',
      cliente: 'Juan Torres (ficticio)',
      materia: 'Asignación familiar',
      estadoProceso: 'Espera de Sentencia',
      fechaUltimoActo: sumarDias(hoy, -45),
    },
    {
      numero: '07890-2023-0-1601-JR-CI-03',
      codigo: 'CI-01',
      via: 'civ-con',
      etapa: 'Probatoria',
      estado: 'activo',
      distrito: 'La Libertad',
      organo: '3° Juzgado Civil de Trujillo',
      demandante: 'Inversiones Norte (ficticio)',
      demandado: 'Constructora Demo S.A.',
      cliente: 'Inversiones Norte (ficticio)',
      materia: 'Obligación de dar suma de dinero',
      fechaUltimoActo: sumarDias(hoy, -100),
    },
    {
      numero: '03311-2025-0-1801-JR-LA-12',
      codigo: 'LA-03',
      via: 'lab-ord',
      etapa: 'Postulatoria',
      estado: 'activo',
      distrito: 'Lima',
      organo: '12° Juzgado de Trabajo Transitorio',
      cliente: 'Rosa Quispe (ficticio)',
      demandante: 'Rosa Quispe (ficticio)',
      demandado: 'Servicios Demo S.A.',
      materia: 'Desnaturalización de contrato',
      actuacionPendiente: 'Verificar admisión de la demanda',
      fechaUltimoActo: sumarDias(hoy, -20),
    },
  ])
  await c.notificaciones.crear({
    expedienteId: exps[0].id,
    numero: exps[0].numero,
    asunto: 'Resolución N.° 4: Traslado de escrito',
    recibido: sumarDias(hoy, -2),
    casilla: true,
    estado: 'pendiente',
    origen: 'manual',
    vencimiento: habil(2),
  })
  await c.acciones.crear({
    expedienteId: exps[1].id,
    fecha: sumarDias(hoy, -10),
    tipo: 'Pedido de sentencia / resolución',
    descripcion: 'Se presentó escrito solicitando se expida sentencia.',
    responsable: 'Usuario demo',
    cargo: '4521-2026',
    proxima: 'Revisar CEJ si se expidió sentencia',
    proximaFecha: habil(4),
    proximaCumplida: false,
    origen: 'manual',
  })
  await c.audiencias.crear({
    expedienteId: exps[0].id,
    tipo: 'Juzgamiento',
    fecha: habil(3),
    hora: '09:30',
    modalidad: 'virtual',
    estado: 'programada',
    lugar: 'Google Meet (enlace del juzgado)',
    responsable: 'Usuario demo',
  })
}
