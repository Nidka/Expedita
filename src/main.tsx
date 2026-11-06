import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { crearContenedor } from '@/infrastructure/composicion'
import { ProveedorContenedor } from '@/ui/contexto'
import { App } from '@/ui/App'
import { ErrorInesperado } from '@/ui/ErrorInesperado'

const raiz = createRoot(document.getElementById('root')!)

crearContenedor().then((contenedor) =>
  raiz.render(
    <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <ProveedorContenedor contenedor={contenedor}>
            <ErrorInesperado>
              <App />
            </ErrorInesperado>
          </ProveedorContenedor>
          <Toaster richColors closeButton position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>,
  ),
)
