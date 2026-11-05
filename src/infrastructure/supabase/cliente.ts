import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

let cliente: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!supabaseConfigurado) throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local')
  cliente ??= createClient(url!, anonKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return cliente
}

export function lanzarSiError<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(traducirError(r.error.message))
  return r.data
}

function traducirError(msg: string): string {
  if (/duplicate key.*numero/i.test(msg)) return 'Ya existe un expediente con ese número.'
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/row-level security/i.test(msg)) return 'No tienes permiso para esta operación.'
  if (/JWT expired/i.test(msg)) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  return msg
}
