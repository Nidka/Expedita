-- Escritos en Word con membrete (RF-36) y biblioteca de modelos y jurisprudencia (RF-37).
alter table config_org
  add column if not exists membrete_titulo text,
  add column if not exists membrete_detalle text,
  add column if not exists ciudad text not null default 'Lima';
grant select (membrete_titulo, membrete_detalle, ciudad) on config_org to authenticated;
grant update (membrete_titulo, membrete_detalle, ciudad) on config_org to authenticated;

create table if not exists modelos_escrito (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 200),
  categoria text not null default 'escrito' check (categoria in ('escrito', 'jurisprudencia')),
  contenido text not null default '' check (char_length(contenido) <= 100000),
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists modelos_escrito_org on modelos_escrito (org_id, titulo);

alter table modelos_escrito enable row level security;
create policy modelos_escrito_miembros on modelos_escrito for all
  using (org_id in (select mis_orgs())) with check (org_id in (select mis_orgs()));
grant select, insert, update, delete on modelos_escrito to authenticated;
create trigger modelos_escrito_actualizado before update on modelos_escrito
  for each row execute function tocar_actualizado();
create trigger modelos_escrito_auditoria after insert or update or delete on modelos_escrito
  for each row execute function registrar_auditoria();
