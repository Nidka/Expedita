/** Conversión entre camelCase (dominio) y snake_case (PostgreSQL). */

const EXCEPCIONES_A_DB: Record<string, string> = {
  expedienteId: 'expediente_id',
  notificacionId: 'notificacion_id',
  visitaId: 'visita_id',
  mensajeId: 'mensaje_id',
  impulsoMau: 'impulso_mau',
}

export function aSnake(k: string): string {
  return EXCEPCIONES_A_DB[k] ?? k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
}

export function aCamel(k: string): string {
  return k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Dominio → fila. Al insertar, `undefined` se omite (para que apliquen los valores por defecto);
 * al actualizar, una clave presente con `undefined` o `''` borra el valor (null).
 */
export function aFila(obj: Record<string, unknown>, modo: 'insertar' | 'actualizar' = 'insertar'): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined && modo === 'insertar') continue
    out[aSnake(k)] = v === '' || v === undefined ? null : v
  }
  return out
}

/** Fila → dominio. `null` se convierte en `undefined`; `hora` se recorta a HH:MM. */
export function deFila<T>(fila: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fila)) {
    if (v === null) continue
    const ck = aCamel(k)
    if (ck === 'hora' && typeof v === 'string') out[ck] = v.slice(0, 5)
    else if ((ck === 'montoPetitorio' || ck === 'montoSentenciado') && typeof v === 'string') out[ck] = Number(v)
    else out[ck] = v
  }
  return out as T
}
