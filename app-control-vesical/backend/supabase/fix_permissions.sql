-- =========================================================
-- Control Vesical - Reparar permisos PostgREST/Supabase
-- Ejecutar en Supabase SQL Editor si aparece:
-- "permission denied for table pacientes"
-- =========================================================

begin;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
grant usage, select on sequences to service_role;

alter default privileges in schema public
grant execute on functions to service_role;

commit;
