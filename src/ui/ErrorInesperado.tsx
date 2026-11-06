import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Michi } from './componentes/marca'

/**
 * Pantalla de último recurso si algo falla al dibujar la interfaz.
 * Dice qué pasó, que los datos están a salvo y cómo seguir; no muestra detalles técnicos.
 */
export class ErrorInesperado extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error inesperado en la interfaz', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const esCarga = /dynamically imported module|Failed to fetch|Loading chunk/i.test(this.state.error.message)
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-6 py-16 text-center">
        <div className="medida flex flex-col items-center">
          <Michi pose={esCarga ? 'pensando' : 'enojado'} className="mb-6 size-28" />
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
            {esCarga ? 'Hay una versión nueva de Expedita' : 'Algo salió mal en esta pantalla'}
          </h1>
          <p className="mt-3 text-[0.9375rem] text-muted-foreground">
            {esCarga
              ? 'Se publicó una actualización mientras tenías la app abierta. Recarga para usar la versión nueva.'
              : 'Tus datos están guardados. Recarga la página; si el problema se repite, avisa a quien administra el estudio indicando qué estabas haciendo.'}
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-8 h-11 rounded-xl bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground outline-none transition-colors duration-150 hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            Recargar la página
          </button>
        </div>
      </main>
    )
  }
}
