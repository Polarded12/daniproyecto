-- =========================================================
-- Control Vesical - Esquema inicial para Supabase (PostgreSQL)
-- Ejecutar completo en Supabase SQL Editor.
-- Este archivo solo crea estructura de base de datos.
-- =========================================================

begin;

-- Recomendado para UUIDs
create extension if not exists pgcrypto;

-- =========================================================
-- Tipos enumerados
-- =========================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sexo_tipo') then
    create type sexo_tipo as enum ('femenino', 'masculino', 'otro');
  end if;

  if not exists (select 1 from pg_type where typname = 'nivel_lesion_tipo') then
    create type nivel_lesion_tipo as enum ('toracica', 'lumbar', 'sacra');
  end if;

  if not exists (select 1 from pg_type where typname = 'manejo_vesical_tipo') then
    create type manejo_vesical_tipo as enum ('cateterismo_intermitente', 'sonda_permanente');
  end if;

  if not exists (select 1 from pg_type where typname = 'actor_procedimiento_tipo') then
    create type actor_procedimiento_tipo as enum ('paciente', 'cuidador');
  end if;

  if not exists (select 1 from pg_type where typname = 'nivel_alerta_tipo') then
    create type nivel_alerta_tipo as enum ('amarilla', 'roja');
  end if;

  if not exists (select 1 from pg_type where typname = 'riesgo_tipo') then
    create type riesgo_tipo as enum ('bajo', 'moderado', 'alto');
  end if;

  if not exists (select 1 from pg_type where typname = 'destino_alerta_tipo') then
    create type destino_alerta_tipo as enum ('paciente', 'cuidador');
  end if;

  if not exists (select 1 from pg_type where typname = 'estado_alerta_tipo') then
    create type estado_alerta_tipo as enum ('activa', 'confirmada', 'resuelta');
  end if;
end
$$;

-- =========================================================
-- Utilidades
-- =========================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function generar_codigo_vinculacion()
returns text
language plpgsql
as $$
declare
  codigo text;
begin
  loop
    codigo := 'PAC-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from pacientes where codigo_vinculacion = codigo);
  end loop;

  return codigo;
end;
$$;

-- =========================================================
-- Tablas principales
-- =========================================================

create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  edad integer not null check (edad >= 1 and edad <= 120),
  sexo sexo_tipo not null,
  nivel_lesion nivel_lesion_tipo not null,
  tipo_manejo_vesical manejo_vesical_tipo not null,
  tiene_cuidador boolean not null default false,
  codigo_vinculacion text unique,
  cuidador_vinculado boolean not null default false,
  onboarding_completado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pacientes_codigo_requerido_si_tiene_cuidador check (
    (tiene_cuidador = false and codigo_vinculacion is null)
    or
    (tiene_cuidador = true and codigo_vinculacion is not null)
  )
);

