-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create membership_plans if missing
create table if not exists public.membership_plans (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    price_monthly decimal(10,2),
    price_yearly decimal(10,2),
    duration_days integer, -- Null for monthly/yearly logic handled by app, or set specific days
    features jsonb default '[]'::jsonb,
    is_active boolean default true,
    is_featured boolean default false,
    created_at timestamp with time zone default now()
);

-- 2. Create membership_orders if missing
create table if not exists public.membership_orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id),
    plan_id uuid references public.membership_plans(id),
    order_id text unique not null,
    payment_id text,
    status text default 'PENDING', -- PENDING, SUCCESS, FAILED
    amount decimal(10,2),
    currency text default 'INR',
    billing_cycle text, -- 'monthly', 'yearly'
    payment_session_id text,
    coupon_code text,
    discounted_amount decimal(10,2),
    cashfree_response jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 3. Create user_memberships if missing
create table if not exists public.user_memberships (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id),
    plan_id uuid references public.membership_plans(id),
    order_id text references public.membership_orders(order_id), -- Linking to text order_id for easier lookup or UUID if preferred
    status text default 'active', -- active, inactive, expired
    start_date timestamp with time zone default now(),
    end_date timestamp with time zone, -- Null = lifetime
    auto_renewal_enabled boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 4. Create logging table
create table if not exists public.membership_activation_logs (
    id uuid primary key default uuid_generate_v4(),
    event_type text, -- WEBHOOK_RECEIVED, ACTIVATION_SUCCESS, etc.
    user_id uuid,
    plan_id uuid,
    order_id text,
    status text,
    error_message text,
    details jsonb,
    created_at timestamp with time zone default now()
);

-- 5. Indexes
create index if not exists idx_membership_orders_user on public.membership_orders(user_id);
create index if not exists idx_membership_orders_oid on public.membership_orders(order_id);
create index if not exists idx_user_memberships_user on public.user_memberships(user_id);
create index if not exists idx_user_memberships_status on public.user_memberships(status);

-- 6. RLS Policies
alter table public.user_memberships enable row level security;
create policy "Users can view own memberships" 
    on public.user_memberships for select 
    using (auth.uid() = user_id);

alter table public.membership_orders enable row level security;
create policy "Users can view own orders" 
    on public.membership_orders for select 
    using (auth.uid() = user_id);
    
-- 7. Functions
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

drop trigger if exists update_user_memberships_modtime on public.user_memberships;
create trigger update_user_memberships_modtime
    before update on public.user_memberships
    for each row execute procedure update_updated_at_column();