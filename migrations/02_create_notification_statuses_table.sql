-- ========================================
-- notification_statuses table
-- ========================================
create table if not exists notification_statuses(
    id serial primary key,
    name varchar(50) not null unique
);

-- ========================================
-- Insert default statuses
-- ========================================
insert into notification_statuses (name) values
    ('queued'),
    ('sending'),
    ('sent'),
    ('failed'),
    ('retrying')
on conflict (name) do nothing;

-- ========================================
-- Update notifications table
-- ========================================
alter table notifications
    add column if not exists "statusId" integer;

update notifications n
set "statusId" = (
    select id from notification_statuses
    where name = case
                     when n.status = 'pending' then 'queued'
                     when n.status = 'sent' then 'sent'
                     when n.status = 'failed' then 'failed'
                     else 'queued'
        end
)
where "statusId" is null;

-- Default value (queued = 1)
alter table notifications
    alter column "statusId" set default 1;

alter table notifications
    alter column "statusId" set not null;

alter table notifications
    add constraint fk_notifications_status
        foreign key ("statusId")
            references notification_statuses(id);

create index if not exists idx_notifications_status_id
    on notifications("statusId");

alter table notifications drop column if exists status;

-- ========================================
-- Trigger for auto-update sentAt when status changes to SENT
-- ========================================
create or replace function update_sent_at_on_status_change()
returns trigger as $$
begin
    -- If statusId changed to SENT (3), set sentAt to current timestamp
    if NEW."statusId" = 3 and (OLD."statusId" IS NULL or OLD."statusId" != 3) then
        NEW."sentAt" = NOW();
    end if;
    return NEW;
end;
$$ language 'plpgsql';

create trigger update_notifications_sent_at
before update on notifications
    for each row
    when (NEW."statusId" = 3 and (OLD."statusId" IS NULL or OLD."statusId" != 3))
    execute function update_sent_at_on_status_change();
