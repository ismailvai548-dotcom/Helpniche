-- ============================================================================
-- FocusDurood Secure Device Unlock System - Complete Production SQL Migration
-- ============================================================================

-- 1. Create UUID Extension if not exists
create extension if not exists "uuid-ossp";

-- 2. Create Table: telegram_users
create table if not exists public.telegram_users (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null,
    telegram_chat_id bigint not null unique,
    telegram_username text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast user/telegram lookup
create index if not exists idx_telegram_users_chat_id on public.telegram_users(telegram_chat_id);
create index if not exists idx_telegram_users_user_id on public.telegram_users(user_id);

-- 3. Create Table: unlock_requests
create table if not exists public.unlock_requests (
    id uuid default uuid_generate_v4() primary key,
    user_id text not null,
    device_id text not null,
    device_name text not null,
    telegram_chat_id bigint,
    reason text,
    status text default 'pending' check (status in ('pending', 'code_generated', 'sent', 'approved', 'rejected', 'expired')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    approved_at timestamp with time zone
);

-- Index for fast lookup by device and status
create index if not exists idx_unlock_requests_device_status on public.unlock_requests(device_id, status);
create index if not exists idx_unlock_requests_user_id on public.unlock_requests(user_id);

-- 4. Create Table: unlock_codes
create table if not exists public.unlock_codes (
    id uuid default uuid_generate_v4() primary key,
    request_id uuid references public.unlock_requests(id) on delete cascade not null,
    user_id text not null,
    device_id text not null,
    code_hash text not null,
    plaintext_code text,
    status text default 'unused' check (status in ('unused', 'used', 'expired', 'revoked')),
    duration_minutes integer default 10 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expires_at timestamp with time zone not null,
    used_at timestamp with time zone,
    created_by text default 'admin'
);

-- Index for atomic verification lookup
create index if not exists idx_unlock_codes_verify on public.unlock_codes(device_id, code_hash, status);

-- 5. Enable Row Level Security (RLS) on all tables
alter table public.telegram_users enable row level security;
alter table public.unlock_requests enable row level security;
alter table public.unlock_codes enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Service role full access on telegram_users" on public.telegram_users;
drop policy if exists "Service role full access on unlock_requests" on public.unlock_requests;
drop policy if exists "Service role full access on unlock_codes" on public.unlock_codes;

-- Allow Service Role (Supabase Edge Functions) complete unrestricted access
create policy "Service role full access on telegram_users" on public.telegram_users for all using (true);
create policy "Service role full access on unlock_requests" on public.unlock_requests for all using (true);
create policy "Service role full access on unlock_codes" on public.unlock_codes for all using (true);

-- 6. Atomic Code Consumption Function (PostgreSQL Transaction with Row Locking)
create or replace function public.consume_unlock_code(
    p_device_id text,
    p_code_hash text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_code_rec record;
    v_now timestamp with time zone := now();
begin
    -- Row-level locking with FOR UPDATE to prevent race conditions & double-use
    select c.id, c.request_id, c.duration_minutes, c.expires_at, c.status
    into v_code_rec
    from public.unlock_codes c
    where lower(c.device_id) = lower(p_device_id)
      and c.code_hash = p_code_hash
      and c.status = 'unused'
      and c.expires_at > v_now
    for update of c;

    -- If no valid unused active code found
    if not found then
        return json_build_object(
            'success', false,
            'message', '❌ কোডটি ভুল, মেয়াদোত্তীর্ণ বা ইতিমধ্যে ব্যবহার করা হয়েছে!'
        );
    end if;

    -- Atomically update code status to USED
    update public.unlock_codes
    set status = 'used',
        used_at = v_now
    where id = v_code_rec.id;

    -- Update parent request status to APPROVED
    update public.unlock_requests
    set status = 'approved',
        approved_at = v_now,
        updated_at = v_now
    where id = v_code_rec.request_id;

    return json_build_object(
        'success', true,
        'duration_minutes', v_code_rec.duration_minutes,
        'message', '✅ ভ্যালিডেশন সফল হয়েছে! অ্যাপ আনলক করা হয়েছে।'
    );
end;
$$;
