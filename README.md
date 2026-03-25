# HealthTech NeuroUro Monorepo

Base funcional con las tecnologias solicitadas:
- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS 4, ESLint, middleware de proteccion por cookie.
- Backend: Node.js + Express 4 + TypeScript, Zod, JWT + bcryptjs, CORS, dotenv.
- Datos: Supabase (PostgreSQL) con migracion SQL incluida.

## Estructura

- `frontend/` app web con login, dashboard y proxy API para auth
- `backend/` API REST para autenticacion, perfil, riesgos, habitos y cuidador
- `supabase/migrations/0001_init.sql` esquema relacional inicial

## Configuracion rapida

1. Copia variables de entorno:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env.local`

2. Configura valores minimos:
   - Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`
   - Frontend: `BACKEND_URL=http://localhost:4000`

3. Ejecuta migracion SQL en Supabase con el contenido de:
   - `supabase/migrations/0001_init.sql`

4. Instala dependencias y levanta ambos servicios:

```bash
npm install
npm run dev
```

## Endpoints backend

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Perfil
- `GET /api/profile/me` (Bearer token)

### Riesgo
- `POST /api/risk/evaluate` (Bearer token)

### Habitos y alertas
- `POST /api/habits/log` (Bearer token)
  - Registra evento
  - Calcula riesgo
  - Persiste `risk_assessments`
  - Genera alerta si nivel `yellow` o `red`
  - Crea alertas espejo para cuidadores vinculados

### Modo cuidador
- `POST /api/caregiver/link` (Bearer token)
- `GET /api/caregiver/links` (Bearer token)

## Notas de producto/clinica implementadas

- Retrasos intermitente: 60 min (amarillo), 120 min (rojo)
- Retrasos vaciado bolsa: 120 min (amarillo), 240 min (rojo)
- Retraso cambio de sonda: 72h (moderado), 168h (alto)
- Parametros de protocolo quedan en `patient_protocols` para ajuste medico por paciente

## Seguridad

- Passwords con `bcryptjs`
- Tokens de acceso con `jsonwebtoken`
- Cookie httpOnly en frontend (`app_session` por defecto)
- Middleware Next protege rutas de `dashboard`
- RLS base incluida en SQL para lecturas directas por usuario/cuidador
