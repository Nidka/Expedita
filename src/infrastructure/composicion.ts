import type { Contenedor } from '@/application/contenedor'
import { hoyEnLima } from '@/domain/shared/fecha'
import { hojasDelLibro, leerHojaCuadro } from './excel/leer-cuadro'
import { AsistenteClaude } from './ia/asistente-claude'
import { contenedorMemoria } from './memoria/repositorios'
import { sembrarDemo } from './memoria/semilla-demo'
import { AuthSupabase } from './supabase/auth'
import { supabaseConfigurado } from './supabase/cliente'
import {
  AccionesSupabase,
  CambiosSupabase,
  ConfigSupabase,
  EquipoSupabase,
  ExpedientesSupabase,
  JuzgadosSupabase,
  VisitasSupabase,
  audienciasSupabase,
  notificacionesSupabase,
} from './supabase/repositorios'

export const modoDemo = !supabaseConfigurado

/** Raíz de composición: el único lugar que conoce los adaptadores concretos. */
export async function crearContenedor(): Promise<Contenedor> {
  const excel = { leerHoja: leerHojaCuadro, hojas: hojasDelLibro }
  if (modoDemo) {
    // Si cambia la semilla de demostración, se descarta la copia guardada en el navegador.
    const VERSION_SEMILLA = '2'
    try {
      if (localStorage.getItem('expedita-demo:version') !== VERSION_SEMILLA) {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('expedita-demo:'))
          .forEach((k) => localStorage.removeItem(k))
        localStorage.setItem('expedita-demo:version', VERSION_SEMILLA)
      }
    } catch {
      /* sin almacenamiento: la demo vive solo en memoria */
    }
    const c = { ...contenedorMemoria({ persistir: true }), excel }
    await sembrarDemo(c)
    return c
  }
  const auth = new AuthSupabase()
  const org = auth.orgId
  return {
    auth,
    expedientes: new ExpedientesSupabase(org),
    acciones: new AccionesSupabase(org),
    notificaciones: notificacionesSupabase(org),
    audiencias: audienciasSupabase(org),
    visitas: new VisitasSupabase(org),
    juzgados: new JuzgadosSupabase(org),
    config: new ConfigSupabase(org),
    equipo: new EquipoSupabase(org),
    cambios: new CambiosSupabase(org),
    ia: new AsistenteClaude(),
    excel,
    reloj: { hoy: () => hoyEnLima() },
  }
}
