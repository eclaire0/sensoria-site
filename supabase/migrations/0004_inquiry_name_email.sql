-- The Supabase Table Editor is read-only for views no matter what triggers the
-- view carries, so inbox could be read but not worked in: changing a status
-- meant switching to inquiries, where the person was a UUID again. Putting the
-- submitted name and email on the enquiry itself makes one table both readable
-- and editable, which is the whole daily workflow.
--
-- It is also the more honest record. What someone typed when they wrote in is a
-- fact about that enquiry, and should not silently change if their client row is
-- edited later. clients still carries the canonical person and the history.

alter table inquiries add column if not exists name text;
alter table inquiries add column if not exists email text;

update inquiries i
   set name  = c.full_name,
       email = c.email
  from clients c
 where c.id = i.client_id
   and i.name is null;

-- Dropped rather than kept: it existed only to work around unreadable UUIDs, and
-- that is now fixed at the source. Two subtly different lists of the same thing
-- is worse for a daily user than one.
drop view if exists inbox cascade;
drop function if exists inbox_update() cascade;
