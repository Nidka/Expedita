-- Recordatorio diario (RF-42): resumen de lo urgente para el correo de las 8:00.
-- Lo llama el script de Google del estudio con la clave de integración (64 caracteres, solo la ve el administrador).
create or replace function public.resumen_diario(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_org uuid;
  v_nombre text;
  v_hoy date := (now() at time zone 'America/Lima')::date;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'No autorizado';
  end if;
  select c.org_id, o.nombre into v_org, v_nombre
  from config_org c join organizaciones o on o.id = c.org_id
  where c.token_integracion = p_token;
  if v_org is null then
    raise exception 'No autorizado';
  end if;

  return jsonb_build_object(
    'estudio', v_nombre,
    'fecha', v_hoy,
    'plazos', coalesce((
      select jsonb_agg(p order by (p->>'vence') nulls first)
      from (
        select jsonb_build_object('tipo', 'Notificación', 'titulo', n.asunto,
                                  'expediente', coalesce(e.codigo || ' · ', '') || n.numero, 'vence', n.vencimiento) as p
        from notificaciones n left join expedientes e on e.id = n.expediente_id
        where n.org_id = v_org and n.estado = 'pendiente' and (n.vencimiento is null or n.vencimiento <= v_hoy + 7)
        union all
        select jsonb_build_object('tipo', 'Próxima acción', 'titulo', a.proxima,
                                  'expediente', coalesce(e.codigo || ' · ', '') || e.numero, 'vence', a.proxima_fecha)
        from acciones a join expedientes e on e.id = a.expediente_id
        where a.org_id = v_org and not a.proxima_cumplida and a.proxima is not null
          and a.proxima_fecha is not null and a.proxima_fecha <= v_hoy + 7
      ) s
    ), '[]'::jsonb),
    'audiencias', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', au.tipo, 'fecha', au.fecha, 'hora', to_char(au.hora, 'HH24:MI'),
                                          'modalidad', au.modalidad, 'expediente', coalesce(e.codigo || ' · ', '') || e.numero)
                       order by au.fecha, au.hora)
      from audiencias au join expedientes e on e.id = au.expediente_id
      where au.org_id = v_org and au.estado = 'programada' and au.fecha between v_hoy and v_hoy + 3
    ), '[]'::jsonb),
    'correos', coalesce((select jsonb_agg(m.email) from miembros m where m.org_id = v_org), '[]'::jsonb)
  );
end $$;

revoke execute on function public.resumen_diario(text) from public;
grant execute on function public.resumen_diario(text) to anon, authenticated;
