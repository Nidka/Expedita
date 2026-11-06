import type {
  AccionRepo,
  AsistenteIA,
  AuthPort,
  CanalCambios,
  Cambios,
  ConfigRepo,
  EquipoRepo,
  EnlacesClienteRepo,
  ExpedienteRepo,
  Invitacion,
  JuzgadoRepo,
  Nuevo,
  Repositorio,
  Sesion,
  VisitaRepo,
} from '@/application/ports'
import type { Contenedor } from '@/application/contenedor'
import type { Accion, Audiencia, ConfigOrg, Expediente, Id, Juzgado, Miembro, Notificacion, Visita, VisitaItem } from '@/domain/entidades'
import { construirAvance, enlaceVigente, generarToken, type AvanceCliente, type EnlaceCliente } from '@/domain/avance/avance'
import type { ModeloEscrito } from '@/domain/escritos/plantilla'
import { generadorWord } from '../word/docx'
import { FERIADOS_NACIONALES } from '@/domain/plazos/feriados'
import { hoyEnLima, type FechaISO } from '@/domain/shared/fecha'
import { driveDemo } from './drive-demo'
import { gmailDemo } from './gmail-demo'

/**
 * Adaptadores en memoria (con copia en localStorage) para el modo demo y las pruebas.
 * Implementan los mismos puertos que Supabase: la UI no nota la diferencia.
 */

const ORG = 'org-demo'
const uid = () => crypto.randomUUID()
const ahora = () => new Date().toISOString()

class Bus {
  private oyentes = new Set<(tabla: string) => void>()
  emitir(tabla: string) {
    for (const o of this.oyentes) o(tabla)
  }
  escuchar(cb: (tabla: string) => void) {
    this.oyentes.add(cb)
    return () => void this.oyentes.delete(cb)
  }
}

class Almacen {
  constructor(
    private readonly clave: string | null,
    readonly bus: Bus,
  ) {}
  leer<T>(tabla: string, inicial: T[]): T[] {
    if (!this.clave) return inicial
    try {
      const v = localStorage.getItem(`${this.clave}:${tabla}`)
      return v ? (JSON.parse(v) as T[]) : inicial
    } catch {
      return inicial
    }
  }
  escribir<T>(tabla: string, filas: T[]) {
    if (this.clave) {
      try {
        localStorage.setItem(`${this.clave}:${tabla}`, JSON.stringify(filas))
      } catch {
        /* cuota llena o navegación privada: seguimos en memoria */
      }
    }
    this.bus.emitir(tabla)
  }
}

class RepoMemoria<T extends { id: Id }> implements Repositorio<T> {
  protected filas: T[]
  constructor(
    protected readonly tabla: string,
    protected readonly almacen: Almacen,
    inicial: T[] = [],
  ) {
    this.filas = almacen.leer(tabla, inicial)
  }
  protected guardar() {
    this.almacen.escribir(this.tabla, this.filas)
  }
  async listar() {
    return structuredClone(this.filas)
  }
  async obtener(id: Id) {
    return structuredClone(this.filas.find((f) => f.id === id) ?? null)
  }
  async crear(datos: Nuevo<T>): Promise<T> {
    const fila = { ...datos, id: uid(), orgId: ORG, creadoEn: ahora(), actualizadoEn: ahora() } as unknown as T
    this.filas.push(fila)
    this.guardar()
    return structuredClone(fila)
  }
  async crearVarios(datos: Nuevo<T>[]) {
    const out: T[] = []
    for (const d of datos) {
      const fila = { ...d, id: uid(), orgId: ORG, creadoEn: ahora(), actualizadoEn: ahora() } as unknown as T
      this.filas.push(fila)
      out.push(fila)
    }
    this.guardar()
    return structuredClone(out)
  }
  async actualizar(id: Id, cambios: Cambios<T>): Promise<T> {
    const i = this.filas.findIndex((f) => f.id === id)
    if (i < 0) throw new Error('Registro no encontrado.')
    this.filas[i] = { ...this.filas[i], ...cambios, actualizadoEn: ahora() }
    this.guardar()
    return structuredClone(this.filas[i])
  }
  async eliminar(id: Id) {
    this.filas = this.filas.filter((f) => f.id !== id)
    this.guardar()
  }
}

