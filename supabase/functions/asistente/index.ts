// Edge Function «asistente»: única puerta hacia la API de Claude.
// La clave ANTHROPIC_API_KEY vive solo aquí (secreto de Supabase), nunca en el navegador.
// Solo atiende a usuarios autenticados que pertenecen a un estudio.
import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

const MODELO = Deno.env.get('MODELO_IA') ?? 'claude-opus-5-5'
const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const REGLAS_COMUNES = `Trabajas para un estudio de abogados litigantes en Perú. Escribe en español jurídico peruano.
Nunca inventes números de resolución, jurisprudencia, fechas ni artículos; si no estás seguro, dilo.
Todo lo que produces es una propuesta: un abogado la revisará antes de usarla.`

type Peticion =
  | { tipo: 'analizar-notificacion'; texto: string; actos: { id: string; nombre: string }[] }
  | { tipo: 'sugerir-impulsos'; expedientes: unknown[] }
  | { tipo: 'redactar-escrito'; expediente: Record<string, unknown>; tipoEscrito: string; indicaciones: string }
  | {
      tipo: 'interpretar-mensajes'
      mensajes: { id: string; telefono: string; texto: string; fecha: string }[]
      expedientes: { numero: string; codigo?: string; cliente?: string }[]
      tiposAccion: string[]
    }

