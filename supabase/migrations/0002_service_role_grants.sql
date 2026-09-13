-- PostgREST connects as service_role. Bypassing RLS is not the same as being
-- allowed to touch a table: the role also needs table-level privileges, and
-- tables created through the SQL editor did not inherit them. Every request
-- came back 42501 "permission denied" until these were granted.
--
-- Granted to service_role only. anon and authenticated are deliberately left
-- with no access, so the browser still cannot reach these tables directly.

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- so anything added to this schema later is covered without a repeat of tonight
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
