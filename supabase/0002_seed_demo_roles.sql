-- Credenciales demo en espanol
-- Password: [rol]123

insert into public.app_users (
  email,
  password_hash,
  role,
  full_name,
  sex,
  lesion_level,
  bladder_management_type,
  has_caregiver,
  timezone
)
values
  (
    'paciente@ejemplo.com',
    crypt('paciente123', gen_salt('bf', 10)),
    'patient',
    'Paciente Demo',
    'male',
    'thoracic',
    'intermittent_catheterization',
    true,
    'UTC'
  ),
  (
    'cuidador@ejemplo.com',
    crypt('cuidador123', gen_salt('bf', 10)),
    'caregiver',
    'Cuidador Demo',
    'female',
    'lumbar',
    'indwelling_catheter',
    false,
    'UTC'
  ),
  (
    'clinico@ejemplo.com',
    crypt('clinico123', gen_salt('bf', 10)),
    'clinician',
    'Clinico Demo',
    'other',
    'sacral',
    'condom_catheter',
    false,
    'UTC'
  ),
  (
    'admin@ejemplo.com',
    crypt('admin123', gen_salt('bf', 10)),
    'admin',
    'Admin Demo',
    'other',
    'lumbar',
    'indwelling_catheter',
    false,
    'UTC'
  )
on conflict (email) do update
set
  password_hash = excluded.password_hash,
  role = excluded.role,
  full_name = excluded.full_name,
  sex = excluded.sex,
  lesion_level = excluded.lesion_level,
  bladder_management_type = excluded.bladder_management_type,
  has_caregiver = excluded.has_caregiver,
  timezone = excluded.timezone,
  updated_at = now();

insert into public.caregiver_links (
  patient_id,
  caregiver_id,
  can_view_risk,
  can_log_events,
  can_receive_alerts,
  active
)
select
  p.id,
  c.id,
  true,
  true,
  true,
  true
from public.app_users p
join public.app_users c
  on c.email = 'cuidador@ejemplo.com'
where p.email = 'paciente@ejemplo.com'
on conflict (patient_id, caregiver_id) do nothing;
