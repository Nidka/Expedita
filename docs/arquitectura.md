# Arquitectura de Impulso Procesal

Decisión del 5 de noviembre de 2026. Reemplaza al prototipo en claude.ai (`prototipo/impulso-procesal.html`), que queda como referencia funcional.

## Objetivos
1. **Ahora:** el estudio (4 usuarios) la usa en producción, desplegada y **sin costo de hosting**.
2. **Después:** venderla a varios estudios (multiinquilino) sin rehacerla.

## Stack

| Capa | Tecnología | Plan gratuito | Por qué |
|---|---|---|---|
| Front-end | React + TypeScript + Vite (SPA), en español | — | Fácil de mantener y portar el prototipo. |
| Hosting | **Cloudflare Pages** | Ilimitado en ancho de banda; **permite uso comercial** | Vercel Hobby prohíbe el uso comercial. |
| Base de datos | **Supabase** (PostgreSQL) | 500 MB, 50,000 usuarios activos al mes | Relacional, tiempo real y permisos por fila (RLS). |
| Login | Supabase Auth (correo + contraseña o enlace mágico) | Incluido | Ya no hace falta cuenta de claude.ai. |
| Archivos (fase 3) | Supabase Storage | 1 GB | Carpeta digital por expediente. |
| Lógica de servidor | Supabase Edge Functions | 500,000 llamadas al mes | IA, webhooks de WhatsApp y Gmail, recordatorios. Aquí vive la clave de la API. |
| Tareas programadas | `pg_cron` en Supabase | Incluido | Recordatorio diario y alertas. |
| IA | API de Claude (Anthropic) | **De pago por uso** (se estima de 1 a 5 USD al mes para 4 usuarios) | Es lo único que no es gratis. Haiku para extraer datos y Sonnet para redactar. |
| Correo de avisos | Resend | 3,000 correos al mes | Recordatorio diario. |
| Gmail → SINOE | **Google Apps Script** en la cuenta del estudio | Gratis | Lee los avisos del SINOE y los envía al webhook. No guarda credenciales. Reemplaza a Make/n8n. |
| WhatsApp | WhatsApp Business Cloud API (Meta) → Edge Function | Gratis para responder dentro de 24 h | Webhook directo, sin Make ni Google Sheets. |
| Google Calendar | URL de suscripción iCal por usuario | Gratis | Los plazos aparecen solos en el calendario, sin OAuth. |
| Respaldos | GitHub Actions: `pg_dump` cada noche a un repositorio privado | Gratis | El plan gratuito de Supabase no incluye respaldos descargables. |
| Código | GitHub (repositorio privado) | Gratis | Despliegue automático a Cloudflare. |

### Limitaciones del plan gratuito
- Supabase **pausa el proyecto tras 7 días sin uso**. Con uso diario no pasa; el respaldo nocturno también lo mantiene activo.
- Si en el futuro se vende a varios estudios, conviene pasar a Supabase Pro (25 USD al mes) por los respaldos diarios y para evitar la pausa.

## Multiinquilino desde el día 1
- Tabla `organizaciones`; **todas** las tablas llevan `org_id`.
- RLS: cada usuario solo ve las filas de su organización (`miembros.org_id`).
- Roles en `miembros.rol`: `admin` o `abogado` (RF-38).
- Auditoría con un trigger genérico que escribe en `auditoria` (RF-39).
- Catálogos (vías, actos, plazos y feriados) globales, con posibilidad de sobrescribirlos por organización.

## Modelo de datos (resumen)
`organizaciones`, `miembros`, `clientes`, `expedientes`, `juzgados`, `acciones`, `notificaciones`, `audiencias`, `visitas`, `visita_items`, `dias_inhabiles`, `feriados`, `vias`, `etapas`, `actos_plazo`, `mensajes_whatsapp`, `documentos` (fase 3), `auditoria` y `config_org`.

## Principios que se mantienen del prototipo
- La IA solo propone y un humano confirma (RNF-15). Los plazos los calcula el código, no la IA.
- No se guardan credenciales del SINOE ni del Poder Judicial. No se automatizan captchas del CEJ.
- La Hoja 8 del Excel (credenciales) nunca se importa.

## Plan de trabajo
1. **Base:** repositorio, esquema SQL con RLS, login, motor de plazos con pruebas y carga de los Excel.
2. **Paridad con el prototipo:** expedientes, carpetas, acciones, bandeja, agenda y audiencias, visitas, CEJ y asistente IA.
3. **Despliegue:** Cloudflare Pages + Supabase, invitación a los 4 usuarios y respaldo nocturno.
4. **Conexiones (fase 2):** Gmail con Apps Script, WhatsApp, iCal y recordatorio diario.
5. **Documentos (fase 3)** y **gestión (fase 4)** según la prioridad del estudio.
