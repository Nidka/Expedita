import type { PasoId } from '@/domain/guia/primeros-pasos'
import type { TemaId } from './temas'

/** Texto de cada paso de la guía de primeros pasos. */
export interface TextoPaso {
  titulo: string
  porQue: string
  como: string[]
  accion: { texto: string; a: string }
  tema?: TemaId
  minutos: number
  /** Texto del botón para marcarlo a mano (solo pasos que no se detectan solos) */
  marcar?: string
}

export const TEXTO_PASO: Record<PasoId, TextoPaso> = {
  clave: {
    titulo: 'Crea tu contraseña',
    porQue: 'Para entrar al instante desde cualquier equipo, sin esperar un enlace por correo.',
    como: ['Abre «Mi cuenta».', 'Escribe una contraseña de al menos 8 caracteres y guarda.'],
    accion: { texto: 'Ir a Mi cuenta', a: '/cuenta' },
    tema: 'cuenta',
    minutos: 1,
  },
  importar: {
    titulo: 'Carga tus expedientes',
    porQue: 'Con los expedientes cargados, Expedita calcula alertas, días sin movimiento y la agenda de todo el estudio.',
    como: [
      'Ajustes → Importar → elige el cuadro de Excel.',
      'Hoja principal: la que tiene los códigos (LA-01…). Si tienes una versión más reciente, elígela como segunda hoja.',
      'Revisa el resumen y pulsa «Importar».',
    ],
    accion: { texto: 'Importar el Excel', a: '/ajustes?pestana=importar' },
    tema: 'importar',
    minutos: 5,
  },
  equipo: {
    titulo: 'Invita a tu equipo',
    porQue: 'Cada persona entra con su propio correo: así queda registrado quién hizo cada acción y cada uno ve sus pendientes.',
    como: [
      'Ajustes → Equipo → correo, nombre y rol → «Invitar».',
      'Avísales que entren a Expedita con ese correo y elijan «Primera vez: crear mi contraseña».',
    ],
    accion: { texto: 'Invitar', a: '/ajustes?pestana=equipo' },
    tema: 'equipo',
    minutos: 3,
  },
  plazos: {
    titulo: 'Revisa días inhábiles y alertas',
    porQue: 'Los feriados nacionales ya están cargados. Agrega los días no laborables del Poder Judicial para que los plazos salgan exactos.',
    como: [
      'Ajustes → Plazos.',
      'Ajusta cuántos días sin movimiento disparan la alerta (30 por defecto).',
      'Agrega los días inhábiles que declare el Poder Judicial o tu Corte, uno por línea.',
    ],
    accion: { texto: 'Abrir Plazos', a: '/ajustes?pestana=plazos' },
    tema: 'plazos',
    minutos: 2,
    marcar: 'Ya lo revisé',
  },
  membrete: {
    titulo: 'Pon el membrete del estudio',
    porQue: 'Aparece arriba de cada escrito que descargues en Word.',
    como: ['Escritos → «Membrete».', 'Nombre del estudio, dirección, teléfono y correo, y la ciudad para la fecha.'],
    accion: { texto: 'Poner el membrete', a: '/escritos?membrete=1' },
    tema: 'escritos',
    minutos: 2,
  },
  sinoe: {
    titulo: 'Conecta los avisos del SINOE',
    porQue: 'Las notificaciones que llegan al Gmail del estudio entran solas, con su expediente, sin copiarlas a mano.',
    como: [
      'Ajustes → SINOE → «Copiar script».',
      'En script.google.com (con el Gmail que recibe los avisos) pega el script, ejecuta «configurar» e implementa como aplicación web.',
      'Pega en Expedita la URL y la clave, y pulsa «Guardar y probar».',
    ],
    accion: { texto: 'Conectar el SINOE', a: '/ajustes?pestana=sinoe' },
    tema: 'sinoe',
    minutos: 10,
  },
  recordatorio: {
    titulo: 'Activa el recordatorio diario',
    porQue: 'De lunes a viernes a las 8:00 llega al equipo un correo con lo vencido y lo que vence en la semana.',
    como: [
      'Ajustes → Recordatorio → «Copiar script».',
      'En script.google.com (con el Gmail del estudio) pega el script y ejecuta «activar».',
      'Para probarlo, ejecuta «enviarAhora».',
    ],
    accion: { texto: 'Activar el recordatorio', a: '/ajustes?pestana=recordatorio' },
    tema: 'recordatorio',
    minutos: 5,
    marcar: 'Ya lo activé',
  },
  drive: {
    titulo: 'Conecta el Drive de documentos',
    porQue: 'Cada expediente muestra la carpeta de su cliente en el Drive del estudio.',
    como: [
      'Ajustes → Drive → «Copiar script».',
      'Con la cuenta dueña del Drive, pega el script en script.google.com, pon el nombre de la carpeta principal, ejecuta «configurar» e implementa.',
      'Pega la URL y la clave en Expedita y pulsa «Guardar y probar».',
    ],
    accion: { texto: 'Conectar el Drive', a: '/ajustes?pestana=drive' },
    tema: 'drive',
    minutos: 10,
  },
  calendario: {
    titulo: 'Lleva la agenda a tu calendario',
    porQue: 'Plazos y audiencias en Google Calendar o el iPhone, con avisos el día anterior y una hora antes.',
    como: ['Agenda → «Suscribirse» → «Copiar».', 'En Google Calendar: «Otros calendarios» → «+» → «Desde URL» → pega.'],
    accion: { texto: 'Suscribirme', a: '/agenda?suscribir=1' },
    tema: 'calendario',
    minutos: 2,
    marcar: 'Ya lo agregué',
  },
  'primera-accion': {
    titulo: 'Registra tu primera acción',
    porQue: 'Cada impulso registrado reinicia los días sin movimiento del expediente y queda en su historial.',
    como: ['Pulsa «Registrar acción».', 'Elige el expediente, el tipo y escribe el detalle. Si queda algo pendiente, anota la próxima acción con su fecha.'],
    accion: { texto: 'Registrar acción', a: '/registrar' },
    tema: 'registrar',
    minutos: 1,
  },
  recorrido: {
    titulo: 'Recorre Expedita en 1 minuto',
    porQue: 'Un repaso rápido de dónde está cada cosa.',
    como: ['Pulsa «Empezar el recorrido».'],
    accion: { texto: 'Empezar el recorrido', a: '#recorrido' },
    minutos: 1,
    marcar: 'Ya lo conozco',
  },
}