/** Llamada común: pensamiento adaptativo, respaldo automático si el modelo rechaza, y control de `refusal`. */
async function llamar(params: {
  system: string
  usuario: string
  esfuerzo: 'low' | 'medium' | 'high'
  maxTokens: number
  esquema?: Record<string, unknown>
}): Promise<string> {
  const respuesta = await anthropic.beta.messages.create({
    model: MODELO,
    max_tokens: params.maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    // deno-lint-ignore no-explicit-any
    ...({ fallbacks: 'default' } as any),
    system: params.system,
    output_config: {
      effort: params.esfuerzo,
      ...(params.esquema ? { format: { type: 'json_schema', schema: params.esquema } } : {}),
    },
    messages: [{ role: 'user', content: params.usuario }],
  })
  if (respuesta.stop_reason === 'refusal') throw new Error('El asistente no pudo procesar esta solicitud.')
  if (respuesta.stop_reason === 'max_tokens') throw new Error('La respuesta fue demasiado larga; intenta con menos datos.')
  return respuesta.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

const opcional = (tipo: string) => ({ type: [tipo, 'null'] })

async function atender(p: Peticion): Promise<unknown> {
  switch (p.tipo) {
    case 'analizar-notificacion': {
      const lista = p.actos.map((a) => `${a.id} = ${a.nombre}`).join('\n')
      const texto = await llamar({
        system: `${REGLAS_COMUNES}\nExtraes datos de notificaciones judiciales (avisos del SINOE o correos del juzgado).`,
        usuario: `Actos con plazo posibles (usa el id exacto o null si ninguno aplica):\n${lista}\n\nNotificación:\n"""\n${p.texto.slice(0, 12_000)}\n"""\n\nDevuelve: número de expediente en formato NNNNN-AAAA-I-DDDD-XX-YY-JJ, asunto breve, fecha de notificación (AAAA-MM-DD), el acto que corresponde cumplir, la fecha límite solo si la resolución fija un plazo propio distinto al legal, y un resumen de 1 a 3 oraciones de lo que ordena.`,
        esfuerzo: 'low',
        maxTokens: 4000,
        esquema: {
          type: 'object',
          additionalProperties: false,
          required: ['numero', 'asunto', 'recibido', 'actoId', 'plazoFijado', 'resumen'],
          properties: {
            numero: opcional('string'),
            asunto: opcional('string'),
            recibido: opcional('string'),
            actoId: opcional('string'),
            plazoFijado: opcional('string'),
            resumen: opcional('string'),
          },
        },
      })
      return JSON.parse(texto)
    }

    case 'sugerir-impulsos': {
      const texto = await llamar({
        system: `${REGLAS_COMUNES}\nEres un procurador senior. Priorizas qué impulso procesal conviene hacer en cada expediente.`,
        usuario: `Expedientes activos (JSON):\n${JSON.stringify(p.expedientes)}\n\nDevuelve una lista priorizada en texto plano (máximo 15 expedientes, los más urgentes primero). Para cada uno: etiqueta del expediente, acción concreta sugerida y por qué (plazo, días sin movimiento, etapa). Cita artículos solo si estás seguro.`,
        esfuerzo: 'medium',
        maxTokens: 8000,
      })
      return { texto }
    }

    case 'redactar-escrito': {
      const texto = await llamar({
        system: `${REGLAS_COMUNES}
Redactas escritos judiciales con el formato peruano:
encabezado (Expediente, Especialista, Escrito N.°, Cuaderno, Sumilla), «SEÑOR JUEZ DEL …», identificación del recurrente,
petitorio, fundamentos de hecho, fundamentos de derecho, «POR TANTO», otrosí si corresponde, lugar y fecha, firma con [Nombre del abogado] y [CAL N.°].
Pon entre [CORCHETES] cualquier dato que falte. Termina con la línea «— Borrador: revisar antes de presentar —».`,
        usuario: `Tipo de escrito: ${p.tipoEscrito}\nIndicaciones del abogado: ${p.indicaciones || '(ninguna)'}\nDatos del expediente (JSON):\n${JSON.stringify(p.expediente)}`,
        esfuerzo: 'high',
        maxTokens: 12000,
      })
      return { texto }
    }

    case 'interpretar-mensajes': {
      const texto = await llamar({
        system: `${REGLAS_COMUNES}\nConviertes mensajes de WhatsApp del equipo en registros de acciones de impulso procesal.`,
        usuario: `Tipos de acción permitidos: ${p.tiposAccion.join(' | ')}\nExpedientes del estudio: ${JSON.stringify(p.expedientes)}\nMensajes: ${JSON.stringify(p.mensajes)}\n\nPara cada mensaje identifica el expediente (por número, código interno o nombre del cliente), el tipo de acción (de la lista), un detalle redactado de forma formal, el número de cargo, la fecha de la acción (AAAA-MM-DD), la próxima acción y su fecha o la cantidad de días hábiles. Si algo es ambiguo, explícalo en «duda».`,
        esfuerzo: 'low',
        maxTokens: 8000,
        esquema: {
          type: 'object',
          additionalProperties: false,
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['mensajeId', 'telefono', 'numero', 'tipo', 'descripcion', 'cargo', 'fecha', 'proxima', 'proximaFecha', 'proximaDiasHabiles', 'duda'],
                properties: {
                  mensajeId: { type: 'string' },
                  telefono: { type: 'string' },
                  numero: opcional('string'),
                  tipo: opcional('string'),
                  descripcion: opcional('string'),
                  cargo: opcional('string'),
                  fecha: opcional('string'),
                  proxima: opcional('string'),
                  proximaFecha: opcional('string'),
                  proximaDiasHabiles: opcional('integer'),
                  duda: opcional('string'),
                },
              },
            },
          },
        },
      })
      return JSON.parse(texto).items
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  // Solo miembros de un estudio
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: usuario } = await sb.auth.getUser()
  if (!usuario.user) return json({ error: 'No autenticado' }, 401)
  const { count } = await sb.from('miembros').select('id', { count: 'exact', head: true }).eq('user_id', usuario.user.id)
  if (!count) return json({ error: 'No perteneces a ningún estudio' }, 403)

  try {
    const peticion = (await req.json()) as Peticion
    return json({ resultado: await atender(peticion) })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'El asistente está ocupado; intenta en un minuto.' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'La clave de la API de Claude no es válida.' }, 500)
    if (e instanceof Anthropic.APIError) return json({ error: `Error del asistente (${e.status}).` }, 502)
    return json({ error: e instanceof Error ? e.message : 'Error inesperado' }, 400)
  }
})
