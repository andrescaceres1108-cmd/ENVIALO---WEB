-- SendGO — esquema de base de datos (Supabase / Postgres)
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

-- ---------- migración: permitir editar (UPDATE) el propio anuncio ----------
-- Corre esto en Supabase Dashboard > SQL Editor > New query.
-- Antes solo existían políticas de SELECT/INSERT/DELETE; faltaba UPDATE,
-- necesaria para el botón "Editar" del menú de tres puntos.
create policy "anuncios: solo el dueño actualiza su anuncio"
  on public.anuncios for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "contacto: solo el dueño actualiza su contacto"
  on public.anuncios_contacto for update
  to authenticated
  using (
    exists (
      select 1 from public.anuncios a
      where a.id = anuncio_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.anuncios a
      where a.id = anuncio_id and a.user_id = auth.uid()
    )
  );

-- ---------- migración: borrar la propia cuenta ----------
-- Corre esto en Supabase Dashboard > SQL Editor > New query.
-- La app (con la clave anon) no tiene permiso para borrar filas de
-- auth.users directamente, así que exponemos una función "security
-- definer" (mismo patrón que handle_new_user) que solo puede borrar
-- la cuenta de quien la invoca (auth.uid()), nunca la de otra persona.
-- Al borrar el usuario de auth.users, se borra en cascada su fila en
-- profiles (profiles.id -> auth.users.id on delete cascade) y a su vez
-- todos sus anuncios y anuncios_contacto (anuncios.user_id -> profiles.id
-- on delete cascade, anuncios_contacto.anuncio_id -> anuncios.id on
-- delete cascade).
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

-- ---------- migración: rate limiting ----------
-- Corre esto en Supabase Dashboard > SQL Editor > New query.
-- Tabla genérica de contadores por ventana de tiempo, usada por
-- check_rate_limit() para frenar abuso (registro masivo, fuerza bruta de
-- login, spam de "olvidé mi contraseña", publicar/reportar en cadena).
-- La tabla no tiene policies (RLS activo, sin "using"), así que nadie
-- puede leerla/escribirla directo vía la API: solo es accesible desde la
-- función security definer de abajo, que corre con privilegios elevados.
create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;

-- Devuelve true si la acción identificada por `p_key` todavía está dentro
-- del límite `p_max` para la ventana de `p_window_seconds` segundos; si la
-- ventana ya expiró, la reinicia. Se llama con una key que combina la
-- acción + un identificador (ip o user id), ej: 'signup:203.0.113.4'.
create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
        when public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
          then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::interval
          then now()
        else public.rate_limits.window_start
      end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;

-- ---------- migración: reportar anuncios ----------
-- Corre esto en Supabase Dashboard > SQL Editor > New query.
-- Cola de reportes de usuarios sobre anuncios sospechosos/abusivos. No
-- tiene policy de SELECT a propósito: ningún usuario (ni siquiera el dueño
-- del anuncio) puede leer quién reportó qué; solo se revisa manualmente
-- desde el Table Editor de Supabase (con el rol admin, que ignora RLS).
create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  anuncio_id uuid not null references public.anuncios (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  motivo text not null check (length(trim(motivo)) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (anuncio_id, reporter_id)
);

alter table public.reportes enable row level security;

create policy "reportes: un usuario autenticado reporta con su propio id"
  on public.reportes for insert
  to authenticated
  with check (auth.uid() = reporter_id);
