# Certification Dashboard

Dashboard React para preparar la certificacion, con login sin contraseña por correo y persistencia en Supabase.

## Configuracion local

1. Crea un proyecto en Supabase.
2. Ejecuta `supabase/schema.sql` en el SQL Editor de Supabase.
3. Copia `.env.example` a `.env.local` y llena las variables.
4. Instala dependencias y corre la app:

```bash
npm install
npm run dev
```

## Supabase Auth

En Supabase activa Email provider con magic link/OTP.

Agrega estas URLs en Authentication > URL Configuration:

```txt
http://localhost:5173
https://tu-proyecto.vercel.app
```

## Hacer admin tu usuario

Despues de entrar por primera vez con tu correo, ejecuta:

```sql
update public.profiles
set is_admin = true, can_view_ranking = true
where email = 'tu-correo@dominio.com';
```

## Rutas

- `/login`: acceso con usuario y correo.
- `/`: dashboard personal.
- `/ranking`: ranking global, solo admin o usuarios habilitados.
- `/admin`: panel para habilitar usuarios, solo admin.

## Deploy en Vercel

Agrega estas variables de entorno en Vercel:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

No uses la service role key en el frontend.
