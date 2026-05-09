-- ========================================
-- notifications table
-- ========================================
create table if not exists notification_service.notifications (
    id uuid primary key default gen_random_uuid(),
    "userId" uuid not null,
    -- email
    channel varchar(255) not null,
    -- subject (for email)
    subject varchar(500) not null,
    content text,
    -- ('pending', 'sent', 'failed')
    status varchar(50) not null default 'pending',
    -- if fail exists, store error message
    "errorMessage" text,
    -- count of retry attempts
    "retryCount" int default 0,
    metadata jsonb,

    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now(),
    "sentAt" timestamptz
);

-- ========================================
-- indexes
-- ========================================
create index if not exists idx_notifications_user_id on notification_service.notifications("userId");
create index if not exists idx_notifications_status on notification_service.notifications(status);
create index if not exists idx_notifications_created_at on notification_service.notifications("createdAt");
create index if not exists idx_notifications_user_created on notification_service.notifications("userId", "createdAt" desc);

-- ========================================
-- trigger for auto updating updated_at
-- ========================================
create or replace function notification_service.update_updated_at_column()
returns trigger as $$
begin
new."updatedAt" = now();
return new;
end;
$$ language 'plpgsql';

create trigger update_notifications_updated_at
    before update on notification_service.notifications
    for each row
    execute function notification_service.update_updated_at_column();