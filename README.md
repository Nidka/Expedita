# Expedita

Asistente de procuración judicial para estudios de abogados en Perú (Poder Judicial): plazos en días hábiles, notificaciones del SINOE, agenda de audiencias, visitas a juzgados y un asistente con IA. La mascota es Michi, un gato procurador.

## Ejecutar en local

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas del dominio (cómputo de plazos, números de expediente)
```

Sin variables de entorno, la app corre en **modo demo** con datos ficticios guardados en el navegador.
Para conectar Supabase, copia `.env.example` como `.env.local` y completa la URL y la anon key.

## Arquitectura (hexagonal)

```
src/
  domain/          Reglas puras: plazos, calendario hábil, número de expediente, alertas, visitas
  application/     Casos de uso y puertos (interfaces)
  infrastructure/  Adaptadores: Supabase, Claude (Edge Function), Excel, memoria (demo/pruebas)
  ui/              React: páginas, layout y componentes
supabase/
  migrations/      Esquema PostgreSQL multiestudio con RLS y auditoría
  functions/       Edge Function «asistente» (única que conoce la clave de Claude)
```

Más detalle en [docs/arquitectura.md](docs/arquitectura.md).

## Principios

- La IA propone; un abogado confirma. Los plazos los calcula el código, no la IA.
- No se guardan credenciales del SINOE ni del Poder Judicial, y no se automatizan captchas.
- Los datos de cada estudio están aislados por fila (RLS).
