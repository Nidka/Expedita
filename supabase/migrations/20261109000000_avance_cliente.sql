-- Página de avance para el cliente (RF-40): enlaces privados, revocables y con vencimiento.
create table if not exists enlaces_cliente (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizaciones(id) on delete cascade,
  expediente_id uuid not null references expedientes(id) on delete cascade,
  token text not null unique check (char_length(token) >= 40),
  expira date,
  revocado boolean not null default false,
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);
create index if not exists enlaces_cliente_expediente on enlaces_cliente (expediente_id);

alter table enlaces_cliente enable row level security;
create policy enlaces_cliente_miembros on enlaces_cliente for all
  using (org_id in (select mis_orgs())) with check (org_id in (select mis_orgs()));
grant select, insert, update, delete on enlaces_cliente to authenticated;
create trigger enlaces_cliente_auditoria after insert or update or delete on enlaces_cliente
  for each row execute function registrar_auditoria();

-- Lo que ve el cliente: solo datos generales, tipos y fechas de movimientos (sin el detalle interno) y audiencias próximas.
create or replace function public.avance_cliente(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_enlace enlaces_cliente;
  v_exp expedientes;
  v_estudio text;
  v_hoy date := (now() at time zone 'America/Lima')::date;
begin
  select * into v_enlace from enlaces_cliente
  where token = p_token and not revocado and (expira is null or expira >= v_hoy);
  if not found then
    raise exception 'Enlace no válido o vencido';
  end if;
  select * into v_exp from expedientes where id = v_enlace.expediente_id;
  select nombre into v_estudio from organizaciones where id = v_enlace.org_id;

  return jsonb_build_object(
    'estudio', v_estudio,
    'numero', v_exp.numero,
    'cliente', coalesce(v_exp.cliente, v_exp.demandante),
    'materia', v_exp.materia,
    'via', v_exp.via,
    'etapa', v_exp.etapa,
    'estado', v_exp.estado,
    'organo', v_exp.organo,
    'expira', v_enlace.expira,
    'movimientos', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', a.fecha, 'tipo', a.tipo) order by a.fecha desc, a.creado_en desc)
      from (select fecha, tipo, creado_en from acciones where expediente_id = v_exp.id order by fecha desc, creado_en desc limit 12) a
    ), '[]'::jsonb),
    'audiencias', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', au.fecha, 'hora', to_char(au.hora, 'HH24:MI'), 'tipo', au.tipo, 'modalidad', au.modalidad) order by au.fecha, au.hora)
      from audiencias au
      where au.expediente_id = v_exp.id and au.estado = 'programada' and au.fecha >= v_hoy
    ), '[]'::jsonb)
  );
end $$;

revoke execute on function public.avance_cliente(text) from public;
grant execute on function public.avance_cliente(text) to anon, authenticated;
