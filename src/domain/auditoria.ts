/** Traduce los registros técnicos de auditoría a frases que entiende el estudio. */

export interface CambioAuditado {
  tabla: string
  operacion: 'INSERT' | 'UPDATE' | 'DELETE'
  antes?: Record<string, unknown>
  despues?: Record<string, unknown>
}

const ENTIDAD: Record<string, string> = {
  expedientes: 'el expediente',
  acciones: 'una acción',
  notificaciones: 'una notificación',
  audiencias: 'una audiencia',
  visitas: 'una visita',
  visita_items: 'un expediente de visita',
  juzgados: 'la sede de un juzgado',
  config_org: 'los ajustes de plazos',
  miembros: 'un miembro del equipo',
}

const CAMPO: Record<string, string> = {
  etapa: 'etapa',
  estado: 'estado',
  materia: 'materia',
  cliente: 'cliente',
  codigo: 'código',
  notas: 'notas',
  via: 'vía',
  organo: 'juzgado',
  especialista: 'especialista',
  descripcion: 'detalle',
  fecha: 'fecha',
  tipo: 'tipo',
  responsable: 'responsable',
  cargo: 'cargo',
  proxima: 'próxima acción',
  proxima_fecha: 'fecha límite',
  proxima_cumplida: 'cumplimiento',
  vencimiento: 'vencimiento',
  atendida_en: 'atención',
  hora: 'hora',
  lugar: 'lugar',
  modalidad: 'modalidad',
  rol: 'rol',
  dias_inhabiles: 'días inhábiles',
  dias_sin_movimiento: 'umbral sin movimiento',
  sede: 'sede',
  resultado: 'resultado',
  hecho: 'visitado',
  actuacion_pendiente: 'actuación pendiente',
  ultima_revision_cej: 'revisión del CEJ',
}

/** Campos que cambian solos y no aportan al historial */
const IGNORADOS = new Set(['actualizado_en', 'creado_en'])

export function camposCambiados(antes: Record<string, unknown> = {}, despues: Record<string, unknown> = {}): string[] {
  const claves = new Set([...Object.keys(antes), ...Object.keys(despues)])
  return [...claves].filter((k) => !IGNORADOS.has(k) && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
}

/** Identificación corta del registro afectado, si se puede (p. ej. «LA-04» o el número del expediente). */
export function referencia(c: CambioAuditado): string | undefined {
  const fila = c.despues ?? c.antes ?? {}
  const v = fila.codigo ?? fila.numero ?? fila.asunto ?? fila.tipo ?? fila.nombre ?? fila.juzgado
  return typeof v === 'string' && v ? v : undefined
}

export function describirCambio(c: CambioAuditado): string {
  const entidad = ENTIDAD[c.tabla] ?? c.tabla
  const ref = referencia(c)
  const sujeto = ref ? `${entidad} ${ref}` : entidad
  if (c.operacion === 'INSERT') return `Creó ${sujeto}`
  if (c.operacion === 'DELETE') return `Eliminó ${sujeto}`
  const campos = camposCambiados(c.antes, c.despues).map((k) => CAMPO[k] ?? k.replace(/_/g, ' '))
  return campos.length ? `Editó ${sujeto}: ${campos.join(', ')}` : `Editó ${sujeto}`
}
