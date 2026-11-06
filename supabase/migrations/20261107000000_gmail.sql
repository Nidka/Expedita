-- Conexión con el Gmail que recibe los avisos del SINOE (Google Apps Script).
-- Visible para los miembros del estudio (RLS de config_org); solo administradores la cambian.
alter table config_org
  add column if not exists gmail_url text,
  add column if not exists gmail_token text;
grant select (gmail_url, gmail_token) on config_org to authenticated;
grant update (gmail_url, gmail_token) on config_org to authenticated;
