-- Esquema base para App Control Vesical en Supabase (PostgreSQL)
-- Ejecuta este archivo en Supabase SQL Editor.

create extension if not exists pgcrypto;

-- ===== PACIENTES =====
create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad integer not null check (edad > 0),
  sexo text not null,
  nivel_lesion text not null,
  tipo_manejo_vesical text not null,
  tiene_cuidador boolean not null default false,
  codigo_vinculacion text unique,
  frecuencia_cambio_sonda_dias integer check (frecuencia_cambio_sonda_dias in (14, 30)),
  fecha_ultimo_cambio_sonda timestamptz,
  cuidador_vinculado boolean not null default false,
  onboarding_completado_en timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_pacientes_codigo_vinculacion
  on public.pacientes (codigo_vinculacion);

-- ===== CUIDADORES =====
create table if not exists public.cuidadores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- ===== VINCULACION PACIENTE-CUIDADOR =====
create table if not exists public.paciente_cuidador (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  cuidador_id uuid not null references public.cuidadores(id) on delete cascade,
  codigo_vinculacion_usado text not null,
  activo boolean not null default true,
  vinculado_en timestamptz not null default now()
);

create index if not exists idx_paciente_cuidador_paciente_activo
  on public.paciente_cuidador (paciente_id, activo);

-- ===== ESTADO VESICAL =====
create table if not exists public.estado_vesical_paciente (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null unique references public.pacientes(id) on delete cascade,
  ultima_confirmacion_en timestamptz,
  siguiente_procedimiento_en timestamptz,
  riesgo_actual text not null default 'bajo',
  minutos_intervalo integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_estado_vesical_siguiente
  on public.estado_vesical_paciente (siguiente_procedimiento_en);

-- ===== HIDRATACION =====
create table if not exists public.hidratacion_registros (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  cantidad_ml integer not null check (cantidad_ml > 0),
  origen text not null default 'boton_rapido',
  registrado_en timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_hidratacion_paciente_fecha
  on public.hidratacion_registros (paciente_id, registrado_en desc);

-- ===== PROCEDIMIENTOS =====
create table if not exists public.procedimiento_registros (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  actor text not null,
  checklist_lavado_manos boolean not null,
  checklist_material_limpio boolean not null,
  checklist_tecnica_correcta boolean not null,
  confirmado_en timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_procedimiento_paciente_fecha
  on public.procedimiento_registros (paciente_id, confirmado_en desc);

-- ===== ALERTAS =====
create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  cuidador_id uuid references public.cuidadores(id) on delete set null,
  tipo text not null,
  nivel text not null,
  riesgo text not null,
  destino text not null,
  mensaje text not null,
  retraso_minutos integer,
  estado text not null default 'activa',
  disparada_en timestamptz not null default now(),
  confirmada_en timestamptz,
  resuelta_en timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_alertas_paciente_estado
  on public.alertas (paciente_id, estado);

create index if not exists idx_alertas_tipo_nivel_destino_estado
  on public.alertas (paciente_id, tipo, nivel, destino, estado);

-- ===== VISTA UTIL =====
create or replace view public.v_alertas_activas as
select
  a.id,
  a.paciente_id,
  a.cuidador_id,
  a.tipo,
  a.nivel,
  a.riesgo,
  a.destino,
  a.mensaje,
  a.retraso_minutos,
  a.disparada_en,
  a.created_at
from public.alertas a
where a.estado = 'activa';

-- ===== RLS =====
-- Si usaras cliente anon directamente, habilita RLS y politicas por usuario.
-- En este proyecto el backend usa service role key, por eso puede operar sin RLS.
alter table public.pacientes enable row level security;
alter table public.cuidadores enable row level security;
alter table public.paciente_cuidador enable row level security;
alter table public.estado_vesical_paciente enable row level security;
alter table public.hidratacion_registros enable row level security;
alter table public.procedimiento_registros enable row level security;
alter table public.alertas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'pacientes' and policyname = 'deny_all_pacientes'
  ) then
    create policy deny_all_pacientes on public.pacientes for all to anon, authenticated using (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cuidadores' and policyname = 'deny_all_cuidadores'
  ) then
    create policy deny_all_cuidadores on public.cuidadores for all to anon, authenticated using (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'paciente_cuidador' and policyname = 'deny_all_paciente_cuidador'
  ) then
    create policy deny_all_paciente_cuidador on public.paciente_cuidador for all to anon, authenticated using (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'estado_vesical_paciente' and policyname = 'deny_all_estado_vesical_paciente'
  ) then
    create policy deny_all_estado_vesical_paciente on public.estado_vesical_paciente for all to anon, authenticated using (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hidratacion_registros' and policyname = 'deny_all_hidratacion_registros'
  ) then
    create policy deny_all_hidratacion_registros on public.hidratacion_registros for all to anon, authenticated using (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'procedimiento_registros' and policyname = 'deny_all_procedimiento_registros'
  ) then
    create policy deny_all_procedimiento_registros on public.procedimiento_registros for all to anon, authenticated using (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'alertas' and policyname = 'deny_all_alertas'
  ) then
    create policy deny_all_alertas on public.alertas for all to anon, authenticated using (false);
  end if;
end $$;