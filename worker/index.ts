/**
 * Worker de Cloudflare: publica la aplicación (recursos estáticos) y una sola ruta dinámica,
 * el calendario por suscripción (RF-30): /calendario/<clave>.ics
 *
 * Google Calendar y Outlook necesitan texto iCalendar; Supabase responde JSON, así que aquí
 * se convierte. No guarda nada: cada consulta se lee en vivo con la clave del estudio.
 */
import { generarICS, type EventoAgenda } from '../src/application/exportar'

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

const RUTA = /^\/calendario\/([a-f0-9]{40,})\.ics$/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const m = RUTA.exec(url.pathname)
    if (!m) return env.ASSETS.fetch(request)
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Método no permitido', { status: 405 })

    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/calendario_eventos`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: m[1] }),
    })
    if (!r.ok) return new Response('Calendario no encontrado', { status: 404, headers: { 'Cache-Control': 'no-store' } })

    const datos = (await r.json()) as { estudio: string; eventos: EventoAgenda[] }
    const eventos = datos.eventos.map((e) => ({ ...e, hora: e.hora ?? undefined, lugar: e.lugar ?? undefined, descripcion: e.descripcion || undefined }))
    return new Response(generarICS(eventos, `${datos.estudio} · Expedita`), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="expedita.ics"',
        // Los calendarios la vuelven a pedir cada pocas horas; no se guarda en cachés intermedias
        'Cache-Control': 'private, max-age=900',
        'X-Robots-Tag': 'noindex',
      },
    })
  },
}
