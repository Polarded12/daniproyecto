# Configuracion de Base de Datos en Supabase

## 1) Crear proyecto en Supabase
1. Entra a https://supabase.com y crea un proyecto.
2. Espera a que termine el aprovisionamiento.

## 2) Crear tablas
1. Abre **SQL Editor** en Supabase.
2. Copia y ejecuta el contenido de `backend/supabase/schema.sql`.

## 3) Configurar variables en backend
En `backend/.env` debes tener:

PORT=3000
SUPABASE_URL=TU_URL_DE_SUPABASE
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY

## 4) Validar conexion
1. Levanta el backend con `npm start` dentro de `backend`.
2. Si la tabla `pacientes` existe y la llave es correcta, la conexion debe funcionar.

## 5) Paso pendiente importante
Hoy la logica principal aun usa almacenamiento en memoria (`backend/utils/sessionStore.js`).
Para persistir de verdad en Supabase hay que reemplazar esos accesos por operaciones con `connectDatabase()`.
