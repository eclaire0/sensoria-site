-- A readable view for the Table Editor.
--
-- The underlying tables are correct but awkward to read by hand: inquiries
-- carries a client_id UUID, so matching an enquiry to a person means holding a
-- UUID in your head across two tables. This joins them into one list.
--
-- Named "inbox" rather than anything close to "inquiries" so the two are never
-- confused in the sidebar.

-- Written to be re-runnable: these get pasted into the SQL editor by hand, and
-- a half-applied run is easier to recover from than to diagnose.
drop view if exists inbox cascade;
drop function if exists inbox_update() cascade;

create view inbox as
select
  i.status,
  c.full_name                                                as name,
  c.email,
  i.message,
  i.submitted_at,
  (current_date - i.submitted_at::date)                      as days_waiting,
  i.public_reference                                         as reference,
  c.phone,
  i.source,
  i.id                                                       as inquiry_id,
  c.id                                                       as client_id
from inquiries i
join clients c on c.id = i.client_id;

-- A view over a join is read-only in Postgres, which would force her to read
-- here and then edit status over in inquiries. This makes the status column
-- writable in place, since changing it is the whole daily workflow.
create function inbox_update() returns trigger
language plpgsql
as $$
begin
  update inquiries
     set status     = new.status,
         updated_at = now()
   where id = old.inquiry_id;
  return new;
end;
$$;

create trigger inbox_update_trigger
  instead of update on inbox
  for each row execute function inbox_update();

grant all on inbox to service_role;
