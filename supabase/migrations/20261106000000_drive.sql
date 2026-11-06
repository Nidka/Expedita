-- Conexión con el Drive del estudio (Google Apps Script).
-- La dirección del script y su clave las ven los miembros del estudio (RLS de config_org);
-- solo los administradores pueden cambiarlas (política config_admin).
alter table config_org
  add column if not exists drive_url text,
  add column if not exists drive_token text;
grant select (drive_url, drive_token) on config_org to authenticated;
grant update (drive_url, drive_token) on config_org to authenticated;

-- Carpeta de Drive asignada a mano a un expediente (si no, se empareja por nombre del cliente)
alter table expedientes add column if not exists drive_carpeta_id text;
