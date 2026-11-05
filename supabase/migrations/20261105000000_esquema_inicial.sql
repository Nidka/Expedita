-- Expedita · esquema inicial
-- Multiinquilino: toda fila de negocio lleva org_id y la protege RLS.

create extension if not exists pgcrypto;

-- ============ Organizaciones y miembros ============
create table organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  creado_en timestamptz not null default now()
);

create type rol_miembro as enum ('admin', 'abogado');

create table miembros (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  telefono text,
  rol rol_miembro not null default 'abogado',
  creado_en timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on miembros (user_id);

create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  email text not null,
  nombre text not null,
  rol rol_miembro not null default 'abogado',
  creado_en timestamptz not null default now(),
  unique (org_id, email)
);

-- Funciones de ayuda para RLS (security definer para evitar recursión)
create or replace function public.mis_orgs() returns setof uuid
language sql stable security definer set search_path = public as $$
  select org_id from miembros where user_id = auth.uid()
$$;

create or replace function public.es_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros where user_id = auth.uid() and org_id = p_org and rol = 'admin')
$$;

-- Crea un estudio y deja al usuario actual como administrador
create or replace function public.crear_organizacion(p_nombre text, p_nombre_usuario text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from miembros where user_id = auth.uid()) then
    raise exception 'El usuario ya pertenece a un estudio';
  end if;
  insert into organizaciones (nombre) values (p_nombre) returning id into v_org;
  insert into miembros (org_id, user_id, nombre, email, rol)
    values (v_org, auth.uid(), p_nombre_usuario, (select email from auth.users where id = auth.uid()), 'admin');
  insert into config_org (org_id) values (v_org);
  return v_org;
end $$;

-- Al iniciar sesión por primera vez, acepta las invitaciones pendientes de su correo
create or replace function public.aceptar_invitaciones()
returns int language plpgsql security definer set search_path = public as $$
declare v_email text; v_n int;
begin
  select lower(email) into v_email from auth.users where id = auth.uid();
  insert into miembros (org_id, user_id, nombre, email, rol)
    select i.org_id, auth.uid(), i.nombre, v_email, i.rol from invitaciones i
    where lower(i.email) = v_email
    on conflict (org_id, user_id) do nothing;
  get diagnostics v_n = row_count;
  delete from invitaciones where lower(email) = v_email;
  return v_n;
end $$;

-- ============ Catálogos globales ============
create table feriados (
  fecha date primary key,
  nombre text not null
);

-- ============ Configuración por estudio ============
create table config_org (
  org_id uuid primary key references organizaciones(id) on delete cascade,
  dias_sin_movimiento int not null default 30 check (dias_sin_movimiento between 1 and 365),
  dias_inhabiles date[] not null default '{}',
  equipo_whatsapp jsonb not null default '[]',
  -- secreto para webhooks (Gmail/Apps Script, iCal). Solo lo leen administradores.
  token_integracion text not null default encode(gen_random_bytes(24), 'hex')
);

-- ============ Negocio ============
create table expedientes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  numero text not null,
  codigo text,
  via text not null default 'otra',
  etapa text,
  estado text not null default 'activo' check (estado in ('activo', 'archivado')),
  distrito text,
  organo text,
  especialista text,
  demandante text,
  demandado text,
  cliente text,
  materia text,
  monto_petitorio numeric(14,2),
  monto_sentenciado numeric(14,2),
  estado_proceso text,
  ultimo_acto text,
  fecha_ultimo_acto date,
  actuacion_pendiente text,
  falta_realizar boolean,
  impulso_mau text,
  documentacion text,
  ultima_revision_cej date,
  notas text,
  origen text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (org_id, numero)
);
create index on expedientes (org_id, estado);

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  expediente_id uuid references expedientes(id) on delete set null,
  numero text not null,
  asunto text not null,
  recibido date not null,
  casilla boolean not null default true,
  acto_id text,
  efecto date,
  vencimiento date,
  resumen text,
  texto text check (char_length(texto) <= 20000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'atendida')),
  atendida_en date,
  origen text not null default 'manual',
  -- id del correo de Gmail para no duplicar
  origen_ref text,
  creado_en timestamptz not null default now(),
  unique (org_id, origen_ref)
);
create index on notificaciones (org_id, estado);

