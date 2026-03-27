const { connectDatabase } = require("../config/database");

const META_HIDRATACION_ML = 2000;
const INTERVALO_CATETERISMO_MINUTOS = 4 * 60;
const INTERVALO_BOLSA_MINUTOS = 8 * 60;
const MS_POR_HORA = 60 * 60 * 1000;
const MS_POR_DIA = 24 * MS_POR_HORA;
const HORA_SILENCIO_INICIO = 22;
const HORA_SILENCIO_FIN = 7;

function db() {
  return connectDatabase();
}

function getIntervaloMinutos(tipoManejoVesical) {
  if (tipoManejoVesical === "sonda_permanente") {
    return INTERVALO_BOLSA_MINUTOS;
  }
  return INTERVALO_CATETERISMO_MINUTOS;
}

function addMinutesToIso(fecha, minutos) {
  return new Date(fecha.getTime() + minutos * 60 * 1000).toISOString();
}

function buildEmptyResumen() {
  return {
    onboardingCompleto: false,
    paciente: null,
    cuidadorVinculado: false,
    codigoVinculacion: null,
    hidratacion: {
      metaMl: META_HIDRATACION_ML,
      consumidoMl: 0,
      progreso: 0,
      historial: [],
    },
    ultimaConfirmacion: null,
    siguienteProcedimiento: null,
    alertasActivas: [],
  };
}

function toError(message, originalError) {
  const detail = originalError?.message ? `: ${originalError.message}` : "";
  const error = new Error(`${message}${detail}`);
  error.cause = originalError;
  return error;
}

function mapAlerta(item) {
  return {
    id: item.id,
    tipo: item.tipo,
    nivel: item.nivel,
    mensaje: item.mensaje,
    riesgo: item.riesgo,
    fechaHora: item.disparada_en,
    para: item.destino,
    activa: item.estado === "activa",
  };
}

