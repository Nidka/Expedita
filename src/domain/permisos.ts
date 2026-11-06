import type { Miembro } from './entidades'

/**
 * Permisos por rol (RF-38). La base de datos los hace cumplir; aquí solo se usan para no
 * mostrar botones que fallarían.
 * - Administrador: todo.
 * - Abogado: lee, crea y edita; elimina solo las acciones y modelos que él creó.
 */
export function puedeEliminar(m: Pick<Miembro, 'rol' | 'userId'>, registro: { creadoPor?: string }): boolean {
  return m.rol === 'admin' || (Boolean(registro.creadoPor) && registro.creadoPor === m.userId)
}

export const esAdmin = (m: Pick<Miembro, 'rol'>) => m.rol === 'admin'
