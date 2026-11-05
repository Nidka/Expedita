import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import type { Sesion } from '@/application/ports'
import { Skeleton } from '@/components/ui/skeleton'
import { ProveedorDatos, useContenedor } from './contexto'
import { Shell } from './layout/Shell'
import { CrearEstudio, IniciarSesion } from './paginas/Acceso'
import { Inicio } from './paginas/Inicio'
import { EstadoVacio } from './componentes/base'

const Expedientes = lazy(() => import('./paginas/Expedientes').then((m) => ({ default: m.Expedientes })))
const FichaExpediente = lazy(() => import('./paginas/FichaExpediente').then((m) => ({ default: m.FichaExpediente })))
const RegistrarAccion = lazy(() => import('./paginas/RegistrarAccion').then((m) => ({ default: m.RegistrarAccion })))
const Bandeja = lazy(() => import('./paginas/Bandeja').then((m) => ({ default: m.Bandeja })))
const Agenda = lazy(() => import('./paginas/Agenda').then((m) => ({ default: m.Agenda })))
const Visitas = lazy(() => import('./paginas/Visitas').then((m) => ({ default: m.Visitas })))
const Asistente = lazy(() => import('./paginas/Asistente').then((m) => ({ default: m.Asistente })))
const Ajustes = lazy(() => import('./paginas/Ajustes').then((m) => ({ default: m.Ajustes })))

function Cargando() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  )
}

type Estado = { tipo: 'cargando' } | { tipo: 'anonimo' } | { tipo: 'sin-estudio'; email: string } | { tipo: 'dentro'; sesion: Sesion }

export function App() {
  const c = useContenedor()
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })

  const comprobar = useCallback(async () => {
    try {
      const sesion = await c.auth.sesionActual()
      if (sesion) return setEstado({ tipo: 'dentro', sesion })
      const sinEstudio = await c.auth.usuarioSinEstudio()
      setEstado(sinEstudio ? { tipo: 'sin-estudio', email: sinEstudio.email } : { tipo: 'anonimo' })
    } catch {
      setEstado({ tipo: 'anonimo' })
    }
  }, [c])

  useEffect(() => {
    void comprobar()
    return c.auth.alCambiar(() => void comprobar())
  }, [c, comprobar])

  if (estado.tipo === 'cargando')
    return (
      <div className="p-8">
        <Cargando />
      </div>
    )
  if (estado.tipo === 'anonimo') return <IniciarSesion alEntrar={comprobar} />
  if (estado.tipo === 'sin-estudio') return <CrearEstudio email={estado.email} alCrear={comprobar} />

  return (
    <ProveedorDatos sesion={estado.sesion}>
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Inicio />} />
              <Route path="bandeja" element={<Bandeja />} />
              <Route path="registrar" element={<RegistrarAccion />} />
              <Route path="expedientes" element={<Expedientes />} />
              <Route path="expedientes/:id" element={<FichaExpediente />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="visitas" element={<Visitas />} />
              <Route path="asistente" element={<Asistente />} />
              <Route path="ajustes" element={<Ajustes />} />
              <Route path="*" element={<EstadoVacio titulo="Página no encontrada" />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ProveedorDatos>
  )
}
