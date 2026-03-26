const store = require("./sessionStore");

const META_HIDRATACION_ML = 2000;
const INTERVALO_CATETERISMO_MINUTOS = 4 * 60;
const INTERVALO_BOLSA_MINUTOS = 8 * 60;
const MS_POR_HORA = 60 * 60 * 1000;
const MS_POR_DIA = 24 * MS_POR_HORA;
const HORA_SILENCIO_INICIO = 22;
const HORA_SILENCIO_FIN = 7;

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

async function generarCodigoVinculacion() {
  return store.generar0000CodigoVinculacion();
}

function normalizarCodigoVinculacion(codigo) {
  const normalizado = String(codigo || "").trim().toUpperCase();
  if (normalizado.startsWith("PAC-")) {
    return normalizado.slice(4);
  }
  return normalizado;
}

function getPacienteActivo() {
  return store.getLastPaciente();
}

function getEstadoPaciente(pacienteId) {
  return store.getEstadoByPacienteId(pacienteId);
}

function getHidratacionDelDia(pacienteId) {
  const historial = store.getHidratacionDelDia(pacienteId).map((item) => ({
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

function getAlertasActivasByPacienteId(pacienteId) {
  return store.getAlertasActivasByPacienteId(pacienteId).map(mapAlerta);
}

function ensureNoDuplicatedActiveAlert(pacienteId, nivel, destino, tipo = null) {
  const existing = store.findActiveAlerta(pacienteId, nivel, destino, tipo);
  return Boolean(existing);
}

function insertAlerta(payload) {
  store.insertAlerta(payload);
}

function upsertRiesgo(pacienteId, riesgo) {
  store.updateEstadoVesical(pacienteId, { riesgo_actual: riesgo });
}

function resolverAlertasActivas(pacienteId, estadoFinal = "resuelta") {
  const payload =
    estadoFinal === "confirmada"
      ? { estado: "confirmada", confirmada_en: new Date().toISOString() }
      : { estado: "resuelta", resuelta_en: new Date().toISOString() };

  store.updateAlertasByPacienteId(pacienteId, payload);
}

function resolverAlertasActivasByTipo(pacienteId, tipo, estadoFinal = "resuelta") {
  const payload =
    estadoFinal === "confirmada"
      ? { estado: "confirmada", confirmada_en: new Date().toISOString() }
      : { estado: "resuelta", resuelta_en: new Date().toISOString() };

  store.updateAlertasActivasByPacienteIdAndTipo(pacienteId, tipo, payload);
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

function recalcularAlertasPaciente(paciente) {
  const estado = getEstadoPaciente(paciente.id);
  if (!estado || !estado.siguiente_procedimiento_en) {
    return [];
  }

  const now = Date.now();
  const expected = new Date(estado.siguiente_procedimiento_en).getTime();
  const delayMs = now - expected;
  const delayMinutes = Math.max(0, Math.floor(delayMs / (60 * 1000)));

  if (delayMs < MS_POR_HORA) {
    upsertRiesgo(paciente.id, "bajo");
    resolverAlertasActivasByTipo(paciente.id, "procedimiento", "resuelta");
    return [];
  }

  upsertRiesgo(
    paciente.id,
    delayMs >= 2 * MS_POR_HORA ? "alto" : "moderado"
  );

  const existsYellow = ensureNoDuplicatedActiveAlert(paciente.id, "amarilla", "paciente", "procedimiento");
  if (!existsYellow) {
    insertAlerta({
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
    const existsRedPatient = ensureNoDuplicatedActiveAlert(
      paciente.id,
      "roja",
      "paciente",
      "procedimiento"
    );
    if (!existsRedPatient) {
      insertAlerta({
        paciente_id: paciente.id,
        tipo: "procedimiento",
        nivel: "roja",
        riesgo: "alto",
        destino: "paciente",
        mensaje:
          "Peligro: Alto riesgo de infeccion. Realiza el procedimiento de inmediato",
        retraso_minutos: delayMinutes,
        estado: "activa",
      });
    }

    if (paciente.cuidador_vinculado) {
      const link = store.getActiveLinkByPacienteId(paciente.id);

      const existsRedCaregiver = ensureNoDuplicatedActiveAlert(
        paciente.id,
        "roja",
        "cuidador",
        "procedimiento"
      );
      if (!existsRedCaregiver) {
        insertAlerta({
          paciente_id: paciente.id,
          cuidador_id: link?.cuidador_id || null,
          tipo: "procedimiento",
          nivel: "roja",
          riesgo: "alto",
          destino: "cuidador",
          mensaje:
            "Alerta roja del paciente vinculado. Intervencion recomendada",
          retraso_minutos: delayMinutes,
          estado: "activa",
        });
      }
    }
  }

  return getAlertasActivasByPacienteId(paciente.id);
}

function recalcularRecordatoriosCambioSonda(paciente) {
  if (paciente.tipo_manejo_vesical !== "sonda_permanente") {
    resolverAlertasActivasByTipo(paciente.id, "sonda", "resuelta");
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
    resolverAlertasActivasByTipo(paciente.id, "sonda", "resuelta");
    return;
  }

  if (diasRestantes === 3) {
    const existeAlertaPrev = ensureNoDuplicatedActiveAlert(
      paciente.id,
      "amarilla",
      "paciente",
      "sonda"
    );
    if (!existeAlertaPrev) {
      insertAlerta({
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

  const existeAlertaDia = ensureNoDuplicatedActiveAlert(
    paciente.id,
    "roja",
    "paciente",
    "sonda"
  );

  if (!existeAlertaDia) {
    insertAlerta({
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

function recalcularRecordatoriosAgua(paciente) {
  if (estaEnSilencioNocturno()) {
    resolverAlertasActivasByTipo(paciente.id, "hidratacion", "resuelta");
    return;
  }

  const ultimoRegistro = store.getUltimoRegistroHidratacion(paciente.id);
  const referenciaIso = ultimoRegistro?.registrado_en || paciente.onboarding_completado_en;
  const transcurridoMs = Date.now() - new Date(referenciaIso).getTime();

  if (transcurridoMs < 3 * MS_POR_HORA) {
    resolverAlertasActivasByTipo(paciente.id, "hidratacion", "resuelta");
    return;
  }

  if (transcurridoMs >= 4 * MS_POR_HORA) {
    const existeRoja = ensureNoDuplicatedActiveAlert(
      paciente.id,
      "roja",
      "paciente",
      "hidratacion"
    );

    if (!existeRoja) {
      insertAlerta({
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

  const existeAmarilla = ensureNoDuplicatedActiveAlert(
    paciente.id,
    "amarilla",
    "paciente",
    "hidratacion"
  );

  if (!existeAmarilla) {
    insertAlerta({
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

  const paciente = store.insertPaciente({
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
  });

  store.insertEstadoVesical({
    paciente_id: paciente.id,
    ultima_confirmacion_en: now.toISOString(),
    siguiente_procedimiento_en: siguiente,
    riesgo_actual: "bajo",
    minutos_intervalo: intervalo,
  });

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
  const paciente = store.getPacienteByCodigoVinculacion(codigoNormalizado);

  if (!paciente) {
    return { ok: false, mensaje: "Codigo de vinculacion invalido" };
  }

  const existingLink = store.getActiveLinkByPacienteId(paciente.id);

  if (existingLink) {
    store.updatePaciente(paciente.id, { cuidador_vinculado: true });
    return { ok: true, mensaje: "Cuidador ya vinculado para este paciente" };
  }

  const cuidador = store.insertCuidador({ nombre: "Cuidador vinculado" });

  store.insertPacienteCuidador({
    paciente_id: paciente.id,
    cuidador_id: cuidador.id,
    codigo_vinculacion_usado: codigoNormalizado,
    activo: true,
  });

  store.updatePaciente(paciente.id, { cuidador_vinculado: true, tiene_cuidador: true });

  return { ok: true, mensaje: "Cuidador vinculado correctamente" };
}

async function obtenerEstadoHidratacion() {
  const paciente = getPacienteActivo();

  if (!paciente) {
    return buildEmptyResumen().hidratacion;
  }

  return getHidratacionDelDia(paciente.id);
}

async function registrarAgua(mililitros) {
  const paciente = getPacienteActivo();

  if (!paciente) {
    throw new Error("No hay paciente registrado");
  }

  store.insertHidratacion({
    paciente_id: paciente.id,
    cantidad_ml: Number(mililitros),
    origen: "boton_rapido",
  });

  resolverAlertasActivasByTipo(paciente.id, "hidratacion", "resuelta");

  return getHidratacionDelDia(paciente.id);
}

async function confirmarProcedimiento({ checklist, actor }) {
  const allChecked = checklist && checklist.lavadoManos && checklist.materialLimpio && checklist.tecnicaCorrecta;
  if (!allChecked) {
    return { ok: false, mensaje: "Debes completar el checklist obligatorio" };
  }

  const paciente = getPacienteActivo();

  if (!paciente) {
    return { ok: false, mensaje: "No hay paciente registrado" };
  }

  const now = new Date();
  const intervalo = getIntervaloMinutos(paciente.tipo_manejo_vesical);
  const siguiente = addMinutesToIso(now, intervalo);

  store.insertProcedimiento({
    paciente_id: paciente.id,
    actor,
    checklist_lavado_manos: true,
    checklist_material_limpio: true,
    checklist_tecnica_correcta: true,
    confirmado_en: now.toISOString(),
  });

  store.updateEstadoVesical(paciente.id, {
    ultima_confirmacion_en: now.toISOString(),
    siguiente_procedimiento_en: siguiente,
    riesgo_actual: "bajo",
  });

  resolverAlertasActivasByTipo(paciente.id, "procedimiento", "resuelta");

  return {
    ok: true,
    data: {
      ultimaConfirmacion: now.toISOString(),
      siguienteProcedimiento: siguiente,
    },
  };
}

async function recalcularAlertas() {
  const pacientes = store.getAllPacientes();

  let total = 0;
  for (const paciente of pacientes) {
    recalcularAlertasPaciente(paciente);
    recalcularRecordatoriosCambioSonda(paciente);
    recalcularRecordatoriosAgua(paciente);
    total += getAlertasActivasByPacienteId(paciente.id).length;
  }

  return { totalAlertasActivas: total };
}

async function obtenerAlertasActivas() {
  const paciente = getPacienteActivo();

  if (!paciente) {
    return [];
  }

  recalcularAlertasPaciente(paciente);
  recalcularRecordatoriosCambioSonda(paciente);
  recalcularRecordatoriosAgua(paciente);
  return getAlertasActivasByPacienteId(paciente.id);
}

async function confirmarAlertas() {
  const paciente = getPacienteActivo();

  if (!paciente) {
    return { ok: true, mensaje: "Sin paciente activo" };
  }

  resolverAlertasActivas(paciente.id, "confirmada");
  return { ok: true, mensaje: "Alertas confirmadas" };
}

async function crearAlertaSimulada({ tipo = "hidratacion", nivel = "amarilla", mensaje, destino = "paciente" }) {
  const paciente = getPacienteActivo();

  if (!paciente) {
    return { ok: false, mensaje: "No hay paciente activo" };
  }

  const riesgo = nivel === "roja" ? "alto" : "moderado";
  const texto = mensaje ||
    (tipo === "sonda"
      ? "Simulacion: Hoy corresponde cambio de sonda"
      : tipo === "procedimiento"
        ? "Simulacion: Retraso en procedimiento vesical"
        : "Simulacion: Es hora de tomar agua");

  insertAlerta({
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
  const paciente = getPacienteActivo();

  if (!paciente) {
    return buildEmptyResumen();
  }

  recalcularAlertasPaciente(paciente);
  recalcularRecordatoriosCambioSonda(paciente);
  recalcularRecordatoriosAgua(paciente);

  const hidratacion = getHidratacionDelDia(paciente.id);
  const estado = getEstadoPaciente(paciente.id);
  const alertasActivas = getAlertasActivasByPacienteId(paciente.id);

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
