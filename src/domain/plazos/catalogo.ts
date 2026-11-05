/**
 * Catálogo de vías procesales, etapas y plazos (Perú).
 * Fuente: anexo A del documento de traspaso. ES REFERENCIAL: falta verificación
 * jurídica contra el texto vigente (pendiente n.º 19). Cada organización podrá
 * sobrescribirlo desde la base de datos.
 */

export type ViaId =
  | 'civ-con'
  | 'civ-abr'
  | 'civ-sum'
  | 'civ-eje'
  | 'fam-ali'
  | 'lab-ord'
  | 'lab-abr'
  | 'cont-adm'
  | 'pen-ncpp'
  | 'otra'

export type UnidadPlazo = 'habiles' | 'naturales'
/** Quién debe actuar: la parte (nosotros) o el órgano (sirve para saber cuándo pedir impulso). */
export type ObligadoPlazo = 'parte' | 'juzgado' | 'fiscalia'

export interface Via {
  id: ViaId
  nombre: string
  etapas: readonly string[]
  /** Aplica abandono del CPC art. 346 */
  abandono: boolean
}

export interface ActoPlazo {
  id: string
  via: ViaId
  nombre: string
  dias: number
  unidad: UnidadPlazo
  obligado: ObligadoPlazo
  norma: string
}

export const ETAPA_ARCHIVADO = 'Archivado'

const ETAPAS_CIVIL_CON = [
  'Postulatoria',
  'Saneamiento procesal',
  'Fijación de puntos controvertidos',
  'Probatoria',
  'Alegatos',
  'Sentencia',
  'Impugnación',
  'Segunda instancia',
  'Casación',
  'Ejecución',
] as const
const ETAPAS_SUMARISIMO = ['Postulatoria', 'Audiencia única', 'Sentencia', 'Impugnación', 'Segunda instancia', 'Ejecución'] as const

export const VIAS: Record<ViaId, Via> = {
  'civ-con': { id: 'civ-con', nombre: 'Civil · Conocimiento', etapas: ETAPAS_CIVIL_CON, abandono: true },
  'civ-abr': { id: 'civ-abr', nombre: 'Civil · Abreviado', etapas: ETAPAS_CIVIL_CON, abandono: true },
  'civ-sum': { id: 'civ-sum', nombre: 'Civil · Sumarísimo', etapas: ETAPAS_SUMARISIMO, abandono: true },
  'civ-eje': {
    id: 'civ-eje',
    nombre: 'Civil · Ejecutivo / único de ejecución',
    etapas: ['Mandato ejecutivo', 'Contradicción', 'Auto que resuelve la contradicción', 'Impugnación', 'Ejecución forzada'],
    abandono: true,
  },
  'fam-ali': { id: 'fam-ali', nombre: 'Familia · Alimentos (proceso único)', etapas: ETAPAS_SUMARISIMO, abandono: false },
  'lab-ord': {
    id: 'lab-ord',
    nombre: 'Laboral NLPT · Ordinario',
    etapas: [
      'Postulatoria',
      'Audiencia de conciliación',
      'Audiencia de juzgamiento',
      'Sentencia',
      'Impugnación',
      'Segunda instancia',
      'Casación',
      'Ejecución',
    ],
    abandono: false,
  },
  'lab-abr': {
    id: 'lab-abr',
    nombre: 'Laboral NLPT · Abreviado',
    etapas: ['Postulatoria', 'Contestación', 'Audiencia única', 'Sentencia', 'Impugnación', 'Segunda instancia', 'Ejecución'],
    abandono: false,
  },
  'cont-adm': {
    id: 'cont-adm',
    nombre: 'Contencioso administrativo',
    etapas: [
      'Postulatoria',
      'Contestación',
      'Saneamiento procesal',
      'Dictamen fiscal',
      'Sentencia',
      'Impugnación',
      'Segunda instancia',
      'Casación',
      'Ejecución',
    ],
    abandono: true,
  },
  'pen-ncpp': {
    id: 'pen-ncpp',
    nombre: 'Penal · NCPP',
    etapas: [
      'Diligencias preliminares',
      'Investigación preparatoria',
      'Etapa intermedia',
      'Juicio oral',
      'Sentencia',
      'Impugnación',
      'Ejecución',
    ],
    abandono: false,
  },
  otra: { id: 'otra', nombre: 'Otra', etapas: ['En trámite', 'Sentencia', 'Impugnación', 'Ejecución'], abandono: false },
}

type FilaActo = [ViaId, string, number, string, ObligadoPlazo?, UnidadPlazo?]