class ExpedientesMemoria extends RepoMemoria<Expediente> implements ExpedienteRepo {
  async crear(datos: Nuevo<Expediente>) {
    if (this.filas.some((e) => e.numero === datos.numero)) throw new Error('Ya existe un expediente con ese número.')
    return super.crear(datos)
  }
  async porNumero(numero: string) {
    return structuredClone(this.filas.find((e) => e.numero === numero) ?? null)
  }
}

class AccionesMemoria extends RepoMemoria<Accion> implements AccionRepo {
  async cumplirProximasAbiertas(expedienteId: Id, excepto?: Id) {
    for (const a of this.filas)
      if (a.expedienteId === expedienteId && a.id !== excepto && a.proximaFecha && !a.proximaCumplida) a.proximaCumplida = true
    this.guardar()
  }
}

type VisitaFila = Omit<Visita, 'items'> & { items?: VisitaItem[] }

class VisitasMemoria extends RepoMemoria<VisitaFila> implements VisitaRepo {
  async listarConItems(): Promise<Visita[]> {
    return structuredClone(this.filas.map((v) => ({ ...v, items: v.items ?? [] })))
  }
  async crearConItems(visita: Nuevo<Omit<Visita, 'items'>>, items: Omit<VisitaItem, 'id' | 'visitaId'>[]) {
    const id = uid()
    const v: Visita = {
      ...visita,
      id,
      orgId: ORG,
      creadoEn: ahora(),
      items: items.map((i) => ({ ...i, id: uid(), visitaId: id })),
    }
    this.filas.push(v)
    this.guardar()
    return structuredClone(v)
  }
  async actualizarItem(id: Id, cambios: Partial<Omit<VisitaItem, 'id' | 'visitaId'>>) {
    for (const v of this.filas) {
      const it = v.items?.find((i) => i.id === id)
      if (it) Object.assign(it, cambios)
    }
    this.guardar()
  }
}

class JuzgadosMemoria implements JuzgadoRepo {
  private filas: Juzgado[]
  constructor(private readonly almacen: Almacen) {
    this.filas = almacen.leer('juzgados', [])
  }
  async listar() {
    return structuredClone(this.filas)
  }
  async guardarSede(clave: string, nombre: string, sede: string) {
    const j = this.filas.find((f) => f.clave === clave)
    if (j) j.sede = sede
    else this.filas.push({ clave, nombre, sede, orgId: ORG })
    this.almacen.escribir('juzgados', this.filas)
  }
}

class ConfigMemoria implements ConfigRepo {
  private cfg: ConfigOrg
  constructor(private readonly almacen: Almacen) {
    this.cfg = almacen.leer<ConfigOrg>('config', [{ orgId: ORG, diasSinMovimiento: 30, diasInhabiles: [], equipoWhatsapp: [], driveUrl: 'demo', driveToken: 'demo', gmailUrl: 'demo', gmailToken: 'demo', membreteTitulo: 'Estudio de demostración', membreteDetalle: 'Av. Ejemplo 123, Lima · (01) 555-0000 · contacto@estudio.pe', ciudad: 'Lima' }])[0]
  }
  async obtener() {
    return structuredClone(this.cfg)
  }
  async guardar(c: Partial<Omit<ConfigOrg, 'orgId'>>) {
    this.cfg = { ...this.cfg, ...c }
    this.almacen.escribir('config', [this.cfg])
    return structuredClone(this.cfg)
  }
  async datosIntegracion() {
    return { supabaseUrl: 'https://demo.supabase.co', clavePublica: 'demo', claveEstudio: 'demo' }
  }
  async feriados() {
    return [...FERIADOS_NACIONALES]
  }
}

class EquipoMemoria implements EquipoRepo {
  private invs: Invitacion[] = []
  async miembros(): Promise<Miembro[]> {
    return [(await new AuthDemo().sesionActual()).miembro]
  }
  async invitaciones() {
    return structuredClone(this.invs)
  }
  async invitar(d: Omit<Invitacion, 'id'>) {
    this.invs.push({ ...d, id: uid() })
  }
  async quitarInvitacion(id: Id) {
    this.invs = this.invs.filter((i) => i.id !== id)
  }
  async cambiarRol() {}
  async quitarMiembro() {}
}

