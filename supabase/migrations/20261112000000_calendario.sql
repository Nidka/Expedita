-- Calendario por suscripción (RF-30): Google Calendar, Outlook o el celular leen una dirección .ics
-- con los plazos, audiencias y próximas acciones. La clave va en la dirección; un administrador
-- puede cambiarla y la dirección anterior deja de funcionar.
alter table config_org
  add column if not exists token_calendario text not null
  default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
grant select (token_calendario) on config_org to authenticated;
grant update (token_calendario) on config_org to authenticated;

create or replace function public.calendario_eventos(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_org uuid;
  v_hoy date := (now() at time zone 'America/Lima')::date;
begin
  if p_token is null or char_length(p_token) < 40 then
    raise exception 'No autorizado';
  end if;
  select org_id into v_org from config_org where token_calendario = p_token;
  if v_org is null then
    raise exception 'No autorizado';
  end if;

  return jsonb_build_object(
    'estudio', (select nombre from organizaciones where id = v_org),
    'eventos', coalesce((
      select jsonb_agg(ev order by ev->>'fecha')
      from (
        -- Plazos de notificaciones pendientes
        select jsonb_build_object(
          'uid', 'n-' || n.id,
          'fecha', n.vencimiento,
          'titulo', 'Vence: ' || n.asunto || coalesce(' · ' || coalesce(e.codigo, e.numero), ''),
          'descripcion', concat_ws(E'\n', 'Expediente ' || coalesce(e.numero, n.numero), 'Cliente: ' || coalesce(e.cliente, e.demandante), n.resumen)
        ) as ev
        from notificaciones n left join expedientes e on e.id = n.expediente_id
        where n.org_id = v_org and n.estado = 'pendiente' and n.vencimiento >= v_hoy - 30
        union all
        -- Audiencias programadas
        select jsonb_build_object(
          'uid', 'a-' || a.id,
          'fecha', a.fecha,
          'hora', to_char(a.hora, 'HH24:MI'),
          'titulo', 'Audiencia ' || lower(a.tipo) || ' · ' || coalesce(e.codigo, e.numero),
          'descripcion', concat_ws(E'\n', 'Expediente ' || e.numero, 'Cliente: ' || coalesce(e.cliente, e.demandante), 'Modalidad: ' || a.modalidad, 'Responsable: ' || a.responsable, a.notas),
          'lugar', a.lugar
        )
        from audiencias a join expedientes e on e.id = a.expediente_id
        where a.org_id = v_org and a.estado = 'programada' and a.fecha >= v_hoy - 30
        union all
        -- Próximas acciones con fecha límite
        select jsonb_build_object(
          'uid', 'p-' || ac.id,
          'fecha', ac.proxima_fecha,
          'titulo', ac.proxima || ' · ' || coalesce(e.codigo, e.numero),
          'descripcion', concat_ws(E'\n', 'Expediente ' || e.numero, 'Responsable: ' || ac.responsable)
        )
        from acciones ac join expedientes e on e.id = ac.expediente_id
        where ac.org_id = v_org and not ac.proxima_cumplida and ac.proxima_fecha is not null
          and ac.proxima is not null and ac.proxima_fecha >= v_hoy - 30
      ) x
    ), '[]'::jsonb)
  );
end $$;

revoke execute on function public.calendario_eventos(text) from public;
grant execute on function public.calendario_eventos(text) to anon, authenticated;