create table if not exists cuidadores (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  telefono text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vinculacion entre paciente y cuidador.
-- Permite historial de vinculaciones y marcar cual esta activa.
create table if not exists paciente_cuidador (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  cuidador_id uuid not null references cuidadores(id) on delete cascade,
  codigo_vinculacion_usado text not null,
  activo boolean not null default true,
  vinculado_en timestamptz not null default now(),
  desvinculado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint paciente_cuidador_unico_activo unique (paciente_id, cuidador_id, activo)
);

-- Estado operativo del paciente para horarios y riesgo actual.
create table if not exists estado_vesical_paciente (
  paciente_id uuid primary key references pacientes(id) on delete cascade,
  ultima_confirmacion_en timestamptz,
  siguiente_procedimiento_en timestamptz,
  riesgo_actual riesgo_tipo not null default 'bajo',
  minutos_intervalo integer not null default 240 check (minutos_intervalo > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Historial de hidratacion del paciente.
create table if not exists hidratacion_registros (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  cantidad_ml integer not null check (cantidad_ml > 0),
  origen text not null default 'boton_rapido',
  registrado_en timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Historial de procedimientos confirmados (paciente o cuidador).
create table if not exists procedimiento_registros (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  actor actor_procedimiento_tipo not null,
  checklist_lavado_manos boolean not null,
  checklist_material_limpio boolean not null,
  checklist_tecnica_correcta boolean not null,
  notas text,
  confirmado_en timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint procedimiento_checklist_completo check (
    checklist_lavado_manos = true
    and checklist_material_limpio = true
    and checklist_tecnica_correcta = true
  )
);

-- Historial de alertas generadas por retraso.
create table if not exists alertas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  cuidador_id uuid references cuidadores(id) on delete set null,
  nivel nivel_alerta_tipo not null,
  riesgo riesgo_tipo not null,
  destino destino_alerta_tipo not null,
  mensaje text not null,
  estado estado_alerta_tipo not null default 'activa',
  retraso_minutos integer not null default 0,
  disparada_en timestamptz not null default now(),
  confirmada_en timestamptz,
  resuelta_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Indices
-- =========================================================

create index if not exists idx_pacientes_codigo_vinculacion
  on pacientes(codigo_vinculacion);

create index if not exists idx_hidratacion_paciente_fecha
  on hidratacion_registros(paciente_id, registrado_en desc);

create index if not exists idx_procedimiento_paciente_fecha
  on procedimiento_registros(paciente_id, confirmado_en desc);

create index if not exists idx_alertas_paciente_estado_fecha
  on alertas(paciente_id, estado, disparada_en desc);

create index if not exists idx_alertas_destino_estado
  on alertas(destino, estado);

-- =========================================================
-- Triggers updated_at
-- =========================================================

drop trigger if exists trg_pacientes_updated_at on pacientes;
create trigger trg_pacientes_updated_at
before update on pacientes
for each row
execute function set_updated_at();

drop trigger if exists trg_cuidadores_updated_at on cuidadores;
create trigger trg_cuidadores_updated_at
before update on cuidadores
for each row
execute function set_updated_at();

drop trigger if exists trg_paciente_cuidador_updated_at on paciente_cuidador;
create trigger trg_paciente_cuidador_updated_at
before update on paciente_cuidador
for each row
execute function set_updated_at();

drop trigger if exists trg_estado_vesical_paciente_updated_at on estado_vesical_paciente;
create trigger trg_estado_vesical_paciente_updated_at
before update on estado_vesical_paciente
for each row
execute function set_updated_at();

drop trigger if exists trg_alertas_updated_at on alertas;
create trigger trg_alertas_updated_at
before update on alertas
for each row
execute function set_updated_at();

-- =========================================================
-- Vista util para dashboard de cuidador (solo lectura)
-- =========================================================

create or replace view v_resumen_monitoreo_cuidador as
select
  p.id as paciente_id,
  p.nombre,
  p.tipo_manejo_vesical,
  e.ultima_confirmacion_en,
  e.siguiente_procedimiento_en,
  e.riesgo_actual,
  coalesce(h.consumo_hoy_ml, 0) as hidratacion_hoy_ml,
  coalesce(a.alertas_activas, 0) as alertas_activas
from pacientes p
left join estado_vesical_paciente e on e.paciente_id = p.id
left join (
  select
    paciente_id,
    sum(cantidad_ml)::int as consumo_hoy_ml
  from hidratacion_registros
  where registrado_en::date = now()::date
  group by paciente_id
) h on h.paciente_id = p.id
left join (
  select
    paciente_id,
    count(*)::int as alertas_activas
  from alertas
  where estado = 'activa'
  group by paciente_id
) a on a.paciente_id = p.id;

-- =========================================================
-- Nota de seguridad
-- =========================================================
-- Si luego usas auth de Supabase con clientes web, habilita RLS
-- y crea politicas por usuario/rol antes de exponer tablas.

commit;
