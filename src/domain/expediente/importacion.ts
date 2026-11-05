import type { Expediente } from '../entidades'
import { VIAS, viaPorEspecialidad } from '../plazos/catalogo'
import { esFechaISO, type FechaISO } from '../shared/fecha'
import { extraerNumeroExpediente } from './numero-expediente'

/** Una fila del cuadro de expedientes, ya leída del Excel (claves = encabezados normalizados). */
export type FilaCuadro = Record<string, unknown>

export type ExpedienteImportado = Omit<Expediente, 'id' | 'orgId' | 'creadoEn' | 'actualizadoEn'>

export interface ResultadoImportacion {
  expedientes: ExpedienteImportado[]
  fusionados: { numero: string; codigos: string[] }[]
  descartadas: { fila: number; motivo: string; valor: string }[]
  /** Expedientes que solo están en el cuadro actualizado (sin código interno). No se importan salvo que se pida. */
  soloEnActualizado: ExpedienteImportado[]
}

/** Hojas que nunca se leen (la Hoja 8 contiene credenciales en texto plano). */
export const HOJAS_PROHIBIDAS = [/^hoja\s*8$/i]

export function hojaPermitida(nombre: string): boolean {
  return !HOJAS_PROHIBIDAS.some((r) => r.test(nombre.trim()))
}

export function normalizarEncabezado(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[º°]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const COLUMNAS: Record<string, keyof ExpedienteImportado | 'numeroCrudo'> = {
  codigo: 'codigo',
  'n de expedientes': 'numeroCrudo',
  'no de expedientes': 'numeroCrudo',
  'n de expediente': 'numeroCrudo',
  'distrito jurisdiccional': 'distrito',
  juzgado: 'organo',
  especialista: 'especialista',
  demandante: 'demandante',
  demandado: 'demandado',
  cliente: 'cliente',
  materia: 'materia',
  'monto de petitorio': 'montoPetitorio',
  'estado del proceso': 'estadoProceso',
  'ultimo acto procesal': 'ultimoActo',
  'fecha del ultimo acto procesal': 'fechaUltimoActo',
  'actuacion pendiente': 'actuacionPendiente',
  'falta realizar': 'faltaRealizar',
  'monto sentenciado': 'montoSentenciado',
  'impulso mau': 'impulsoMau',
  'documentacion fisica': 'documentacion',
}

function texto(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).replace(/\s+/g, ' ').trim()
  return s || undefined
}

