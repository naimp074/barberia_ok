-- Crear tabla de barberías
create table if not exists public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  num_barbers integer not null default 1,
  created_at timestamp with time zone default now()
);

-- Crear perfiles de usuario con rol y barbería
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','barber')),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Asegurar RLS
alter table public.barbershops enable row level security;
alter table public.user_profiles enable row level security;

-- Políticas básicas: cada usuario ve su barbería y su perfil; admin ve su barbería completa
create policy if not exists "Users can view own barbershop by membership"
  on public.barbershops
  for select
  using (
    exists (
      select 1 from public.user_profiles p
      where p.barbershop_id = barbershops.id and p.user_id = auth.uid()
    )
  );

create policy if not exists "Owner can manage own barbershop"
  on public.barbershops
  for all
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy if not exists "Users can view own profile"
  on public.user_profiles
  for select
  using (user_id = auth.uid());

-- Extender tabla services con barbería y barbero
alter table public.services
  add column if not exists barbershop_id uuid references public.barbershops(id) on delete cascade,
  add column if not exists barber_user_id uuid references auth.users(id) on delete set null;

-- Políticas de services (si usas RLS en services, ajusta según tu setup)
-- Ejemplo de lectura: miembros de la barbería pueden ver
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='services' and policyname='Members can read services'
  ) then
    create policy "Members can read services" on public.services for select using (
      exists (
        select 1 from public.user_profiles p
        where p.barbershop_id = services.barbershop_id and p.user_id = auth.uid()
      )
    );
  end if;
end $$;

-- Ejemplo de inserción: el barbero inserta en su barbería
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='services' and policyname='Barbers insert own services'
  ) then
    create policy "Barbers insert own services" on public.services for insert with check (
      barber_user_id = auth.uid() and exists (
        select 1 from public.user_profiles p where p.user_id = auth.uid() and p.barbershop_id = services.barbershop_id
      )
    );
  end if;
end $$;


