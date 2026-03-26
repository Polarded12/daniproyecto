-- Verifica permisos del rol service_role en tablas clave
select
  table_name,
  has_table_privilege('service_role', format('public.%I', table_name), 'select') as can_select,
  has_table_privilege('service_role', format('public.%I', table_name), 'insert') as can_insert,
  has_table_privilege('service_role', format('public.%I', table_name), 'update') as can_update,
  has_table_privilege('service_role', format('public.%I', table_name), 'delete') as can_delete
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'pacientes',
    'cuidadores',
    'paciente_cuidador',
    'estado_vesical_paciente',
    'hidratacion_registros',
    'procedimiento_registros',
    'alertas'
  )
order by table_name;
