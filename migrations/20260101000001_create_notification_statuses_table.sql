create schema if not exists notification_service;

-- ========================================
-- notification_statuses table
-- ========================================
create table if not exists notification_service.notification_statuses(
    id serial primary key,
    name varchar(50) not null unique
);

-- Insert default statuses
insert into notification_service.notification_statuses (name) values
    ('queued'),
    ('sending'),
    ('sent'),
    ('failed'),
    ('retrying')
on conflict (name) do nothing;

-- Add statusId column to notifications
alter table notification_service.notifications
    add column if not exists "statusId" integer;

-- Update notifications with correct statusId
update notification_service.notifications n
set "statusId" = (
    select id from notification_service.notification_statuses
    where name = case
                     when n.status = 'pending' then 'queued'
                     when n.status = 'sent' then 'sent'
                     when n.status = 'failed' then 'failed'
                     else 'queued'
        end
)
where "statusId" is null;

-- Set default and not null
alter table notification_service.notifications
    alter column "statusId" set default 1,
alter column "statusId" set not null;

alter table notification_service.notifications
    add constraint fk_notifications_status
        foreign key ("statusId")
            references notification_service.notification_statuses(id);

create index if not exists idx_notifications_status_id
    on notification_service.notifications("statusId");

-- Drop old status column
alter table notification_service.notifications drop column if exists status;