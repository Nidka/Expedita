/**
 * Código de expediente del Poder Judicial del Perú:
 * NNNNN-AAAA-I-DDDD-XX-YY-JJ
 * número · año · incidente/cuaderno · distrito judicial · instancia · especialidad · juzgado
 */
export interface NumeroExpediente {
  /** Forma normalizada, p. ej. `05328-2022-0-1801-JP-LA-04` */
  readonly valor: string
  readonly numero: string
  readonly anio: string
  readonly incidente: string
  readonly distrito: string
  readonly instancia: string
  readonly especialidad: string
  readonly juzgado: string
}

export interface ResultadoExtraccion {
  numero: NumeroExpediente
  /** Texto que acompañaba al número en el cuadro, p. ej. «(cc 406007)». Va a notas. */
  resto: string
}

const RE_NUMERO =
  /(\d{1,5})\s*-\s*(\d{4})\s*-\s*(\d{1,3})\s*-\s*(\d{4})\s*-\s*([A-Za-z]{2})\s*-\s*([A-Za-z]{2})\s*-\s*(\d{1,2})/

export const INSTANCIAS: Record<string, string> = {
  JR: 'Juzgado especializado',
  JP: 'Juzgado de paz letrado',
  JM: 'Juzgado mixto',
  SP: 'Sala superior',
  SC: 'Sala civil',
  SU: 'Corte Suprema',
}

export const ESPECIALIDADES: Record<string, string> = {
  CI: 'Civil',
  CO: 'Comercial',
  LA: 'Laboral',
  FC: 'Familia civil',
  FT: 'Familia tutelar',
  FP: 'Familia penal',
  PE: 'Penal',
  CA: 'Contencioso administrativo',
  DC: 'Constitucional',
}

function construir(m: RegExpMatchArray): NumeroExpediente {
  const numero = m[1].padStart(5, '0')
  const anio = m[2]
  const incidente = String(Number(m[3]))
  const distrito = m[4]
  const instancia = m[5].toUpperCase()
  const especialidad = m[6].toUpperCase()
  const juzgado = m[7].padStart(2, '0')
  return {
    valor: `${numero}-${anio}-${incidente}-${distrito}-${instancia}-${especialidad}-${juzgado}`,
    numero,
    anio,
    incidente,
    distrito,
    instancia,
    especialidad,
    juzgado,
  }
}

/** Busca un número de expediente dentro de un texto libre (correo, celda de Excel, WhatsApp). */
export function extraerNumeroExpediente(texto: string): ResultadoExtraccion | null {
  const m = texto.match(RE_NUMERO)
  if (!m) return null
  const resto = (texto.slice(0, m.index) + ' ' + texto.slice((m.index ?? 0) + m[0].length))
    .replace(/^[\s/,;:-]+|[\s/,;:-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return { numero: construir(m), resto }
}

/** Valida y normaliza un número escrito por el usuario. Devuelve null si no es válido. */
export function parsearNumeroExpediente(texto: string): NumeroExpediente | null {
  const limpio = texto.trim()
  const m = limpio.match(new RegExp(`^${RE_NUMERO.source}$`))
  return m ? construir(m) : null
}

/** Todos los números de expediente que aparecen en un texto, sin repetir. */
export function extraerTodos(texto: string): NumeroExpediente[] {
  const vistos = new Map<string, NumeroExpediente>()
  for (const m of texto.matchAll(new RegExp(RE_NUMERO.source, 'g'))) {
    const n = construir(m)
    vistos.set(n.valor, n)
  }
  return [...vistos.values()]
}
