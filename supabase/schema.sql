-- ENVIALO — esquema de base de datos (Supabase / Postgres)
-- Correr esto completo en: Supabase Dashboard > SQL Editor > New query

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  pais text not null check (pais in ('usa', 'co')),
  telefono text not null,
  cedula text,
  created_at timestamptz not null default now(),
  constraint cedula_solo_co check (
    (pais = 'co' and cedula is not null and length(trim(cedula)) > 0)
    or (pais = 'usa')
  )
);

alter table public.profiles enable row level security;

create policy "profiles: el usuario lee su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: el usuario crea su propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: el usuario actualiza su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea el perfil automáticamente cuando se registra un usuario en
-- auth.users, leyendo los datos que se mandan como metadata en
-- supabase.auth.signUp({ options: { data: {...} } }). Esto evita
-- problemas de RLS/sesión cuando la confirmación de email está activada
-- (en ese caso no hay sesión activa inmediatamente después del signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, pais, telefono, cedula)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'pais', 'usa'),
    coalesce(new.raw_user_meta_data ->> 'telefono', ''),
    new.raw_user_meta_data ->> 'cedula'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- anuncios (datos públicos del anuncio) ----------
create table if not exists public.anuncios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  direccion text not null check (direccion in ('usa-co', 'co-usa')),
  ciudad_origen text not null,
  ciudad_destino text not null,
  entrega_domicilio boolean not null default false,
  fecha_viaje date not null,
  kilos_disponibles numeric not null check (kilos_disponibles > 0),
  precio_kilo_usd numeric not null check (precio_kilo_usd > 0),
  nombre_contacto text not null,
  notas text,
  acepto_terminos boolean not null check (acepto_terminos = true),
  created_at timestamptz not null default now()
);

alter table public.anuncios enable row level security;

create policy "anuncios: lectura publica"
  on public.anuncios for select
  using (true);

create policy "anuncios: solo el dueño publica"
  on public.anuncios for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "anuncios: solo el dueño borra su anuncio"
  on public.anuncios for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists anuncios_direccion_idx on public.anuncios (direccion);
create index if not exists anuncios_fecha_viaje_idx on public.anuncios (fecha_viaje);

-- ---------- anuncios_contacto (dato sensible: WhatsApp) ----------
-- Separado de `anuncios` a propósito: solo usuarios autenticados pueden
-- leer esta tabla, así el numero de WhatsApp nunca llega en la respuesta
-- de la API a un visitante anónimo (no es solo "ocultar" en el frontend).
create table if not exists public.anuncios_contacto (
  anuncio_id uuid primary key references public.anuncios (id) on delete cascade,
  whatsapp text not null
);

alter table public.anuncios_contacto enable row level security;

create policy "contacto: solo usuarios con sesion pueden leer"
  on public.anuncios_contacto for select
  to authenticated
  using (true);

create policy "contacto: solo el dueño del anuncio inserta su contacto"
  on public.anuncios_contacto for insert
  to authenticated
  with check (
    exists (
      select 1 from public.anuncios a
      where a.id = anuncio_id and a.user_id = auth.uid()
    )
  );

-- Nota (mejora futura, fuera de alcance del MVP): un job de pg_cron que
-- borre anuncios con fecha_viaje muy en el pasado. Por ahora el listado
-- simplemente filtra fecha_viaje >= current_date en la consulta.