const FILAS: FilaActo[] = [
  ['civ-con', 'Contestar la demanda / reconvenir', 30, 'CPC art. 478'],
  ['civ-con', 'Excepciones o defensas previas', 10, 'CPC art. 478'],
  ['civ-con', 'Absolver excepciones', 10, 'CPC art. 478'],
  ['civ-con', 'Tachas u oposiciones', 5, 'CPC art. 478'],
  ['civ-con', 'Absolver reconvención', 30, 'CPC art. 478'],
  ['civ-con', 'Subsanar inadmisibilidad (máximo)', 10, 'CPC art. 426'],
  ['civ-con', 'Apelar la sentencia', 10, 'CPC art. 478'],
  ['civ-con', 'Apelar un auto', 3, 'CPC art. 376'],
  ['civ-con', 'Reposición', 3, 'CPC art. 363'],
  ['civ-con', 'Casación', 10, 'CPC art. 387'],
  ['civ-con', 'Audiencia de pruebas', 50, 'CPC art. 478', 'juzgado'],
  ['civ-con', 'Expedir sentencia', 50, 'CPC art. 478', 'juzgado'],
  ['civ-abr', 'Contestar / reconvenir', 10, 'CPC art. 491'],
  ['civ-abr', 'Excepciones o defensas previas', 5, 'CPC art. 491'],
  ['civ-abr', 'Absolver excepciones', 5, 'CPC art. 491'],
  ['civ-abr', 'Tachas u oposiciones', 3, 'CPC art. 491'],
  ['civ-abr', 'Absolver reconvención', 10, 'CPC art. 491'],
  ['civ-abr', 'Apelar la sentencia', 5, 'CPC art. 491'],
  ['civ-abr', 'Apelar un auto', 3, 'CPC art. 376'],
  ['civ-abr', 'Reposición', 3, 'CPC art. 363'],
  ['civ-abr', 'Casación', 10, 'CPC art. 387'],
  ['civ-abr', 'Expedir sentencia', 25, 'CPC art. 491', 'juzgado'],
  ['civ-sum', 'Contestar (con excepciones y tachas)', 5, 'CPC art. 554'],
  ['civ-sum', 'Audiencia única (desde la contestación)', 10, 'CPC art. 554', 'juzgado'],
  ['civ-sum', 'Apelar la sentencia', 3, 'CPC art. 556'],
  ['civ-sum', 'Apelar un auto', 3, 'CPC art. 376'],
  ['civ-sum', 'Casación', 10, 'CPC art. 387'],
  ['civ-eje', 'Formular contradicción', 5, 'CPC art. 690-D'],
  ['civ-eje', 'Absolver contradicción', 3, 'CPC art. 690-E'],
  ['civ-eje', 'Apelar el auto final', 3, 'CPC art. 691'],
  ['civ-eje', 'Resolver contradicción', 5, 'CPC art. 690-E', 'juzgado'],
  ['fam-ali', 'Contestar la demanda', 5, 'CNA, proceso único'],
  ['fam-ali', 'Audiencia única', 10, 'CNA, proceso único', 'juzgado'],
  ['fam-ali', 'Apelar la sentencia', 3, 'CNA, proceso único'],
  ['lab-ord', 'Subsanar la demanda', 5, 'NLPT art. 17'],
  ['lab-ord', 'Audiencia de conciliación (desde la admisión)', 30, 'NLPT art. 42', 'juzgado'],
  ['lab-ord', 'Audiencia de juzgamiento (desde la conciliación)', 30, 'NLPT art. 43', 'juzgado'],
  ['lab-ord', 'Sentencia diferida', 5, 'NLPT art. 47', 'juzgado'],
  ['lab-ord', 'Apelar la sentencia', 5, 'NLPT art. 32'],
  ['lab-ord', 'Casación', 10, 'NLPT art. 35'],
  ['lab-abr', 'Subsanar la demanda', 5, 'NLPT art. 17'],
  ['lab-abr', 'Contestar la demanda', 10, 'NLPT art. 48'],
  ['lab-abr', 'Audiencia única (desde la admisión)', 30, 'NLPT art. 48', 'juzgado'],
  ['lab-abr', 'Apelar la sentencia', 5, 'NLPT art. 32'],
  ['lab-abr', 'Casación', 10, 'NLPT art. 35'],
  ['cont-adm', 'Excepciones o defensas previas', 5, 'TUO Ley 27584 art. 28'],
  ['cont-adm', 'Contestar la demanda', 10, 'TUO Ley 27584 art. 28'],
  ['cont-adm', 'Dictamen fiscal', 15, 'TUO Ley 27584 art. 28', 'fiscalia'],
  ['cont-adm', 'Expedir sentencia', 15, 'TUO Ley 27584 art. 28', 'juzgado'],
  ['cont-adm', 'Apelar la sentencia', 5, 'TUO Ley 27584 art. 28'],
  ['cont-adm', 'Casación', 10, 'CPC art. 387'],
  ['pen-ncpp', 'Absolver la acusación (control)', 10, 'NCPP art. 350'],
  ['pen-ncpp', 'Apelar la sentencia', 5, 'NCPP art. 414.1.b'],
  ['pen-ncpp', 'Apelar un auto', 3, 'NCPP art. 414.1.c'],
  ['pen-ncpp', 'Reposición', 2, 'NCPP art. 414.1.d'],
  ['pen-ncpp', 'Casación', 10, 'NCPP art. 414.1.a'],
  ['pen-ncpp', 'Investigación preparatoria', 120, 'NCPP art. 342.1', 'fiscalia', 'naturales'],
  ['otra', 'Apelar un auto', 3, 'CPC art. 376'],
  ['otra', 'Reposición', 3, 'CPC art. 363'],
]

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const ACTOS: readonly ActoPlazo[] = FILAS.map(([via, nombre, dias, norma, obligado = 'parte', unidad = 'habiles']) => ({
  id: `${via}:${slug(nombre)}`,
  via,
  nombre,
  dias,
  unidad,
  obligado,
  norma,
}))

