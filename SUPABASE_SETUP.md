# Integración de Supabase en HealthTech NeuroUro

Este proyecto ahora soporta Supabase tanto para autenticación como para acceso seguro a datos con RLS (Row Level Security).

## Arquitectura Actual

1. **Autenticación**: Backend Express con JWT + bcrypt (personalizado)
   - Endpoint: `POST /api/auth/register` y `POST /api/auth/login`
   - Sesión: Cookie httpOnly `app_session`
   - Token: JWT firmado con `JWT_SECRET`

2. **Datos**: Supabase PostgreSQL con RLS
   - Lectura/escritura de hábitos, alertas, riesgos
   - Políticas RLS para acceso a datos propios
   - Server-side queries desde Next.js con seguridad garantizada

## Configuración Rápida

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Anon Key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Ejecutar Migración SQL

1. Ve a SQL Editor en tu proyecto Supabase
2. Copia y pega el contenido de `supabase/migrations/0001_init.sql`
3. Ejecuta (Run)

### 3. Configurar Variables de Entorno

#### Frontend: `frontend/.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
BACKEND_URL=http://localhost:4000
SESSION_COOKIE_NAME=app_session
```

#### Backend: `backend/.env`
```bash
PORT=4000
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_secret_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 4. Instalar Dependencias

```bash
npm install
```

## Flujo Actual

```
Usuario → Frontend (Next.js)
          ↓
        Middleware (autenticación + sesión Supabase)
          ↓
    Backend Express (JWT)
          ↓
    Supabase PostgreSQL (RLS protege datos)
```

## Usar Supabase en Server Components

### Ejemplo 1: Leer datos del usuario (con RLS)

```typescript
import { createClient } from "@/utils/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const userId = "user-id-from-auth";

  // RLS automáticamente restringe a datos del usuario actual
  const { data: profile } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .single();

  return <div>{profile?.full_name}</div>;
}
```

### Ejemplo 2: Usar funciones helper para queries seguras

```typescript
import { getUserRiskAssessments, getUserAlerts } from "@/utils/supabase/queries";

export default async function DashboardPage() {
  const userId = "user-id-from-auth";
  const risks = await getUserRiskAssessments(userId);
  const alerts = await getUserAlerts(userId);

  return (
    <div>
      <h2>Riesgos Recientes</h2>
      {risks.map((r) => (
        <div key={r.id}>{r.level}: {r.score}</div>
      ))}
    </div>
  );
}
```

## RLS Policies

Tus tablas tienen políticas RLS predefinidas:

1. **app_users**: Usuario solo ve su propio perfil
2. **risk_assessments**: Paciente solo ve sus riesgos
3. **alerts**: Paciente ve sus alertas, cuidador ve alertas del paciente si está vinculado
4. **habit_events**: No tiene policy (agrega si es necesario)

Para deshabilitar RLS en desarrollo (NO recomendado en producción):
```sql
alter table public.app_users disable row level security;
```

## Migración Futura: Supabase Auth Nativo (Opcional)

Si decides usar Supabase Auth en lugar del JWT custom:

1. Cambiar esquema a usar `auth.users` en lugar de `app_users`
2. Usar `@supabase/auth-helpers-nextjs` en lugar de auth custom
3. Deshabilitar backend Express para auth (mantener para riesgo/hábitos)

Por ahora, mantendría la arquitectura actual (más control).

## Troubleshooting

### Error: "Supabase credentials not found"
- Verifica que `.env.local` está presente y tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### RLS denies access
- Verifica que las políticas RLS están correctas
- Usa `SUPABASE_SERVICE_ROLE_KEY` (backend) para bypassear RLS cuando escribas datos del servidor

### Session not persisting
- Revisa que el middleware está ejecutando (debe ser `async`)
- Verifica cookies en DevTools (Application > Cookies)

## Próximos Pasos

1. Conecta tu frontend a Supabase (actualiza .env.local)
2. Prueba lectura de datos: `npm run dev`
3. Verifica queries en Supabase SQL Editor
4. Opcional: Implementa Supabase Auth nativo para simplificar auth
