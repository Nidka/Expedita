# Despliegue de Expedita

Todo usa planes gratuitos, salvo el consumo de la IA (API de Claude).
Tiempo estimado: 45 a 60 minutos la primera vez.

| Pieza | Servicio | Costo |
|---|---|---|
| Página web | Cloudflare Pages | Gratis (permite uso comercial) |
| Base de datos, acceso y funciones | Supabase | Gratis (500 MB) |
| Asistente de IA | API de Claude (Anthropic) | Pago por uso, con límite de gasto |
| Respaldo nocturno | GitHub Actions | Gratis en repositorio privado (2,000 min/mes) |

---

## 1. GitHub (5 min)

1. En https://github.com/Nidka/Expedita → **Settings** → **General** → **Danger Zone** → **Change visibility** → **Make private**.
   Es obligatorio: los respaldos y el historial tendrán datos de clientes.

## 2. Supabase (15 min)

1. Entra a https://supabase.com con la cuenta de GitHub → **New project**.
   - Nombre: `expedita`
   - Región: **South America (São Paulo)**
   - Contraseña de la base de datos: genera una larga y **guárdala** (se usa para los respaldos).
2. Cuando termine de crearse, abre **SQL Editor** → **New query**, pega todo el contenido de
   `supabase/migrations/20261105000000_esquema_inicial.sql` y pulsa **Run**.
   Debe terminar sin errores (crea tablas, permisos por estudio, auditoría y feriados).
3. **Authentication → Sign In / Providers → Email**: deja activado *Email* y *Confirm email*.
4. **Authentication → URL Configuration**: en *Site URL* pon la dirección que te dé Cloudflare en el paso 4
   (por ejemplo `https://expedita.pages.dev`). Puedes volver a este paso al final.
5. **Project Settings → API**: copia
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public** → será `VITE_SUPABASE_ANON_KEY`
   (la *service_role* NO se usa en la página; no la compartas).

## 3. Clave de la IA (10 min)

1. Entra a https://console.anthropic.com → **Billing**: carga saldo (5 USD alcanzan para empezar)
   y en **Limits** pon un límite mensual (por ejemplo 10 USD).
2. **API Keys → Create key** → nombre `expedita`. Copia la clave (empieza con `sk-ant-`).
3. Publica la función del asistente (desde esta PC, en la carpeta del proyecto):
   ```bash
   npx supabase login
   npx supabase link --project-ref <ID del proyecto>   # el ID está en la URL del panel de Supabase
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy asistente
   ```
   Opcional: `npx supabase secrets set MODELO_IA=claude-haiku-5-5` para gastar menos (por defecto usa Claude Opus 5.5).

## 4. Cloudflare Pages (10 min)

1. Entra a https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → elige `Nidka/Expedita`.
2. Configuración de compilación:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Environment variables** (Production):
   - `VITE_SUPABASE_URL` = Project URL del paso 2
   - `VITE_SUPABASE_ANON_KEY` = anon public del paso 2
   - `NODE_VERSION` = `22`
4. **Save and Deploy**. Al terminar te da la dirección (`https://expedita.pages.dev` o similar).
   Vuelve al paso 2.4 y pon esa dirección como *Site URL*.
5. Cada `git push` a `main` vuelve a publicar la página automáticamente.

## 5. Primer ingreso y equipo (5 min)

1. Abre la dirección de Cloudflare → escribe tu correo → **Enviarme un enlace** → abre el correo.
2. Como eres la primera persona, la app te pide crear el estudio: serás **administradora**.
3. **Ajustes → Equipo → Invitar**: agrega a las otras 3 personas (correo, nombre y rol).
   Ellas entran con su correo y quedan dentro del estudio automáticamente.
4. **Ajustes → Importar**: sube los dos Excel (`CUADRO DE EXPEDIEN.xlsx` como principal y el ACTUALIZADO como segundo),
   hoja **CASOS LABORALES** → **Revisar antes de importar** → **Importar**.

## 6. Respaldo nocturno (5 min)

En GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `SUPABASE_DB_URL` | Supabase → **Connect** → **Session pooler** → URI, reemplazando `[YOUR-PASSWORD]` por la contraseña del paso 2.1 |
| `RESPALDO_CLAVE` | Una frase larga que solo conozca el estudio. **Guárdala fuera de GitHub**: sin ella no se puede abrir el respaldo |

Pruébalo: **Actions → Respaldo nocturno → Run workflow**. Debe terminar en verde y dejar un archivo `.dump.enc`.

Para restaurar un respaldo:
```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass pass:'<RESPALDO_CLAVE>' -in expedita-AAAA-MM-DD.dump.enc -out respaldo.dump
pg_restore --no-owner --dbname '<SUPABASE_DB_URL>' respaldo.dump
```

## Opcional

- **Dominio propio** (`expedita.pe`): se compra en punto.pe (~S/ 100 al año) y se conecta en Cloudflare Pages → Custom domains.
- **Correos en español**: Supabase → Authentication → Email Templates.