function numero(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  const s = texto(v)?.replace(/[^\d.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.')
  const n = s ? Number(s) : NaN
  return Number.isFinite(n) ? n : undefined
}

/** Acepta Date, número de serie de Excel o texto dd/mm/aaaa. */
export function fecha(v: unknown): FechaISO | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10)
  }
  const s = texto(v)
  if (!s) return undefined
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const a = m[3].length === 2 ? `20${m[3]}` : m[3]
    const iso = `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    return esFechaISO(iso) ? iso : undefined
  }
  return esFechaISO(s.slice(0, 10)) ? s.slice(0, 10) : undefined
}

function booleano(v: unknown): boolean | undefined {
  const s = texto(v)?.toLowerCase()
  if (!s) return undefined
  if (['si', 'sí', 'x', 'true', '1'].includes(s)) return true
  if (['no', 'false', '0'].includes(s)) return false
  return undefined
}

/** «la - 01 » → «LA-01» */
export function normalizarCodigo(c: string | undefined): string | undefined {
  return c?.replace(/\s*-\s*/g, '-').replace(/\s+/g, ' ').trim().toUpperCase() || undefined
}

/** Anexo C: etapa según el «Estado del proceso». */
export function etapaDesdeEstado(estadoProceso: string | undefined, ultimoActo: string | undefined): string | undefined {
  const e = (estadoProceso ?? '').toLowerCase()
  const acto = (ultimoActo ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
  if (/calificaci|admisi/.test(e)) return /CONCILIACION/.test(acto) ? 'Audiencia de conciliación' : 'Postulatoria'
  if (/sentencia|sentenciado/.test(e)) return 'Sentencia'
  if (/apelaci/.test(e)) return 'Impugnación'
  if (/casaci/.test(e)) return 'Casación'
  if (/ejecuci|consentida/.test(e)) return 'Ejecución'
  if (/JUZGAMIENTO/.test(acto)) return 'Audiencia de juzgamiento'
  if (/CONCILIACION/.test(acto)) return 'Audiencia de conciliación'
  return undefined
}

function filaAExpediente(fila: FilaCuadro): { exp?: ExpedienteImportado; crudo: string } {
  const datos: Record<string, unknown> = {}
  for (const [h, v] of Object.entries(fila)) {
    const campo = COLUMNAS[normalizarEncabezado(h)]
    if (campo) datos[campo] = v
  }
  const crudo = texto(datos.numeroCrudo) ?? ''
  const ext = extraerNumeroExpediente(crudo)
  if (!ext) return { crudo }
  const estadoProceso = texto(datos.estadoProceso)
  const ultimoActo = texto(datos.ultimoActo)
  const archivado = /archivad/i.test(estadoProceso ?? '')
  const via = viaPorEspecialidad(ext.numero.especialidad)
  const etapa = archivado ? 'Archivado' : etapaDesdeEstado(estadoProceso, ultimoActo)
  return {
    crudo,
    exp: {
      numero: ext.numero.valor,
      codigo: normalizarCodigo(texto(datos.codigo)),
      via,
      etapa: etapa && (etapa === 'Archivado' || VIAS[via].etapas.includes(etapa)) ? etapa : undefined,
      estado: archivado ? 'archivado' : 'activo',
      distrito: texto(datos.distrito),
      organo: texto(datos.organo),
      especialista: texto(datos.especialista),
      demandante: texto(datos.demandante),
      demandado: texto(datos.demandado),
      cliente: texto(datos.cliente),
      materia: texto(datos.materia),
      montoPetitorio: numero(datos.montoPetitorio),
      montoSentenciado: numero(datos.montoSentenciado),
      estadoProceso,
      ultimoActo,
      fechaUltimoActo: fecha(datos.fechaUltimoActo),
      actuacionPendiente: texto(datos.actuacionPendiente),
      faltaRealizar: booleano(datos.faltaRealizar),
      impulsoMau: texto(datos.impulsoMau),
      documentacion: texto(datos.documentacion),
      notas: ext.resto || undefined,
      origen: 'Cuadro de expedientes',
    },
  }
}

/**
 * Carga del cuadro (§5.8): el cuadro principal aporta el código interno;
 * si el número coincide en el cuadro actualizado, sus campos prevalecen (supuesto 4).
 * Los números repetidos se fusionan uniendo sus códigos.
 */
export function importarCuadro(principal: FilaCuadro[], actualizado: FilaCuadro[] = []): ResultadoImportacion {
  const descartadas: ResultadoImportacion['descartadas'] = []
  const porNumero = new Map<string, ExpedienteImportado>()
  const codigos = new Map<string, string[]>()

  principal.forEach((fila, i) => {
    const { exp, crudo } = filaAExpediente(fila)
    if (!exp) {
      if (crudo) descartadas.push({ fila: i + 2, motivo: 'Número de expediente no reconocido', valor: crudo })
      return
    }
    const previo = porNumero.get(exp.numero)
    if (exp.codigo) codigos.set(exp.numero, [...(codigos.get(exp.numero) ?? []), exp.codigo])
    if (!previo) porNumero.set(exp.numero, exp)
    else if (exp.notas && !previo.notas?.includes(exp.notas)) previo.notas = [previo.notas, exp.notas].filter(Boolean).join(' · ')
  })

  const actualizadoPorNumero = new Map<string, ExpedienteImportado>()
  for (const fila of actualizado) {
    const { exp } = filaAExpediente(fila)
    if (exp) actualizadoPorNumero.set(exp.numero, exp)
  }

  const fusionados: ResultadoImportacion['fusionados'] = []
  const expedientes: ExpedienteImportado[] = []
  for (const [num, base] of porNumero) {
    const cods = codigos.get(num) ?? []
    if (cods.length > 1) fusionados.push({ numero: num, codigos: cods })
    const act = actualizadoPorNumero.get(num)
    const fusion: ExpedienteImportado = { ...base }
    if (act) {
      for (const [k, v] of Object.entries(act) as [keyof ExpedienteImportado, unknown][]) {
        if (v !== undefined && k !== 'codigo' && k !== 'notas' && k !== 'impulsoMau' && k !== 'documentacion') {
          ;(fusion as Record<string, unknown>)[k] = v
        }
      }
      // Etapa y estado se derivan juntos del cuadro actualizado (no mezclar una etapa vieja con un estado nuevo)
      fusion.etapa = act.etapa
      fusion.estado = act.estado
    }
    fusion.codigo = cods.length ? cods.join(' / ') : undefined
    expedientes.push(fusion)
  }
  const soloEnActualizado = [...actualizadoPorNumero.values()].filter((e) => !porNumero.has(e.numero))
  return { expedientes, fusionados, descartadas, soloEnActualizado }
}
