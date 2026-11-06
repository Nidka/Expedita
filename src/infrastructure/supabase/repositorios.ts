import type { Accion, ConfigOrg, Expediente, Id, Juzgado, Miembro, Notificacion, Rol, Visita, VisitaItem, Audiencia } from '@/domain/entidades'
import type { Feriado } from '@/domain/plazos/feriados'
import type {
  AccionRepo,
  AudienciaRepo,
  CanalCambios,
  Cambios,
  ConfigRepo,
  AuditoriaRepo,
  EquipoRepo,
  Invitacion,
  RegistroAuditoria,
  ExpedienteRepo,
  JuzgadoRepo,
  NotificacionRepo,
  Nuevo,
  Repositorio,
  VisitaRepo,
} from '@/application/ports'
import { lanzarSiError, supabase } from './cliente'
import { aFila, deFila } from './mapeo'

/** Devuelve el id de la organización activa (lo fija el adaptador de auth). */
export type OrgActual = () => Id

const LOTE = 500

class RepoSupabase<T extends { id: Id }> implements Repositorio<T> {
  constructor(
    protected readonly tabla: string,
    protected readonly org: OrgActual,
    private readonly orden: { columna: string; asc: boolean } = { columna: 'creado_en', asc: false },
  ) {}

  protected q() {
    return supabase().from(this.tabla)
  }

  async listar(): Promise<T[]> {
    const filas: Record<string, unknown>[] = []
    // PostgREST limita a 1000 filas por consulta: se pagina.
    for (let desde = 0; ; desde += 1000) {
      const r = await this.q()
        .select('*')
        .eq('org_id', this.org())
        .order(this.orden.columna, { ascending: this.orden.asc })
        .range(desde, desde + 999)
      const lote = lanzarSiError(r) as Record<string, unknown>[]
      filas.push(...lote)
      if (lote.length < 1000) break
    }
    return filas.map((f) => deFila<T>(f))
  }

  async obtener(id: Id): Promise<T | null> {
    const r = await this.q().select('*').eq('id', id).maybeSingle()
    const f = lanzarSiError(r)
    return f ? deFila<T>(f) : null
  }

  async crear(datos: Nuevo<T>): Promise<T> {
    const r = await this.q()
      .insert({ ...aFila(datos as Record<string, unknown>), org_id: this.org() })
      .select()
      .single()
    return deFila<T>(lanzarSiError(r))
  }

  async crearVarios(datos: Nuevo<T>[]): Promise<T[]> {
    const out: T[] = []
    for (let i = 0; i < datos.length; i += LOTE) {
      const filas = datos.slice(i, i + LOTE).map((d) => ({ ...aFila(d as Record<string, unknown>), org_id: this.org() }))
      const r = await this.q().insert(filas).select()
      out.push(...(lanzarSiError(r) as Record<string, unknown>[]).map((f) => deFila<T>(f)))
    }
    return out
  }

  async actualizar(id: Id, cambios: Cambios<T>): Promise<T> {
    const r = await this.q()
      .update(aFila(cambios as Record<string, unknown>, 'actualizar'))
      .eq('id', id)
      .select()
      .single()
    return deFila<T>(lanzarSiError(r))
  }

  async eliminar(id: Id): Promise<void> {
    lanzarSiError(await this.q().delete().eq('id', id))
  }
}

export class ExpedientesSupabase extends RepoSupabase<Expediente> implements ExpedienteRepo {
  constructor(org: OrgActual) {
    super('expedientes', org, { columna: 'codigo', asc: true })
  }
  async porNumero(numero: string): Promise<Expediente | null> {
    const r = await this.q().select('*').eq('org_id', this.org()).eq('numero', numero).maybeSingle()
    const f = lanzarSiError(r)
    return f ? deFila<Expediente>(f) : null
  }
}

export class AccionesSupabase extends RepoSupabase<Accion> implements AccionRepo {
  constructor(org: OrgActual) {
    super('acciones', org, { columna: 'fecha', asc: false })
  }
  async cumplirProximasAbiertas(expedienteId: Id, excepto?: Id): Promise<void> {
    let q = this.q()
      .update({ proxima_cumplida: true })
      .eq('expediente_id', expedienteId)
      .eq('proxima_cumplida', false)
      .not('proxima_fecha', 'is', null)
    if (excepto) q = q.neq('id', excepto)
    lanzarSiError(await q)
  }
}

export const notificacionesSupabase = (org: OrgActual): NotificacionRepo =>
  new RepoSupabase<Notificacion>('notificaciones', org, { columna: 'recibido', asc: false })

export const audienciasSupabase = (org: OrgActual): AudienciaRepo =>
  new RepoSupabase<Audiencia>('audiencias', org, { columna: 'fecha', asc: true })

type VisitaSinItems = Omit<Visita, 'items'> & { items?: VisitaItem[] }

