
CONFIGURAR SUPABASE (5 minutos)
1) Crea un proyecto en https://supabase.com
2) Tabla `vehiculos` con columnas: id (uuid pk, default gen_random_uuid()), created_at (timestamp tz default now()), marca text, modelo text, ano int, km int, precio int, combustible text, potencia int, cambio text, color text, descripcion text, fotos jsonb.
3) Copia URL del proyecto y anon key (Settings → API).
4) Abre app.js y reemplaza SUPABASE_URL y SUPABASE_ANON_KEY.
5) Sube todo a GitHub Pages.