export function actosDeVia(via: ViaId): ActoPlazo[] {
  return ACTOS.filter((a) => a.via === via)
}

export function buscarActo(id: string): ActoPlazo | undefined {
  return ACTOS.find((a) => a.id === id)
}

/** Vía por defecto según la especialidad del número de expediente. */
export function viaPorEspecialidad(especialidad: string): ViaId {
  switch (especialidad.toUpperCase()) {
    case 'LA':
      return 'lab-ord'
    case 'CA':
      return 'cont-adm'
    case 'PE':
      return 'pen-ncpp'
    case 'CI':
    case 'CO':
      return 'civ-con'
    default:
      return 'otra'
  }
}

export function esViaId(v: string): v is ViaId {
  return v in VIAS
}

/** Sugerencia fija de impulso según la etapa (se muestra sin IA). */
export const SUGERENCIA_POR_ETAPA: Record<string, string> = {
  Postulatoria: 'Verificar calificación o admisión de la demanda; si demora, presentar escrito de impulso.',
  Contestación: 'Verificar si se contestó; si venció el plazo, pedir que se declare rebeldía.',
  'Saneamiento procesal': 'Solicitar que se expida el auto de saneamiento.',
  'Fijación de puntos controvertidos': 'Solicitar que se fijen puntos controvertidos y se admitan medios probatorios.',
  Probatoria: 'Solicitar programación de la audiencia de pruebas.',
  Alegatos: 'Presentar alegatos y pedir que se expida sentencia.',
  'Audiencia de conciliación': 'Confirmar fecha de la audiencia de conciliación; si no está programada, solicitarla.',
  'Audiencia de juzgamiento': 'Confirmar fecha de la audiencia de juzgamiento; si no está programada, solicitarla.',
  'Audiencia única': 'Confirmar o solicitar la programación de la audiencia única.',
  'Dictamen fiscal': 'Si venció el plazo del dictamen, pedir que se remitan los autos o se prescinda de él.',
  Sentencia: 'Si venció el plazo para sentenciar, presentar pedido de sentencia.',
  Impugnación: 'Verificar concesión de la apelación; si demora, solicitar elevación de autos al superior.',
  'Segunda instancia': 'Revisar programación de la vista de la causa e informe oral.',
  Casación: 'Revisar en el CEJ el estado del recurso de casación.',
  Ejecución: 'Solicitar requerimiento de cumplimiento bajo apercibimiento.',
  'Ejecución forzada': 'Solicitar requerimiento de cumplimiento bajo apercibimiento.',
  'Mandato ejecutivo': 'Verificar notificación del mandato ejecutivo al demandado.',
  Contradicción: 'Verificar si se formuló contradicción y absolverla.',
  'Auto que resuelve la contradicción': 'Si demora, pedir que se resuelva la contradicción.',
  'Diligencias preliminares': 'Revisar avance de las diligencias con la fiscalía.',
  'Investigación preparatoria': 'Controlar el plazo de investigación preparatoria.',
  'Etapa intermedia': 'Preparar la absolución de la acusación.',
  'Juicio oral': 'Preparar la estrategia del juicio oral.',
  'En trámite': 'Revisar el CEJ y presentar escrito de impulso si no hay movimiento.',
}
