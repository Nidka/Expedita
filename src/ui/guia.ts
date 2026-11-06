import { useCallback, useEffect, useMemo, useState } from 'react'
import { pasosDeLaGuia, progreso, siguientePaso, type PasoId } from '@/domain/guia/primeros-pasos'
import { modoDemo } from '@/infrastructure/composicion'
import { useContenedor, useDatos } from './contexto'
import { CLAVE_DEFINIDA } from './paginas/Cuenta'

/**
 * Estado de la guía de primeros pasos. Lo que se detecta sale de los datos; lo que se marca
 * a mano se guarda en este navegador (es solo una ayuda visual, no un dato del estudio).
 */
const EVENTO = 'expedita:guia'
const claveMarcados = (org: string, usuario: string) => `expedita:guia:${org}:${usuario}`
const claveOculta = (org: string, usuario: string) => `expedita:guia-oculta:${org}:${usuario}`

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
function escribir(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, valor)
  } catch {
    /* sin almacenamiento: la guía funciona igual, sin recordar marcas */
  }
  window.dispatchEvent(new Event(EVENTO))
}

/** Marca un paso desde cualquier parte (p. ej. al copiar la dirección del calendario). */
export function marcarPaso(org: string, usuario: string, id: PasoId, hecho = true) {
  const k = claveMarcados(org, usuario)
  const s = new Set<string>(JSON.parse(leer(k) ?? '[]') as string[])
  if (hecho) s.add(id)
  else s.delete(id)
  escribir(k, JSON.stringify([...s]))
}

/** Abre el recorrido de bienvenida (lo escucha el Shell). */
export const abrirRecorrido = () => window.dispatchEvent(new Event('expedita:recorrido'))

export function useGuia() {
  const c = useContenedor()
  const d = useDatos()
  const { miembro } = d.sesion
  const esAdmin = miembro.rol === 'admin'
  const [version, setVersion] = useState(0)
  const [equipo, setEquipo] = useState({ miembros: 1, invitaciones: 0 })

  useEffect(() => {
    const f = () => setVersion((v) => v + 1)
    window.addEventListener(EVENTO, f)
    return () => window.removeEventListener(EVENTO, f)
  }, [])

  useEffect(() => {
    if (!esAdmin) return
    let vivo = true
    Promise.all([c.equipo.miembros(), c.equipo.invitaciones()])
      .then(([m, i]) => vivo && setEquipo({ miembros: m.length, invitaciones: i.length }))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [c, esAdmin])

  const marcados = useMemo(
    () => new Set<string>(JSON.parse(leer(claveMarcados(miembro.orgId, miembro.userId)) ?? '[]') as string[]),
    [miembro.orgId, miembro.userId, version], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const oculta = useMemo(() => leer(claveOculta(miembro.orgId, miembro.userId)) === '1', [miembro.orgId, miembro.userId, version]) // eslint-disable-line react-hooks/exhaustive-deps

  const pasos = pasosDeLaGuia({
    esAdmin,
    expedientes: d.expedientes.length,
    ...equipo,
    accionesPropias: d.acciones.filter((a) => a.creadoPor === miembro.userId || (modoDemo && a.origen === 'manual')).length,
    claveDefinida: modoDemo || leer(CLAVE_DEFINIDA) === '1',
    config: d.config,
    marcados,
  })

  const marcar = useCallback((id: PasoId, hecho = true) => marcarPaso(miembro.orgId, miembro.userId, id, hecho), [miembro.orgId, miembro.userId])
  const ocultar = useCallback((v = true) => escribir(claveOculta(miembro.orgId, miembro.userId), v ? '1' : null), [miembro.orgId, miembro.userId])

  return { pasos, ...progreso(pasos), siguiente: siguientePaso(pasos), marcar, oculta, ocultar, esAdmin }
}