export class VisitasSupabase extends RepoSupabase<VisitaSinItems> implements VisitaRepo {
  constructor(org: OrgActual) {
    super('visitas', org, { columna: 'fecha', asc: false })
  }
  async listarConItems(): Promise<Visita[]> {
    const r = await this.q().select('*, visita_items(*)').eq('org_id', this.org()).order('fecha', { ascending: false })
    return (lanzarSiError(r) as Record<string, unknown>[]).map((f) => {
      const { visita_items, ...resto } = f as { visita_items: Record<string, unknown>[] }
      return { ...deFila<Omit<Visita, 'items'>>(resto), items: visita_items.map((i) => deFila<VisitaItem>(i)) }
    })
  }
  async crearConItems(visita: Nuevo<Omit<Visita, 'items'>>, items: Omit<VisitaItem, 'id' | 'visitaId'>[]): Promise<Visita> {
    const v = await this.crear(visita)
    const r = await supabase()
      .from('visita_items')
      .insert(items.map((i) => ({ ...aFila(i as Record<string, unknown>), visita_id: v.id, org_id: this.org() })))
      .select()
    const creados = (lanzarSiError(r) as Record<string, unknown>[]).map((f) => deFila<VisitaItem>(f))
    return { ...(v as Omit<Visita, 'items'>), items: creados }
  }
  async actualizarItem(id: Id, cambios: Partial<Omit<VisitaItem, 'id' | 'visitaId'>>): Promise<void> {
    lanzarSiError(await supabase().from('visita_items').update(aFila(cambios as Record<string, unknown>, 'actualizar')).eq('id', id))
  }
}

export class JuzgadosSupabase implements JuzgadoRepo {
  constructor(private readonly org: OrgActual) {}
  async listar(): Promise<Juzgado[]> {
    const r = await supabase().from('juzgados').select('*').eq('org_id', this.org())
    return (lanzarSiError(r) as Record<string, unknown>[]).map((f) => deFila<Juzgado>(f))
  }
  async guardarSede(clave: string, nombre: string, sede: string): Promise<void> {
    lanzarSiError(
      await supabase().from('juzgados').upsert({ org_id: this.org(), clave, nombre, sede: sede.trim() || null }),
    )
  }
}

export class ConfigSupabase implements ConfigRepo {
  constructor(private readonly org: OrgActual) {}
  async obtener(): Promise<ConfigOrg> {
    const r = await supabase()
      .from('config_org')
      .select('org_id, dias_sin_movimiento, dias_inhabiles, equipo_whatsapp')
      .eq('org_id', this.org())
      .single()
    return deFila<ConfigOrg>(lanzarSiError(r) as Record<string, unknown>)
  }
  async guardar(cambios: Partial<Omit<ConfigOrg, 'orgId'>>): Promise<ConfigOrg> {
    lanzarSiError(await supabase().from('config_org').update(aFila(cambios, 'actualizar')).eq('org_id', this.org()))
    return this.obtener()
  }
  async feriados(): Promise<Feriado[]> {
    const r = await supabase().from('feriados').select('fecha, nombre').order('fecha')
    return lanzarSiError(r) as Feriado[]
  }
}

export class CambiosSupabase implements CanalCambios {
  constructor(private readonly org: OrgActual) {}
  suscribir(tablas: string[], alCambiar: (tabla: string) => void): () => void {
    const canal = supabase().channel(`org-${this.org()}-${Math.random().toString(36).slice(2)}`)
    for (const t of tablas) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: t, filter: `org_id=eq.${this.org()}` }, () =>
        alCambiar(t),
      )
    }
    canal.subscribe()
    return () => void supabase().removeChannel(canal)
  }
}

export class EquipoSupabase implements EquipoRepo {
  constructor(private readonly org: OrgActual) {}
  async miembros(): Promise<Miembro[]> {
    const r = await supabase().from('miembros').select('*').eq('org_id', this.org()).order('nombre')
    return (lanzarSiError(r) as Record<string, unknown>[]).map((f) => deFila<Miembro>(f))
  }
  async invitaciones(): Promise<Invitacion[]> {
    const r = await supabase().from('invitaciones').select('id, email, nombre, rol').eq('org_id', this.org()).order('creado_en')
    return lanzarSiError(r) as Invitacion[]
  }
  async invitar(d: Omit<Invitacion, 'id'>): Promise<void> {
    lanzarSiError(
      await supabase()
        .from('invitaciones')
        .upsert({ org_id: this.org(), email: d.email.trim().toLowerCase(), nombre: d.nombre.trim(), rol: d.rol }, { onConflict: 'org_id,email' }),
    )
  }
  async quitarInvitacion(id: Id): Promise<void> {
    lanzarSiError(await supabase().from('invitaciones').delete().eq('id', id))
  }
  async cambiarRol(miembroId: Id, rol: Rol): Promise<void> {
    lanzarSiError(await supabase().from('miembros').update({ rol }).eq('id', miembroId))
  }
  async quitarMiembro(miembroId: Id): Promise<void> {
    lanzarSiError(await supabase().from('miembros').delete().eq('id', miembroId))
  }
}

export class AuditoriaSupabase implements AuditoriaRepo {
  constructor(private readonly org: OrgActual) {}
  async recientes(limite: number): Promise<RegistroAuditoria[]> {
    const r = await supabase()
      .from('auditoria')
      .select('id, tabla, fila_id, operacion, usuario, antes, despues, en')
      .eq('org_id', this.org())
      .order('en', { ascending: false })
      .limit(limite)
    return (lanzarSiError(r) as Record<string, unknown>[]).map((f) => deFila<RegistroAuditoria>(f))
  }
}
