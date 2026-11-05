import type { FechaISO } from '@/domain/shared/fecha'
import { sumarDias } from '@/domain/shared/fecha'

export interface EventoAgenda {
  uid: string
  titulo: string
  descripcion?: string
  fecha: FechaISO
  /** HH:MM en hora de Lima; sin hora = evento de día completo */
  hora?: string
  lugar?: string
}

const escICS = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Pliega líneas a 75 octetos aprox. (RFC 5545). */
const plegar = (l: string) => l.match(/.{1,73}/g)?.join('\r\n ') ?? l

/** Lima es UTC−5 todo el año: se convierte a UTC para no depender de VTIMEZONE. */
function aUtc(fecha: FechaISO, hora: string): string {
  const [h, m] = hora.split(':').map(Number)
  const d = new Date(Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10), h + 5, m))
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
}

export function generarICS(eventos: EventoAgenda[], nombre = 'Expedita'): string {
  const ahora = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Expedita//Plazos//ES', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escICS(nombre)}`]
  for (const e of eventos) {
    lineas.push('BEGIN:VEVENT', `UID:${e.uid}@expedita`, `DTSTAMP:${ahora}`)
    if (e.hora) {
      const [h, m] = e.hora.split(':').map(Number)
      const fin = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      lineas.push(`DTSTART:${aUtc(e.fecha, e.hora)}`, `DTEND:${aUtc(e.fecha, fin)}`)
    } else {
      lineas.push(`DTSTART;VALUE=DATE:${e.fecha.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${sumarDias(e.fecha, 1).replace(/-/g, '')}`)
    }
    lineas.push(`SUMMARY:${escICS(e.titulo)}`)
    if (e.descripcion) lineas.push(`DESCRIPTION:${escICS(e.descripcion)}`)
    if (e.lugar) lineas.push(`LOCATION:${escICS(e.lugar)}`)
    for (const [disparo, texto] of [
      ['-P1D', 'Mañana'],
      ['-PT1H', 'En una hora'],
    ])
      lineas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escICS(`${texto}: ${e.titulo}`)}`, `TRIGGER:${disparo}`, 'END:VALARM')
    lineas.push('END:VEVENT')
  }
  lineas.push('END:VCALENDAR')
  return lineas.map(plegar).join('\r\n')
}

/** Enlace de plantilla de Google Calendar (RF-29). */
export function enlaceGoogleCalendar(e: EventoAgenda): string {
  const base = e.fecha.replace(/-/g, '')
  const fechas = e.hora
    ? (() => {
        const [h, m] = e.hora.split(':').map(Number)
        const ini = `${base}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`
        const fin = `${base}T${String(Math.min(h + 1, 23)).padStart(2, '0')}${String(m).padStart(2, '0')}00`
        return `${ini}/${fin}`
      })()
    : `${base}/${sumarDias(e.fecha, 1).replace(/-/g, '')}`
  const p = new URLSearchParams({ action: 'TEMPLATE', text: e.titulo, dates: fechas, ctz: 'America/Lima' })
  if (e.descripcion) p.set('details', e.descripcion)
  if (e.lugar) p.set('location', e.lugar)
  return `https://calendar.google.com/calendar/render?${p}`
}

/** CSV compatible con Excel (BOM UTF-8 y separador coma). */
export function generarCSV(filas: Record<string, unknown>[]): string {
  if (!filas.length) return ''
  const cols = Object.keys(filas[0])
  const celda = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '\uFEFF' + [cols.join(','), ...filas.map((f) => cols.map((c) => celda(f[c])).join(','))].join('\r\n')
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
