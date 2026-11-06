import type { Expediente } from '../entidades'
import { aDate, type FechaISO } from '../shared/fecha'

/** Modelo de escrito o ficha de jurisprudencia de la biblioteca del estudio (RF-37). */
export interface ModeloEscrito {
  id: string
  orgId: string
  titulo: string
  categoria: 'escrito' | 'jurisprudencia'
  contenido: string
  creadoEn: string
  actualizadoEn: string
}

/** Variables que se pueden usar en un modelo como {{nombre}}. */
export const VARIABLES = {
  numero: 'Número de expediente',
  codigo: 'Código interno',
  cliente: 'Cliente',
  demandante: 'Demandante',
  demandado: 'Demandado',
  materia: 'Materia',
  juzgado: 'Juzgado',
  especialista: 'Especialista legal',
  abogado: 'Tu nombre',
  estudio: 'Nombre del estudio',
  ciudad: 'Ciudad',
  fecha: 'Fecha de hoy en letras',
} as const

export type Variable = keyof typeof VARIABLES
export type DatosPlantilla = Partial<Record<Variable, string>>

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** 2026-11-05 → «5 de noviembre de 2026» */
export function fechaEnLetras(f: FechaISO): string {
  const d = aDate(f)
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
}

export function datosDeExpediente(
  exp: Expediente | undefined,
  otros: { abogado?: string; estudio?: string; ciudad?: string; hoy: FechaISO },
): DatosPlantilla {
  return {
    numero: exp?.numero,
    codigo: exp?.codigo,
    cliente: exp?.cliente || exp?.demandante,
    demandante: exp?.demandante,
    demandado: exp?.demandado,
    materia: exp?.materia,
    juzgado: exp?.organo,
    especialista: exp?.especialista,
    abogado: otros.abogado,
    estudio: otros.estudio,
    ciudad: otros.ciudad || 'Lima',
    fecha: fechaEnLetras(otros.hoy),
  }
}

const MARCA = /\{\{\s*([a-záéíóúñ_]+)\s*\}\}/gi

/**
 * Reemplaza {{variable}} por su valor. Lo que falta queda como [VARIABLE] para que se note
 * al revisar (la misma convención que usa el asistente de IA). Si la variable se escribe en
 * MAYÚSCULAS, el valor también sale en mayúsculas.
 */
export function rellenar(texto: string, datos: DatosPlantilla): string {
  return texto.replace(MARCA, (_, nombre: string) => {
    const v = datos[nombre.toLowerCase() as Variable]?.trim()
    if (!v) return `[${nombre.toUpperCase()}]`
    // {{JUZGADO}} en mayúsculas → valor en mayúsculas (como se estila en el encabezado del escrito)
    return nombre === nombre.toUpperCase() ? v.toLocaleUpperCase('es') : v
  })
}

/** Datos que quedaron sin completar: marcas [EN MAYÚSCULAS] que siguen en el texto. */
export function pendientes(texto: string): string[] {
  return [...new Set([...texto.matchAll(/\[([A-ZÁÉÍÓÚÑ°.\s]{2,40})\]/g)].map((m) => m[1].trim()))]
}

/** Nombre de archivo seguro: «Pedido de sentencia - LA-05.docx» */
export function nombreArchivo(titulo: string, exp?: Pick<Expediente, 'codigo' | 'numero'>): string {
  const base = [titulo, exp?.codigo || exp?.numero].filter(Boolean).join(' - ')
  const limpio = base.replace(/\s*[\\/:*?"<>|]+\s*/g, ' - ').replace(/\s+/g, ' ').trim().slice(0, 120)
  return `${limpio || 'Escrito'}.docx`
}
