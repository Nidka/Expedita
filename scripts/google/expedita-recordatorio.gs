/**
 * Expedita · Recordatorio diario (Google Apps Script)
 *
 * De lunes a viernes a las 8:00 (hora de Lima) envía al equipo un correo con lo vencido,
 * lo que vence en los próximos 7 días y las audiencias de los próximos 3 días.
 * Si no hay nada pendiente, no envía nada.
 *
 * Instalación (una sola vez, con el Gmail del estudio):
 *   1. En Expedita → Ajustes → Recordatorio pulsa «Copiar script» (ya viene con los datos del estudio).
 *   2. script.google.com → Nuevo proyecto → pega y guarda.
 *   3. Elige la función «activar», pulsa Ejecutar y autoriza. Listo: queda programado.
 *   Para probar en el momento: ejecuta «enviarAhora».
 */
const SUPABASE_URL = '__SUPABASE_URL__'
const CLAVE_PUBLICA = '__CLAVE_PUBLICA__'
const CLAVE_ESTUDIO = '__CLAVE_ESTUDIO__'
const APP_URL = '__APP_URL__'

function activar() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'recordatorioDiario') ScriptApp.deleteTrigger(t)
  })
  ScriptApp.newTrigger('recordatorioDiario').timeBased().everyDays(1).atHour(8).inTimezone('America/Lima').create()
  Logger.log('Recordatorio activado: lunes a viernes a las 8:00 (Lima).')
}

function desactivar() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'recordatorioDiario') ScriptApp.deleteTrigger(t)
  })
}

function recordatorioDiario() {
  const dia = Number(Utilities.formatDate(new Date(), 'America/Lima', 'u')) // 1 = lunes … 7 = domingo
  if (dia >= 6) return
  enviar(false)
}

function enviarAhora() {
  enviar(true)
}

function enviar(siempre) {
  const r = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/resumen_diario', {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: CLAVE_PUBLICA },
    payload: JSON.stringify({ p_token: CLAVE_ESTUDIO }),
    muteHttpExceptions: true,
  })
  if (r.getResponseCode() !== 200) throw new Error('Expedita respondió ' + r.getResponseCode() + ': ' + r.getContentText())
  const d = JSON.parse(r.getContentText())
  if (!d.correos || !d.correos.length) return
  if (!siempre && !d.plazos.length && !d.audiencias.length) return

  const hoy = d.fecha
  const vencidos = d.plazos.filter(function (p) { return p.vence && p.vence < hoy })
  const porVencer = d.plazos.filter(function (p) { return !p.vence || p.vence >= hoy })
  const fila = function (p) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#6b6660;white-space:nowrap">' + (p.vence || 'sin plazo') + '</td>' +
      '<td style="padding:6px 0"><b>' + esc(p.titulo) + '</b><br><span style="color:#6b6660">' + esc(p.tipo) + ' · ' + esc(p.expediente) + '</span></td></tr>'
  }
  const filaAud = function (a) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#6b6660;white-space:nowrap">' + a.fecha + (a.hora ? ' ' + a.hora : '') + '</td>' +
      '<td style="padding:6px 0"><b>Audiencia de ' + esc(String(a.tipo).toLowerCase()) + '</b><br><span style="color:#6b6660">' + esc(a.expediente) + ' · ' + esc(a.modalidad) + '</span></td></tr>'
  }
  const seccion = function (titulo, filas, color) {
    if (!filas.length) return ''
    return '<h3 style="margin:24px 0 8px;font-size:15px;color:' + color + '">' + titulo + ' · ' + filas.length + '</h3><table style="border-collapse:collapse;font-size:14px">' + filas.join('') + '</table>'
  }
  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1b19;max-width:560px">' +
    '<p style="font-size:13px;color:#6b6660;margin:0">' + esc(d.estudio) + ' · ' + hoy + '</p>' +
    '<h2 style="margin:4px 0 0;font-size:20px">Lo que toca hoy</h2>' +
    seccion('Vencidos', vencidos.map(fila), '#c4291c') +
    seccion('Próximos 7 días', porVencer.map(fila), '#8a4b00') +
    seccion('Audiencias', d.audiencias.map(filaAud), '#264769') +
    (!d.plazos.length && !d.audiencias.length ? '<p>Nada pendiente. Todo al día.</p>' : '') +
    '<p style="margin-top:28px"><a href="' + APP_URL + '" style="background:#8c1d2b;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir Expedita</a></p>' +
    '</div>'
  const asunto = 'Expedita · ' + (vencidos.length ? vencidos.length + ' vencido(s) · ' : '') + porVencer.length + ' por vencer · ' + d.audiencias.length + ' audiencia(s)'
  GmailApp.sendEmail(d.correos[0], asunto, 'Abre Expedita para ver el detalle: ' + APP_URL, {
    htmlBody: html,
    bcc: d.correos.slice(1).join(','),
    name: 'Expedita',
  })
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