function getDiaInicio(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calcularDiasRestantes(fechaObjetivo, now = new Date()) {
  const objetivo = getDiaInicio(fechaObjetivo).getTime();
  const hoy = getDiaInicio(now).getTime();
  return Math.floor((objetivo - hoy) / MS_POR_DIA);
}

function estaEnSilencioNocturno(now = new Date()) {
  const hora = now.getHours();
  return hora >= HORA_SILENCIO_INICIO || hora < HORA_SILENCIO_FIN;
}

function generarCodigoBase() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  for (let i = 0; i < 4; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

async function generarCodigoVinculacion() {
  for (let i = 0; i < 20; i++) {
    const codigo = generarCodigoBase();
    const { data, error } = await db()
      .from("pacientes")
      .select("id")
      .eq("codigo_vinculacion", codigo)
      .limit(1);

    if (error) {
      throw toError("No se pudo validar codigo de vinculacion", error);
    }

    if (!data || data.length === 0) {
      return codigo;
    }
  }

  throw new Error("No se pudo generar un codigo de vinculacion unico");
}

function normalizarCodigoVinculacion(codigo) {
  const normalizado = String(codigo || "").trim().toUpperCase();
  if (normalizado.startsWith("PAC-")) {
    return normalizado.slice(4);
  }
  return normalizado;
}

async function getPacienteActivo() {
  const { data, error } = await db()
    .from("pacientes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toError("No se pudo obtener paciente activo", error);
  }

  return data || null;
}

async function getAllPacientes() {
  const { data, error } = await db().from("pacientes").select("*");

  if (error) {
    throw toError("No se pudo obtener pacientes", error);
  }

  return data || [];
}

async function getEstadoPaciente(pacienteId) {
  const { data, error } = await db()
    .from("estado_vesical_paciente")
    .select("*")
    .eq("paciente_id", pacienteId)
    .maybeSingle();

  if (error) {
    throw toError("No se pudo obtener estado vesical", error);
  }

  return data || null;
}

async function getHidratacionDelDia(pacienteId) {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const { data, error } = await db()
    .from("hidratacion_registros")
    .select("cantidad_ml, registrado_en")
    .eq("paciente_id", pacienteId)
    .gte("registrado_en", inicio.toISOString())
    .order("registrado_en", { ascending: false });

  if (error) {
    throw toError("No se pudo obtener hidratacion", error);
  }

  const historial = (data || []).map((item) => ({
    ml: item.cantidad_ml,
    fechaHora: item.registrado_en,
  }));

  const consumidoMl = historial.reduce((sum, item) => sum + Number(item.ml), 0);
  const progreso = Math.min(100, Math.round((consumidoMl / META_HIDRATACION_ML) * 100));

  return {
    metaMl: META_HIDRATACION_ML,
    consumidoMl,
    progreso,
    historial,
  };
}

async function getUltimoRegistroHidratacion(pacienteId) {
  const { data, error } = await db()
    .from("hidratacion_registros")
    .select("registrado_en")
    .eq("paciente_id", pacienteId)
    .order("registrado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toError("No se pudo obtener ultimo registro de hidratacion", error);
  }

  return data || null;
}

async function getAlertasActivasByPacienteId(pacienteId) {
  const { data, error } = await db()
    .from("alertas")
    .select("*")
    .eq("paciente_id", pacienteId)
    .eq("estado", "activa")
    .order("disparada_en", { ascending: false });

  if (error) {
    throw toError("No se pudieron obtener alertas activas", error);
  }

  return (data || []).map(mapAlerta);
}

async function ensureNoDuplicatedActiveAlert(pacienteId, nivel, destino, tipo = null) {
  let query = db()
    .from("alertas")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("nivel", nivel)
    .eq("destino", destino)
    .eq("estado", "activa")
    .limit(1);

  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  const { data, error } = await query;

  if (error) {
    throw toError("No se pudo validar alerta duplicada", error);
  }

  return Boolean(data && data.length > 0);
}

async function insertAlerta(payload) {
  const { error } = await db().from("alertas").insert(payload);
  if (error) {
    throw toError("No se pudo crear alerta", error);
  }
}

async function upsertRiesgo(pacienteId, riesgo) {
  const { error } = await db()
    .from("estado_vesical_paciente")
    .update({ riesgo_actual: riesgo })
    .eq("paciente_id", pacienteId);

  if (error) {
    throw toError("No se pudo actualizar riesgo", error);
  }
}

async function resolverAlertasActivas(pacienteId, estadoFinal = "resuelta") {
  const payload =
    estadoFinal === "confirmada"
      ? { estado: "confirmada", confirmada_en: new Date().toISOString() }
      : { estado: "resuelta", resuelta_en: new Date().toISOString() };

  const { error } = await db()
    .from("alertas")
    .update(payload)
    .eq("paciente_id", pacienteId)
    .eq("estado", "activa");

  if (error) {
    throw toError("No se pudieron resolver alertas", error);
  }
}

async function resolverAlertasActivasByTipo(pacienteId, tipo, estadoFinal = "resuelta") {
  const payload =
    estadoFinal === "confirmada"
      ? { estado: "confirmada", confirmada_en: new Date().toISOString() }
      : { estado: "resuelta", resuelta_en: new Date().toISOString() };

  const { error } = await db()
    .from("alertas")
    .update(payload)
    .eq("paciente_id", pacienteId)
    .eq("tipo", tipo)
    .eq("estado", "activa");

  if (error) {
    throw toError("No se pudieron resolver alertas por tipo", error);
  }
}

async function getActiveLinkByPacienteId(pacienteId) {
  const { data, error } = await db()
    .from("paciente_cuidador")
    .select("*")
    .eq("paciente_id", pacienteId)
    .eq("activo", true)
    .order("vinculado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw toError("No se pudo obtener vinculacion activa", error);
  }

  return data || null;
}

async function recalcularAlertasPaciente(paciente) {
  const estado = await getEstadoPaciente(paciente.id);
  if (!estado || !estado.siguiente_procedimiento_en) {
    return [];
  }

  const now = Date.now();
  const expected = new Date(estado.siguiente_procedimiento_en).getTime();
  const delayMs = now - expected;
  const delayMinutes = Math.max(0, Math.floor(delayMs / (60 * 1000)));

  if (delayMs < MS_POR_HORA) {
    await upsertRiesgo(paciente.id, "bajo");
    await resolverAlertasActivasByTipo(paciente.id, "procedimiento", "resuelta");
    return [];
  }

  await upsertRiesgo(paciente.id, delayMs >= 2 * MS_POR_HORA ? "alto" : "moderado");

  const existsYellow = await ensureNoDuplicatedActiveAlert(
    paciente.id,
    "amarilla",
    "paciente",
    "procedimiento"
  );
  if (!existsYellow) {
    await insertAlerta({
      paciente_id: paciente.id,
      tipo: "procedimiento",
      nivel: "amarilla",
      riesgo: "moderado",
      destino: "paciente",
      mensaje: "Atencion: Tienes 1 hora de retraso en tu procedimiento",
      retraso_minutos: delayMinutes,
      estado: "activa",
    });
  }

  if (delayMs >= 2 * MS_POR_HORA) {
    const existsRedPatient = await ensureNoDuplicatedActiveAlert(
      paciente.id,
      "roja",
      "paciente",
      "procedimiento"
    );

    if (!existsRedPatient) {
      await insertAlerta({
        paciente_id: paciente.id,
        tipo: "procedimiento",
        nivel: "roja",
        riesgo: "alto",
        destino: "paciente",
        mensaje: "Peligro: Alto riesgo de infeccion. Realiza el procedimiento de inmediato",
        retraso_minutos: delayMinutes,
        estado: "activa",
      });
    }

    if (paciente.cuidador_vinculado) {
      const link = await getActiveLinkByPacienteId(paciente.id);
      const existsRedCaregiver = await ensureNoDuplicatedActiveAlert(
        paciente.id,
        "roja",
        "cuidador",
        "procedimiento"
      );

      if (!existsRedCaregiver) {
        await insertAlerta({
          paciente_id: paciente.id,
          cuidador_id: link?.cuidador_id || null,
          tipo: "procedimiento",
          nivel: "roja",
          riesgo: "alto",
          destino: "cuidador",
          mensaje: "Alerta roja del paciente vinculado. Intervencion recomendada",
          retraso_minutos: delayMinutes,
          estado: "activa",
        });
      }
    }
  }

  return getAlertasActivasByPacienteId(paciente.id);
}

async function recalcularRecordatoriosCambioSonda(paciente) {
  if (paciente.tipo_manejo_vesical !== "sonda_permanente") {
    await resolverAlertasActivasByTipo(paciente.id, "sonda", "resuelta");
    return;
  }

  const frecuenciaDias = [14, 30].includes(Number(paciente.frecuencia_cambio_sonda_dias))
    ? Number(paciente.frecuencia_cambio_sonda_dias)
    : 30;
  const fechaBaseIso = paciente.fecha_ultimo_cambio_sonda || paciente.onboarding_completado_en;
  const fechaBase = new Date(fechaBaseIso);
  const siguienteCambio = new Date(fechaBase.getTime() + frecuenciaDias * MS_POR_DIA);
  const diasRestantes = calcularDiasRestantes(siguienteCambio);

  if (diasRestantes > 3) {
    await resolverAlertasActivasByTipo(paciente.id, "sonda", "resuelta");
    return;
  }

  if (diasRestantes === 3) {
    const existeAlertaPrev = await ensureNoDuplicatedActiveAlert(
      paciente.id,
      "amarilla",
      "paciente",
      "sonda"
    );

    if (!existeAlertaPrev) {
      await insertAlerta({
        paciente_id: paciente.id,
        tipo: "sonda",
        nivel: "amarilla",
        riesgo: "moderado",
        destino: "paciente",
        mensaje: "Se acerca el cambio de sonda. Faltan 3 dias para el recambio",
        retraso_minutos: 0,
        estado: "activa",
      });
    }
    return;
  }

  const existeAlertaDia = await ensureNoDuplicatedActiveAlert(
    paciente.id,
    "roja",
    "paciente",
    "sonda"
  );

  if (!existeAlertaDia) {
    await insertAlerta({
      paciente_id: paciente.id,
      tipo: "sonda",
      nivel: "roja",
      riesgo: "alto",
      destino: "paciente",
      mensaje: "Hoy corresponde cambio de sonda permanente (Foley)",
      retraso_minutos: 0,
      estado: "activa",
    });
  }
}

async function recalcularRecordatoriosAgua(paciente) {
  if (estaEnSilencioNocturno()) {
    await resolverAlertasActivasByTipo(paciente.id, "hidratacion", "resuelta");
    return;
  }

  const ultimoRegistro = await getUltimoRegistroHidratacion(paciente.id);
  const referenciaIso = ultimoRegistro?.registrado_en || paciente.onboarding_completado_en;
  const transcurridoMs = Date.now() - new Date(referenciaIso).getTime();

  if (transcurridoMs < 3 * MS_POR_HORA) {
    await resolverAlertasActivasByTipo(paciente.id, "hidratacion", "resuelta");
    return;
  }

  if (transcurridoMs >= 4 * MS_POR_HORA) {
    const existeRoja = await ensureNoDuplicatedActiveAlert(
      paciente.id,
      "roja",
      "paciente",
      "hidratacion"
    );

    if (!existeRoja) {
      await insertAlerta({
        paciente_id: paciente.id,
        tipo: "hidratacion",
        nivel: "roja",
        riesgo: "alto",
        destino: "paciente",
        mensaje: "Han pasado 4 horas sin registrar agua. Toma agua ahora",
        retraso_minutos: Math.floor(transcurridoMs / (60 * 1000)),
        estado: "activa",
      });
    }
    return;
  }

  const existeAmarilla = await ensureNoDuplicatedActiveAlert(
    paciente.id,
    "amarilla",
    "paciente",
    "hidratacion"
  );

  if (!existeAmarilla) {
    await insertAlerta({
      paciente_id: paciente.id,
      tipo: "hidratacion",
      nivel: "amarilla",
      riesgo: "moderado",
      destino: "paciente",
      mensaje: "Es hora de tomar agua. Ya pasaron 3 horas sin registro",
      retraso_minutos: Math.floor(transcurridoMs / (60 * 1000)),
      estado: "activa",
    });
  }
}

async function iniciarPaciente(data) {
  const tieneCuidador = Boolean(data.tieneCuidador);
  const codigoVinculacion = await generarCodigoVinculacion();
  const intervalo = getIntervaloMinutos(data.tipoManejo);
  const now = new Date();
  const siguiente = addMinutesToIso(now, intervalo);
  const esSondaPermanente = data.tipoManejo === "sonda_permanente";
  const frecuenciaSondaDias = [14, 30].includes(Number(data.frecuenciaCambioSondaDias))
    ? Number(data.frecuenciaCambioSondaDias)
    : 30;
  const fechaUltimoCambioSonda = esSondaPermanente
    ? new Date(data.fechaUltimoCambioSonda || now.toISOString()).toISOString()
    : null;

  const { data: paciente, error: pacienteError } = await db()
    .from("pacientes")
    .insert({
      nombre: data.nombre,
      edad: Number(data.edad),
      sexo: data.sexo,
      nivel_lesion: data.nivelLesion,
      tipo_manejo_vesical: data.tipoManejo,
      tiene_cuidador: tieneCuidador,
      codigo_vinculacion: codigoVinculacion,
      frecuencia_cambio_sonda_dias: esSondaPermanente ? frecuenciaSondaDias : null,
      fecha_ultimo_cambio_sonda: fechaUltimoCambioSonda,
      cuidador_vinculado: false,
      onboarding_completado_en: now.toISOString(),
    })
    .select("*")
    .single();

  if (pacienteError) {
    throw toError("No se pudo crear paciente", pacienteError);
  }

  const { error: estadoError } = await db().from("estado_vesical_paciente").insert({
    paciente_id: paciente.id,
    ultima_confirmacion_en: now.toISOString(),
    siguiente_procedimiento_en: siguiente,
    riesgo_actual: "bajo",
    minutos_intervalo: intervalo,
  });

  if (estadoError) {
    throw toError("No se pudo crear estado vesical", estadoError);
  }

  return {
    perfil: {
      id: paciente.id,
      nombre: paciente.nombre,
      edad: paciente.edad,
      sexo: paciente.sexo,
      nivelLesion: paciente.nivel_lesion,
      tipoManejo: paciente.tipo_manejo_vesical,
      tieneCuidador: paciente.tiene_cuidador,
      frecuenciaCambioSondaDias: paciente.frecuencia_cambio_sonda_dias,
      fechaUltimoCambioSonda: paciente.fecha_ultimo_cambio_sonda,
    },
    codigoVinculacion,
    siguienteProcedimiento: siguiente,
  };
}

async function vincularCuidador(codigo) {
  const codigoNormalizado = normalizarCodigoVinculacion(codigo);

  const { data: paciente, error: pacienteError } = await db()
    .from("pacientes")
    .select("*")
    .eq("codigo_vinculacion", codigoNormalizado)
    .maybeSingle();

  if (pacienteError) {
    throw toError("No se pudo validar codigo de vinculacion", pacienteError);
  }

  if (!paciente) {
    return { ok: false, mensaje: "Codigo de vinculacion invalido" };
  }

  const existingLink = await getActiveLinkByPacienteId(paciente.id);

  if (existingLink) {
    await db().from("pacientes").update({ cuidador_vinculado: true }).eq("id", paciente.id);
    return { ok: true, mensaje: "Cuidador ya vinculado para este paciente" };
  }

  const { data: cuidador, error: cuidadorError } = await db()
    .from("cuidadores")
    .insert({ nombre: "Cuidador vinculado" })
    .select("*")
    .single();

  if (cuidadorError) {
    throw toError("No se pudo crear cuidador", cuidadorError);
  }

  const { error: linkError } = await db().from("paciente_cuidador").insert({
    paciente_id: paciente.id,
    cuidador_id: cuidador.id,
    codigo_vinculacion_usado: codigoNormalizado,
    activo: true,
  });

  if (linkError) {
    throw toError("No se pudo vincular cuidador", linkError);
  }

  const { error: updatePacienteError } = await db()
    .from("pacientes")
    .update({ cuidador_vinculado: true, tiene_cuidador: true })
    .eq("id", paciente.id);

  if (updatePacienteError) {
    throw toError("No se pudo actualizar paciente", updatePacienteError);
  }

  return { ok: true, mensaje: "Cuidador vinculado correctamente" };
}

async function obtenerEstadoHidratacion() {
  const paciente = await getPacienteActivo();

  if (!paciente) {
    return buildEmptyResumen().hidratacion;
  }

  return getHidratacionDelDia(paciente.id);
}

async function registrarAgua(mililitros) {
  const paciente = await getPacienteActivo();

  if (!paciente) {
    throw new Error("No hay paciente registrado");
  }

  const { error } = await db().from("hidratacion_registros").insert({
    paciente_id: paciente.id,
    cantidad_ml: Number(mililitros),
    origen: "boton_rapido",
  });

  if (error) {
    throw toError("No se pudo registrar hidratacion", error);
  }

  await resolverAlertasActivasByTipo(paciente.id, "hidratacion", "resuelta");

  return getHidratacionDelDia(paciente.id);
}

async function confirmarProcedimiento({ checklist, actor }) {
  const allChecked = checklist && checklist.lavadoManos && checklist.materialLimpio && checklist.tecnicaCorrecta;
  if (!allChecked) {
    return { ok: false, mensaje: "Debes completar el checklist obligatorio" };
  }

  const paciente = await getPacienteActivo();

  if (!paciente) {
    return { ok: false, mensaje: "No hay paciente registrado" };
  }

  const now = new Date();
  const intervalo = getIntervaloMinutos(paciente.tipo_manejo_vesical);
  const siguiente = addMinutesToIso(now, intervalo);

  const { error: procError } = await db().from("procedimiento_registros").insert({
    paciente_id: paciente.id,
    actor,
    checklist_lavado_manos: true,
    checklist_material_limpio: true,
    checklist_tecnica_correcta: true,
    confirmado_en: now.toISOString(),
  });

  if (procError) {
    throw toError("No se pudo confirmar procedimiento", procError);
  }

  const { error: estadoError } = await db()
    .from("estado_vesical_paciente")
    .update({
      ultima_confirmacion_en: now.toISOString(),
      siguiente_procedimiento_en: siguiente,
      riesgo_actual: "bajo",
    })
    .eq("paciente_id", paciente.id);

  if (estadoError) {
    throw toError("No se pudo actualizar estado vesical", estadoError);
  }

  await resolverAlertasActivasByTipo(paciente.id, "procedimiento", "resuelta");

  return {
    ok: true,
    data: {
      ultimaConfirmacion: now.toISOString(),
      siguienteProcedimiento: siguiente,
    },
  };
}

async function recalcularAlertas() {
  const pacientes = await getAllPacientes();

  let total = 0;
  for (const paciente of pacientes) {
    await recalcularAlertasPaciente(paciente);
    await recalcularRecordatoriosCambioSonda(paciente);
    await recalcularRecordatoriosAgua(paciente);
    const activas = await getAlertasActivasByPacienteId(paciente.id);
    total += activas.length;
  }

  return { totalAlertasActivas: total };
}

async function obtenerAlertasActivas() {
  const paciente = await getPacienteActivo();

  if (!paciente) {
    return [];
  }

  await recalcularAlertasPaciente(paciente);
  await recalcularRecordatoriosCambioSonda(paciente);
  await recalcularRecordatoriosAgua(paciente);
  return getAlertasActivasByPacienteId(paciente.id);
}

async function confirmarAlertas() {
  const paciente = await getPacienteActivo();

  if (!paciente) {
    return { ok: true, mensaje: "Sin paciente activo" };
  }

  await resolverAlertasActivas(paciente.id, "confirmada");
  return { ok: true, mensaje: "Alertas confirmadas" };
}

async function crearAlertaSimulada({ tipo = "hidratacion", nivel = "amarilla", mensaje, destino = "paciente" }) {
  const paciente = await getPacienteActivo();

  if (!paciente) {
    return { ok: false, mensaje: "No hay paciente activo" };
  }

  const riesgo = nivel === "roja" ? "alto" : "moderado";
  const texto =
    mensaje ||
    (tipo === "sonda"
      ? "Simulacion: Hoy corresponde cambio de sonda"
      : tipo === "procedimiento"
        ? "Simulacion: Retraso en procedimiento vesical"
        : "Simulacion: Es hora de tomar agua");

  await insertAlerta({
    paciente_id: paciente.id,
    tipo: `simulada_${tipo}`,
    nivel,
    riesgo,
    destino,
    mensaje: texto,
    retraso_minutos: 0,
    estado: "activa",
  });

  return { ok: true, mensaje: "Alerta simulada creada" };
}

async function obtenerResumen() {
  const paciente = await getPacienteActivo();

  if (!paciente) {
    return buildEmptyResumen();
  }

  await recalcularAlertasPaciente(paciente);
  await recalcularRecordatoriosCambioSonda(paciente);
  await recalcularRecordatoriosAgua(paciente);

  const hidratacion = await getHidratacionDelDia(paciente.id);
  const estado = await getEstadoPaciente(paciente.id);
  const alertasActivas = await getAlertasActivasByPacienteId(paciente.id);

  return {
    onboardingCompleto: true,
    paciente: {
      id: paciente.id,
      nombre: paciente.nombre,
      edad: paciente.edad,
      sexo: paciente.sexo,
      nivelLesion: paciente.nivel_lesion,
      tipoManejo: paciente.tipo_manejo_vesical,
      tieneCuidador: paciente.tiene_cuidador,
      frecuenciaCambioSondaDias: paciente.frecuencia_cambio_sonda_dias,
      fechaUltimoCambioSonda: paciente.fecha_ultimo_cambio_sonda,
    },
    cuidadorVinculado: paciente.cuidador_vinculado,
    codigoVinculacion: paciente.codigo_vinculacion,
    hidratacion,
    ultimaConfirmacion: estado?.ultima_confirmacion_en || null,
    siguienteProcedimiento: estado?.siguiente_procedimiento_en || null,
    alertasActivas,
  };
}

module.exports = {
  iniciarPaciente,
  vincularCuidador,
  obtenerResumen,
  registrarAgua,
  obtenerEstadoHidratacion,
  confirmarProcedimiento,
  recalcularAlertas,
  obtenerAlertasActivas,
  confirmarAlertas,
  crearAlertaSimulada,
};