class AuthDemo implements AuthPort {
  async sesionActual(): Promise<Sesion> {
    return {
      orgNombre: 'Estudio de demostración',
      miembro: { id: 'm1', userId: 'u1', orgId: ORG, nombre: 'Usuario demo', email: 'demo@expedita.pe', rol: 'admin' },
    }
  }
  async iniciarSesion() {}
  async enviarEnlaceMagico() {}
  async cerrarSesion() {}
  alCambiar() {
    return () => {}
  }
  async usuarioSinEstudio() {
    return null
  }
  async crearEstudio() {}
  async cambiarClave() {}
  async recuperarClave() {}
  async registrar() {
    return true
  }
}

class IADemo implements AsistenteIA {
  private falla(): never {
    throw new Error('El asistente de IA se activa al conectar Supabase y la clave de Claude (modo demo).')
  }
  async analizarNotificacion(): Promise<never> {
    this.falla()
  }
  async analizarResolucion(): Promise<never> {
    this.falla()
  }
  async sugerirImpulsos(): Promise<never> {
    this.falla()
  }
  async redactarEscrito(): Promise<never> {
    this.falla()
  }
  async interpretarMensajes(): Promise<never> {
    this.falla()
  }
}

/** Contenedor completo en memoria. `persistir` = guardar en localStorage (modo demo). */
class EnlacesMemoria implements EnlacesClienteRepo {
  private filas: EnlaceCliente[]
  constructor(
    private readonly almacen: Almacen,
    private readonly c: () => Contenedor,
  ) {
    this.filas = almacen.leer<EnlaceCliente>('enlaces', [])
  }
  private guardar() {
    this.almacen.escribir('enlaces', this.filas)
  }
  async delExpediente(expedienteId: Id) {
    return this.filas.filter((e) => e.expedienteId === expedienteId).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  }
  async crear(expedienteId: Id, expira?: FechaISO) {
    const e: EnlaceCliente = { id: uid(), expedienteId, token: generarToken(), expira, revocado: false, creadoEn: ahora() }
    this.filas.push(e)
    this.guardar()
    return e
  }
  async revocar(id: Id) {
    this.filas = this.filas.map((e) => (e.id === id ? { ...e, revocado: true } : e))
    this.guardar()
  }
  async avance(token: string): Promise<AvanceCliente> {
    const c = this.c()
    const hoy = c.reloj.hoy()
    const e = this.filas.find((x) => x.token === token)
    const exp = e && enlaceVigente(e, hoy) ? await c.expedientes.obtener(e.expedienteId) : null
    if (!e || !exp) throw new Error('Enlace no válido o vencido')
    const [acciones, audiencias, sesion] = await Promise.all([c.acciones.listar(), c.audiencias.listar(), c.auth.sesionActual()])
    return construirAvance(sesion?.orgNombre ?? 'Estudio', exp, acciones, audiencias, hoy, e.expira)
  }
}

export function contenedorMemoria(opciones: { persistir?: boolean; semilla?: (c: Contenedor) => Promise<void> } = {}): Contenedor {
  const bus = new Bus()
  const almacen = new Almacen(opciones.persistir ? 'expedita-demo' : null, bus)
  const c: Contenedor = {
    auth: new AuthDemo(),
    expedientes: new ExpedientesMemoria('expedientes', almacen),
    acciones: new AccionesMemoria('acciones', almacen),
    notificaciones: new RepoMemoria<Notificacion>('notificaciones', almacen),
    audiencias: new RepoMemoria<Audiencia>('audiencias', almacen),
    visitas: new VisitasMemoria('visitas', almacen),
    juzgados: new JuzgadosMemoria(almacen),
    config: new ConfigMemoria(almacen),
    equipo: new EquipoMemoria(),
    enlaces: new EnlacesMemoria(almacen, () => c),
    modelos: new RepoMemoria<ModeloEscrito>('modelos', almacen),
    word: generadorWord,
    auditoria: { recientes: async () => [] },
    cambios: { suscribir: (_t, cb) => bus.escuchar(cb) } satisfies CanalCambios,
    ia: new IADemo(),
    excel: {
      leerHoja: async () => {
        throw new Error('Lector de Excel no disponible en pruebas.')
      },
      hojas: async () => [],
    },
    drive: driveDemo,
    gmail: gmailDemo,
    reloj: { hoy: () => hoyEnLima() },
  }
  return c
}
