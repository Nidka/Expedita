import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellPlusIcon, CalendarPlusIcon, FolderPlusIcon, ListChecksIcon, PenLineIcon, QuestionIcon } from '@/ui/iconos'
import { ATAJOS_CREAR, Combinacion, Tecla } from '../atajos'
import { TEMAS } from '../ayuda/temas'
import { CommandDialog, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { useDatos } from '../contexto'
import { AYUDA, NAVEGACION } from '../layout/navegacion'

const ICONOS = { r: PenLineIcon, n: BellPlusIcon, e: FolderPlusIcon, a: CalendarPlusIcon } as const
import { Michi } from './marca'

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
          <CommandEmpty>
            <span className="flex flex-col items-center gap-2">
              <Michi pose="pensando" className="size-20" />
              No hay coincidencias.
            </span>
          </CommandEmpty>
          <CommandGroup heading="Crear">
            {ATAJOS_CREAR.map((x) => {
              const Icono = ICONOS[x.tecla]
              return (
                <CommandItem key={x.tecla} value={`crear nuevo ${x.texto}`} onSelect={() => ir(x.a)}>
                  <Icono aria-hidden /> {x.texto}
                  <CommandShortcut>
                    <Tecla>{x.tecla}</Tecla>
                  </CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ir a">
            {[...NAVEGACION.filter((n) => !n.soloAdmin || sesion.miembro.rol === 'admin'), AYUDA].map(({ a, texto, icono: Icono, tecla }) => (
              <CommandItem key={a} value={`ir ${texto}`} onSelect={() => ir(a)}>
                <Icono aria-hidden /> {texto}
                {tecla && (
                  <CommandShortcut>
                    <Combinacion teclas={['G', tecla]} separador="" />
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ayuda">
            <CommandItem value="primeros pasos guía configurar" onSelect={() => ir('/primeros-pasos')}>
              <ListChecksIcon aria-hidden /> Primeros pasos
            </CommandItem>
            {TEMAS.map((t) => (
              <CommandItem key={t.id} value={`ayuda ${t.titulo} ${t.resumen}`} onSelect={() => ir(`/ayuda#${t.id}`)}>
                <QuestionIcon aria-hidden /> {t.titulo}
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
