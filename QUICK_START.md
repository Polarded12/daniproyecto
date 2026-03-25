# Guía Rápida: Arrancar HealthTech NeuroUro con Supabase

## 1. Crear Proyecto en Supabase (5 min)

1. Ve a https://supabase.com/dashboard
2. Click en "New Project"
3. Rellena datos (nombre, región, contraseña para admin)
4. Espera a que se cree (≈1 minuto)
5. Cuando esté listo, copia:
   - **Project URL**: Se verá como `https://xxxxx.supabase.co`
   - **Anon Key**: En Settings > API > Copy anon public key
   - **Service Role Key**: En Settings > API > Copy service_role secret (solo backend)

## 2. Ejecutar Migraciones SQL (3 min)

1. En tu proyecto Supabase, ve a **SQL Editor** (lado izquierdo)
2. Click en **New Query**
3. Abre el archivo `supabase/migrations/0001_init.sql` de tu proyecto
4. Copia TODO el contenido y pégalo en el editor de SQL
5. Click en **Run**
6. Deberías ver: "Queries executed successfully"

**Nota**: Si ves errores sobre enums ya existentes, eso está bien. Las tablas se crearán igualmente.

## 3. Configurar Variables de Entorno (2 min)

### Frontend: Crea `frontend/.env.local`

Copia desde `frontend/.env.local.example` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...xxxxx
BACKEND_URL=http://localhost:4000
SESSION_COOKIE_NAME=app_session
```

### Backend: Crea `backend/.env`

```bash
PORT=4000
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=super_secret_jwt_key_at_least_32_chars!
SUPABASE_URL=https://your-project-xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...xxxxx_service_role
```

## 4. Instalar Dependencias (si no lo hiciste aún)

```bash
npm install
```

## 5. Levantar en Desarrollo (1 min)

Terminal 1 (Frontend):
```bash
cd frontend
npm run dev
```
→ Abre http://localhost:3000

Terminal 2 (Backend):
```bash
cd backend
npm run dev
```
→ Backend en http://localhost:4000

## 6. Probar Flujo Completo (5 min)

### a) Registrarse
1. Ve a http://localhost:3000/login
2. Click en "Registrarse"
3. Rellena:
   - Email: `test@example.com`
   - Contraseña: `Test123!@#`
   - Nombre: `Juan Perez`
   - Tipo de lesión: Toracica
   - Manejo vesical: Cateterismo intermitente
4. Click "Crear cuenta"

### b) Iniciar sesión
1. Usa las mismas credenciales
2. Deberías ir al dashboard

### c) Verificar datos en Supabase
1. Ve a tu proyecto Supabase
2. Click en **Table Editor** (lado izquierdo)
3. Abre tabla `app_users`
4. Deberías ver tu usuario registrado

## 7. Probar Endpoints del Backend (Opcional)

Usa `curl` o Postman para probar:

### Registrarse
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "Test123!@#",
    "fullName": "Patient Test",
    "sex": "female",
    "lesionLevel": "lumbar",
    "bladderManagementType": "intermittent_catheterization",
    "hasCaregiver": false,
    "role": "patient"
  }'
```

Respuesta esperada:
```json
{
  "user": {
    "id": "uuid-here",
    "email": "patient@test.com",
    "role": "patient"
  }
}
```

### Iniciar sesión
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@test.com",
    "password": "Test123!@#"
  }'
```

Respuesta esperada:
```json
{
  "accessToken": "eyJhbGc.xxxxx"
}
```

### Registrar hábito (requiere token)
```bash
curl -X POST http://localhost:4000/api/habits/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "eventType": "catheterization",
    "plannedAt": "2026-03-23T08:00:00Z",
    "performedAt": "2026-03-23T08:75:00Z",
    "intermittentDelayMinutes": 75
  }'
```

## 8. Troubleshooting

### Error: "Supabase is not configured"
✅ Verifica `backend/.env` tiene `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Supabase credentials not found"
✅ Verifica `frontend/.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Página de login se ve rota
✅ Levanta ambos servidores (`npm run dev` en ambas carpetas)

### RLS denies access
✅ Las políticas RLS protegen tablas. Si necesitas acceso sin restricción durante desarrollo:
```sql
alter table public.app_users disable row level security;
```

### Token inválido pero el login pasó
✅ Asegúrate que el `JWT_SECRET` del backend es el MISMO entre reinicios. Usa un valor fijo.

## 9. Arquitectura Final

```
┌─────────────┐
│ Frontend    │ (Next.js 16 + React 19 + Tailwind)
│ localhost:  │ • Middleware + RLS-aware queries
│ 3000        │ • Auth por cookie httpOnly
└──────┬──────┘
       │
       ├─────────────► Backend                Supabase
       │              Express 4               PostgreSQL
       │              localhost: 4000        Database + RLS
       │              • JWT + bcrypt         • Tables
       │              • Hábitos/Riesgo       • Policies
       │              • Cuidadores           • Real-time
       │
       └─────────────► Supabase Client
                      (queries desde SSR)
                      • Lectura RLS-safe
                      • Session refresh
```

## 10. Siguiente Paso

- [ ] Configura variables de entorno
- [ ] Ejecuta migraciones SQL
- [ ] Levanta `npm run dev`
- [ ] Registra un usuario
- [ ] Prueba endpoints
- [ ] Opcional: Implementa Supabase Auth nativo (requiere refactor)

¡Listo! Tu app está completa y funcional con Supabase.
