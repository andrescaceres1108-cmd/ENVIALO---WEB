# ENVIALO

Tablón de anuncios (crowdshipping) que conecta viajeros con espacio en su
maleta con personas que necesitan enviar cosas entre el área DMV
(Washington DC, Maryland, Virginia) y cualquier ciudad de Colombia, en ambas
direcciones.

**ENVIALO es solo intermediario**: no transporta, no custodia ni verifica
mercancía, no fija precios y no procesa pagos. Todo acuerdo es directo entre
viajero y remitente vía WhatsApp.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) (Postgres + Auth)
- Deploy pensado para [Vercel](https://vercel.com)

## Desarrollo local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea un archivo `.env.local` (copia `.env.local.example`) con las
   credenciales de tu proyecto de Supabase — ver sección "Configurar
   Supabase" abajo.
3. Corre el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre [http://localhost:3000](http://localhost:3000).

## Configurar Supabase (una sola vez)

1. Crea una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com)
   (tiene capa gratuita).
2. En el dashboard del proyecto ve a **SQL Editor → New query**, pega todo el
   contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo.
   Esto crea las tablas `profiles`, `anuncios`, `anuncios_contacto`, sus
   políticas de seguridad (RLS) y el trigger que crea el perfil al
   registrarse.
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → pégalo en `.env.local` como `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → pégalo como `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. (Opcional, recomendado para el MVP) En **Authentication → Providers →
   Email**, desactiva "Confirm email" mientras pruebas, para poder
   registrarte e iniciar sesión de inmediato sin revisar tu correo. Puedes
   reactivarlo cuando quieras exigir verificación de correo antes de
   publicar/contactar.

## Desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub (ver sección git abajo).
2. Entra a [vercel.com/new](https://vercel.com/new) e importa ese repositorio.
3. En "Environment Variables" agrega las mismas dos variables de tu
   `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Dale a Deploy. Vercel detecta Next.js automáticamente (no hace falta
   configurar nada más).
5. Cada vez que hagas push a la rama principal, Vercel vuelve a desplegar
   solo.

## Estructura

```
app/            páginas (Home, /cuenta, /publicar, /anuncios, /terminos)
components/     UI compartida (Header, Footer, TagCard, AuthForm, AuthModal…)
lib/            Server Actions, validación (zod), clientes de Supabase
supabase/       schema.sql — correr en el SQL Editor de Supabase
```

## Fuera de alcance de este MVP

Pagos, calificaciones de usuarios, app móvil, verificación real por SMS del
teléfono. El código está organizado (Server Actions, tablas separadas) para
agregarlos después.

Nota legal: el texto en `/terminos` es un borrador y debe ser revisado por
un abogado antes de operar públicamente.