create table mensajes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  wa_id text not null,
  telefono text not null,
  nombre text,
  texto text not null,
  recibido_en timestamptz not null,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'importado', 'descartado')),
  creado_en timestamptz not null default now(),
  unique (org_id, wa_id)
);

create table visitas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  fecha date not null,
  responsable text not null,
  juzgado_clave text not null,
  juzgado text not null,
  distrito text,
  sede text,
  estado text not null default 'programada' check (estado in ('programada', 'realizada')),
  creado_en timestamptz not null default now()
);

create table acciones (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  expediente_id uuid not null references expedientes(id) on delete cascade,
  fecha date not null,
  tipo text not null,
  descripcion text not null,
  responsable text not null,
  cargo text,
  proxima text,
  proxima_fecha date,
  proxima_cumplida boolean not null default false,
  etapa_nueva text,
  notificacion_id uuid references notificaciones(id) on delete set null,
  visita_id uuid references visitas(id) on delete set null,
  mensaje_id uuid references mensajes_whatsapp(id) on delete set null,
  origen text not null default 'manual',
  creado_por uuid references auth.users(id) default auth.uid(),
  creado_en timestamptz not null default now()
);
create index on acciones (org_id, expediente_id, fecha desc);
create index on acciones (org_id, proxima_fecha) where proxima_cumplida = false;

create table visita_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  visita_id uuid not null references visitas(id) on delete cascade,
  expediente_id uuid not null references expedientes(id) on delete cascade,
  motivo text not null default '',
  resultado text,
  hecho boolean not null default false,
  accion_id uuid references acciones(id) on delete set null
);
create index on visita_items (visita_id);

create table audiencias (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  expediente_id uuid not null references expedientes(id) on delete cascade,
  tipo text not null,
  fecha date not null,
  hora time,
  modalidad text not null default 'virtual' check (modalidad in ('virtual', 'presencial', 'mixta')),
  estado text not null default 'programada' check (estado in ('programada', 'realizada', 'reprogramada', 'frustrada')),
  lugar text,
  responsable text,
  resolucion text,
  notas text,
  creado_en timestamptz not null default now()
);
create index on audiencias (org_id, fecha);

create table juzgados (
  org_id uuid not null references organizaciones(id) on delete cascade,
  clave text not null,
  nombre text not null,
  sede text,
  primary key (org_id, clave)
);

-- ============ Auditoría (RF-39) ============
create table auditoria (
  id bigint generated always as identity primary key,
  org_id uuid not null,
  tabla text not null,
  fila_id text not null,
  operacion text not null,
  usuario uuid default auth.uid(),
  antes jsonb,
  despues jsonb,
  en timestamptz not null default now()
);
create index on auditoria (org_id, tabla, fila_id);

