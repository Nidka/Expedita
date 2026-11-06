import type { AuthPort, Sesion } from '@/application/ports'
import type { Miembro } from '@/domain/entidades'
import { lanzarSiError, supabase } from './cliente'
import { deFila } from './mapeo'

export class AuthSupabase implements AuthPort {
  private sesion: Sesion | null = null

  /** Organización activa; la usan los repositorios. */
  orgId = (): string => {
    if (!this.sesion) throw new Error('No hay sesión activa.')
    return this.sesion.miembro.orgId
  }

  async sesionActual(): Promise<Sesion | null> {
    const { data } = await supabase().auth.getUser()
    if (!data.user) return (this.sesion = null)
    await supabase().rpc('aceptar_invitaciones')
    const r = await supabase()
      .from('miembros')
      .select('*, organizaciones(nombre)')
      .eq('user_id', data.user.id)
      .order('creado_en')
      .limit(1)
      .maybeSingle()
    const fila = lanzarSiError(r) as (Record<string, unknown> & { organizaciones: { nombre: string } }) | null
    if (!fila) return (this.sesion = null)
    const { organizaciones, ...m } = fila
    this.sesion = { miembro: deFila<Miembro>(m), orgNombre: organizaciones.nombre }
    return this.sesion
  }

  /** Usuario autenticado que aún no pertenece a ningún estudio. */
  async usuarioSinEstudio(): Promise<{ email: string } | null> {
    const { data } = await supabase().auth.getUser()
    return data.user && !this.sesion ? { email: data.user.email ?? '' } : null
  }

  async crearEstudio(nombreEstudio: string, nombreUsuario: string): Promise<void> {
    lanzarSiError(await supabase().rpc('crear_organizacion', { p_nombre: nombreEstudio, p_nombre_usuario: nombreUsuario }))
  }

  async iniciarSesion(email: string, password: string): Promise<void> {
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : error.message)
  }

  async enviarEnlaceMagico(email: string): Promise<void> {
    const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) throw new Error(error.message)
  }

  async registrar(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    if (error) {
      if (/already registered|already exists/i.test(error.message)) throw new Error('Ese correo ya tiene cuenta. Entra con tu contraseña o pide un enlace por correo.')
      if (/weak|short|least/i.test(error.message)) throw new Error('La contraseña es muy débil: usa al menos 10 caracteres.')
      throw new Error(error.message)
    }
    // Con la confirmación por correo activada, Supabase no devuelve sesión (y oculta si el correo ya existía).
    if (!data.session) {
      if (data.user && data.user.identities?.length === 0) throw new Error('Ese correo ya tiene cuenta. Entra con tu contraseña o pide un enlace por correo.')
      return false
    }
    return true
  }

  async cambiarClave(nueva: string): Promise<void> {
    const { error } = await supabase().auth.updateUser({ password: nueva })
    if (error) throw new Error(/weak|short|least/i.test(error.message) ? 'La contraseña es muy débil: usa al menos 10 caracteres.' : /same/i.test(error.message) ? 'La nueva contraseña debe ser distinta de la actual.' : error.message)
  }

  async cerrarSesion(): Promise<void> {
    await supabase().auth.signOut()
    this.sesion = null
  }

  alCambiar(cb: () => void): () => void {
    const { data } = supabase().auth.onAuthStateChange(() => cb())
    return () => data.subscription.unsubscribe()
  }
}
