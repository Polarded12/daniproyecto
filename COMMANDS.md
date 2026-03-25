# Comandos Esenciales NeuroUro

## Desarrollo

```bash
# Instalar dependencias (una sola vez)
npm install

# Levantar AMBOS servidores
npm run dev    # Una terminal para ambos

# O en 2 terminales separadas:
# Terminal 1:
npm run dev -w frontend

# Terminal 2:
npm run dev -w backend
```

## Build & Validación

```bash
# Compilar todo
npm run build

# Compilar solo frontend
npm run build -w frontend

# Compilar solo backend
npm run build -w backend

# Verificar si hay errores sin compilar
npm run dev   # Mostrará errores de TypeScript
```

## Base de Datos

```bash
# Entrar a Supabase dashboard
# https://supabase.com/dashboard

# Ejecutar migraciones (en SQL Editor del dashboard):
# 1. New Query
# 2. Pega contenido de supabase/migrations/0001_init.sql
# 3. Run

# Ver datos en vivo:
# Table Editor > app_users, alerts, risk_assessments, etc.
```

## Testing Endpoints

```bash
# Registrarse
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "fullName": "Test User",
    "sex": "male",
    "lesionLevel": "thoracic",
    "bladderManagementType": "intermittent_catheterization",
    "hasCaregiver": false,
    "role": "patient"
  }'

# Iniciar sesión
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Llamada autenticada (reemplaza TOKEN con el accessToken del login)
curl -X GET http://localhost:4000/api/profile/me \
  -H "Authorization: Bearer TOKEN"

# Evaluar riesgo
curl -X POST http://localhost:4000/api/risk/evaluate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "uuid-from-database",
    "eventType": "catheterization",
    "delayMinutes": 45
  }'

# Registrar hábito con riesgo automático
curl -X POST http://localhost:4000/api/habits/log \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "catheterization",
    "plannedAt": "2025-03-23T08:00:00Z",
    "performedAt": "2025-03-23T09:45:00Z"
  }'
```

## URLs

| Servicio | URL | Notas |
|----------|-----|-------|
| Frontend | http://localhost:3000 | Next.js App Router |
| Backend API | http://localhost:4000 | Express |
| Health check | http://localhost:4000/health | GET (no auth needed) |
| Supabase Dashboard | https://supabase.com/dashboard | Credenciales de tu proyecto |

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
BACKEND_URL=http://localhost:4000
SESSION_COOKIE_NAME=app_session
```

### Backend (.env)
```
PORT=4000
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_secret_key_here
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Stack Versions

- Node.js: 24.13.0
- Next.js: 16.0.0 (App Router + Turbopack)
- React: 19
- Express: 4.21.2
- TypeScript: 5.8.3
- Supabase: 2.49.4
- PostgreSQL: (en Supabase)

## Estructura Carpetas

```
daniproyecto/
├── frontend/               # Next.js 16
│   ├── app/               # Pages + API routes
│   ├── utils/supabase/    # Client/Server/Middleware helpers
│   ├── middleware.ts      # Auth + session refresh
│   └── .env.local         # Variables (copia de .example)
│
├── backend/               # Express + TypeScript
│   ├── src/
│   │   ├── config/        # JWT, Supabase, env
│   │   ├── modules/       # Auth, Profile, Risk, Habits, Caregiver
│   │   ├── middleware/    # Auth validation
│   │   ├── utils/         # Database helpers
│   │   ├── app.ts         # Express setup
│   │   └── index.ts       # Server entry
│   └── .env               # Variables (copia de .example)
│
├── supabase/
│   └── migrations/
│       └── 0001_init.sql  # Schema, enums, RLS policies
│
├── package.json           # Monorepo root (npm workspaces)
├── QUICK_START.md         # Guía paso a paso
├── SUPABASE_SETUP.md      # Detallado Supabase
└── README.md              # Overview
```

## Tips Útiles

```bash
# Solo recompilar (sin correr servidor)
npm run build -w frontend
npm run build -w backend

# Limpiar node_modules
rm -r node_modules
npm install

# Ver logs del backend
# (aparecen en la terminal donde hiciste `npm run dev -w backend`)

# Debuggear en el navegador
# Frontend: DevTools (F12)
# Backend: Logs en terminal

# Ver estructura de base de datos en vivo
# Supabase Dashboard > Table Editor
```

## Common Issues

| Problema | Solución |
|----------|----------|
| "Cannot find module" | `npm install` en raíz |
| Backend no inicia | Verifica `backend/.env` existe con SUPABASE_URL |
| Frontend no se conecta | Verifica `frontend/.env.local` con BACKEND_URL |
| RLS error en queries | Asegúrate que usuario está autenticado |
| Port 3000 en uso | `lsof -i :3000` (Mac/Linux) o `netstat -tulpn` (Linux) |

```bash
# Liberar puerto en Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```
