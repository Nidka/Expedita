import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellPlusIcon, FolderPlusIcon, PenLineIcon } from 'lucide-react'
import { CommandDialog, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { useDatos } from '../contexto'
import { NAVEGACION } from '../layout/navegacion'

/** Búsqueda global (Ctrl/⌘ + K): expedientes, secciones y acciones rápidas. */
export function BuscadorGlobal({ abierto, setAbierto }: { abierto: boolean; setAbierto: (v: boolean) => void }) {
  const { expedientes, sesion } = useDatos()
  const navegar = useNavigate()

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAbierto(!abierto)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abierto, setAbierto])

  const ir = (a: string) => {
    setAbierto(false)
    navegar(a)
  }

  return (
    <CommandDialog open={abierto} onOpenChange={setAbierto} title="Buscar" description="Busca expedientes, secciones o acciones">
      <Command
        filter={(valor, busqueda) => (valor.toLowerCase().includes(busqueda.toLowerCase().trim()) ? 1 : 0)}
      >
        <CommandInput placeholder="Código, número, cliente o sección…" />
        <CommandList className="max-h-[60dvh]">
          <CommandEmpty>Michi no encontró nada con ese texto.</CommandEmpty>
          <CommandGroup heading="Acciones">
            <CommandItem value="registrar acción impulso" onSelect={() => ir('/registrar')}>
              <PenLineIcon aria-hidden /> Registrar acción
            </CommandItem>
            <CommandItem value="nueva notificación sinoe correo" onSelect={() => ir('/bandeja?nueva=1')}>
              <BellPlusIcon aria-hidden /> Nueva notificación
            </CommandItem>
            <CommandItem value="agregar expediente nuevo" onSelect={() => ir('/expedientes?nuevo=1')}>
              <FolderPlusIcon aria-hidden /> Agregar expediente
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ir a">
            {NAVEGACION.filter((n) => !n.soloAdmin || sesion.miembro.rol === 'admin').map(({ a, texto, icono: Icono }) => (
              <CommandItem key={a} value={`ir ${texto}`} onSelect={() => ir(a)}>
                <Icono aria-hidden /> {texto}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Expedientes">
            {expedientes.map((e) => (
              <CommandItem
                key={e.id}
                value={[e.codigo, e.numero, e.cliente, e.demandante, e.demandado, e.organo].filter(Boolean).join(' ')}
                onSelect={() => ir(`/expedientes/${e.id}`)}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    {e.codigo && <strong className="mr-1.5">{e.codigo}</strong>}
                    <span className="font-mono text-[0.85em]">{e.numero}</span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{e.cliente ?? e.demandante ?? '—'}</span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
