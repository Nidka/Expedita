-- Permisos por rol (RF-38 / RNF-04).
-- Administrador: todo. Abogado: lee, crea y edita; no elimina expedientes, notificaciones,
-- audiencias, visitas ni juzgados (se archivan o se marcan), y solo elimina acciones y modelos que él creó.

do $$
declare t text;
begin
  foreach t in array array['expedientes','notificaciones','mensajes_whatsapp','visitas','visita_items','audiencias','juzgados','acciones','modelos_escrito','enlaces_cliente']
  loop
    execute format('drop policy if exists %I on %I', t || '_miembros', t);
    execute format('create policy %I on %I for select using (org_id in (select mis_orgs()))', t || '_ver', t);
    execute format('create policy %I on %I for insert with check (org_id in (select mis_orgs()))', t || '_crear', t);
    execute format('create policy %I on %I for update using (org_id in (select mis_orgs())) with check (org_id in (select mis_orgs()))', t || '_editar', t);
  end loop;

  -- Solo administradores eliminan
  foreach t in array array['expedientes','notificaciones','mensajes_whatsapp','visitas','visita_items','audiencias','juzgados','enlaces_cliente']
  loop
    execute format('create policy %I on %I for delete using (es_admin(org_id))', t || '_eliminar', t);
  end loop;

  -- Administradores, o quien lo creó
  foreach t in array array['acciones','modelos_escrito']
  loop
    execute format('create policy %I on %I for delete using (es_admin(org_id) or (org_id in (select mis_orgs()) and creado_por = auth.uid()))', t || '_eliminar', t);
  end loop;
end $$;