create or replace function public.registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (org_id, tabla, fila_id, operacion, antes, despues)
  values (
    coalesce(new.org_id, old.org_id),
    tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id', to_jsonb(new)->>'clave', ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create or replace function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado_en = now(); return new; end $$;

create trigger expedientes_actualizado before update on expedientes
  for each row execute function tocar_actualizado();

do $$
declare t text;
begin
  foreach t in array array['expedientes','acciones','notificaciones','audiencias','visitas','visita_items','juzgados','config_org','miembros']
  loop
    execute format('create trigger %I_auditoria after insert or update or delete on %I for each row execute function registrar_auditoria()', t, t);
  end loop;
end $$;

-- ============ RLS ============
alter table organizaciones enable row level security;
alter table miembros enable row level security;
alter table invitaciones enable row level security;
alter table feriados enable row level security;
alter table config_org enable row level security;
alter table auditoria enable row level security;

create policy org_ver on organizaciones for select using (id in (select mis_orgs()));
create policy org_editar on organizaciones for update using (es_admin(id));

create policy miembros_ver on miembros for select using (org_id in (select mis_orgs()));
create policy miembros_admin on miembros for all using (es_admin(org_id)) with check (es_admin(org_id));

create policy invit_admin on invitaciones for all using (es_admin(org_id)) with check (es_admin(org_id));

create policy feriados_ver on feriados for select using (auth.role() = 'authenticated');

create policy config_ver on config_org for select using (org_id in (select mis_orgs()));
create policy config_admin on config_org for update using (es_admin(org_id)) with check (es_admin(org_id));

create policy auditoria_admin on auditoria for select using (es_admin(org_id));

-- Tablas de trabajo: cualquier miembro del estudio lee y escribe
do $$
declare t text;
begin
  foreach t in array array['expedientes','notificaciones','mensajes_whatsapp','visitas','acciones','visita_items','audiencias','juzgados']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all using (org_id in (select mis_orgs())) with check (org_id in (select mis_orgs()))', t || '_miembros', t);
  end loop;
end $$;

-- El token de integración solo lo ven administradores
revoke all on config_org from anon, authenticated;
grant select (org_id, dias_sin_movimiento, dias_inhabiles, equipo_whatsapp) on config_org to authenticated;
grant update (dias_sin_movimiento, dias_inhabiles, equipo_whatsapp) on config_org to authenticated;
create or replace function public.token_integracion(p_org uuid) returns text
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin(p_org) then raise exception 'Solo administradores'; end if;
  return (select token_integracion from config_org where org_id = p_org);
end $$;

-- ============ Tiempo real ============
alter publication supabase_realtime add table expedientes, acciones, notificaciones, audiencias, visitas, visita_items, juzgados, mensajes_whatsapp;

-- ============ Feriados nacionales 2026–2027 ============
insert into feriados (fecha, nombre) values
  ('2026-01-01','Año Nuevo'),('2026-04-02','Jueves Santo'),('2026-04-03','Viernes Santo'),('2026-05-01','Día del Trabajo'),
  ('2026-06-07','Batalla de Arica y Día de la Bandera'),('2026-06-29','San Pedro y San Pablo'),('2026-07-23','Día de la Fuerza Aérea del Perú'),
  ('2026-07-28','Fiestas Patrias'),('2026-07-29','Fiestas Patrias'),('2026-08-06','Batalla de Junín'),('2026-08-30','Santa Rosa de Lima'),
  ('2026-10-08','Combate de Angamos'),('2026-11-01','Todos los Santos'),('2026-12-08','Inmaculada Concepción'),
  ('2026-12-09','Batalla de Ayacucho'),('2026-12-25','Navidad'),
  ('2027-01-01','Año Nuevo'),('2027-03-25','Jueves Santo'),('2027-03-26','Viernes Santo'),('2027-05-01','Día del Trabajo'),
  ('2027-06-07','Batalla de Arica y Día de la Bandera'),('2027-06-29','San Pedro y San Pablo'),('2027-07-23','Día de la Fuerza Aérea del Perú'),
  ('2027-07-28','Fiestas Patrias'),('2027-07-29','Fiestas Patrias'),('2027-08-06','Batalla de Junín'),('2027-08-30','Santa Rosa de Lima'),
  ('2027-10-08','Combate de Angamos'),('2027-11-01','Todos los Santos'),('2027-12-08','Inmaculada Concepción'),
  ('2027-12-09','Batalla de Ayacucho'),('2027-12-25','Navidad');

-- ============ Permisos explícitos de la API ============
-- El proyecto se crea con «Automatically expose new tables» desactivado: nada es visible
-- por defecto. Aquí se otorga solo lo necesario; RLS decide además qué filas ve cada usuario.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  organizaciones, miembros, invitaciones,
  expedientes, notificaciones, mensajes_whatsapp, visitas, acciones, visita_items, audiencias, juzgados
  to authenticated;
grant select on feriados, auditoria to authenticated;
-- config_org ya tiene permisos por columna (sin token_integracion) más arriba.

revoke execute on all functions in schema public from public, anon;
grant execute on function public.mis_orgs(), public.es_admin(uuid), public.crear_organizacion(text, text),
  public.aceptar_invitaciones(), public.token_integracion(uuid) to authenticated;
