/**
 * Session Store - Almacenamiento en memoria para la sesión actual
 * Simula las tablas de Supabase con datos en memoria
 */

class SessionStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.pacientes = [];
    this.cuidadores = [];
    this.paciente_cuidador = [];
    this.estado_vesical_paciente = [];
    this.hidratacion_registros = [];
    this.procedimiento_registros = [];
    this.alertas = [];
    this.nextPacienteId = 1;
    this.nextCuidadorId = 1;
    this.nextLinkId = 1;
    this.nextHidratacionId = 1;
    this.nextProcedimientoId = 1;
    this.nextAlertaId = 1;
  }

  // ===== PACIENTES =====
  insertPaciente(data) {
    const paciente = {
      id: String(this.nextPacienteId++),
      nombre: data.nombre,
      edad: Number(data.edad),
      sexo: data.sexo,
      nivel_lesion: data.nivel_lesion,
      tipo_manejo_vesical: data.tipo_manejo_vesical,
      tiene_cuidador: Boolean(data.tiene_cuidador),
      codigo_vinculacion: data.codigo_vinculacion || null,
      frecuencia_cambio_sonda_dias: data.frecuencia_cambio_sonda_dias || null,
      fecha_ultimo_cambio_sonda: data.fecha_ultimo_cambio_sonda || null,
      cuidador_vinculado: Boolean(data.cuidador_vinculado),
      onboarding_completado_en: data.onboarding_completado_en,
      created_at: new Date().toISOString(),
    };
    this.pacientes.push(paciente);
    return paciente;
  }

  getPacienteById(id) {
    return this.pacientes.find((p) => p.id === String(id)) || null;
  }

  getPacienteByCodigoVinculacion(codigo) {
    const normalized = String(codigo || "").trim().toUpperCase();
    return this.pacientes.find((p) => p.codigo_vinculacion === normalized) || null;
  }

  getLastPaciente() {
    return this.pacientes[this.pacientes.length - 1] || null;
  }

  getAllPacientes() {
    return [...this.pacientes];
  }

  updatePaciente(id, updates) {
    const paciente = this.getPacienteById(id);
    if (paciente) {
      Object.assign(paciente, updates);
    }
    return paciente;
  }

  // ===== CUIDADORES =====
  insertCuidador(data) {
    const cuidador = {
      id: String(this.nextCuidadorId++),
      nombre: data.nombre,
      created_at: new Date().toISOString(),
    };
    this.cuidadores.push(cuidador);
    return cuidador;
  }

  getCuidadorById(id) {
    return this.cuidadores.find((c) => c.id === String(id)) || null;
  }

  // ===== PACIENTE_CUIDADOR =====
  insertPacienteCuidador(data) {
    const link = {
      id: String(this.nextLinkId++),
      paciente_id: String(data.paciente_id),
      cuidador_id: String(data.cuidador_id),
      codigo_vinculacion_usado: data.codigo_vinculacion_usado,
      activo: Boolean(data.activo),
      vinculado_en: new Date().toISOString(),
    };
    this.paciente_cuidador.push(link);
    return link;
  }

  getActiveLinkByPacienteId(pacienteId) {
    return (
      this.paciente_cuidador.find(
        (link) => link.paciente_id === String(pacienteId) && link.activo === true
      ) || null
    );
  }

  // ===== ESTADO_VESICAL_PACIENTE =====
  insertEstadoVesical(data) {
    const estado = {
      id: String(this.pacientes.length + this.cuidadores.length + 1),
      paciente_id: String(data.paciente_id),
      ultima_confirmacion_en: data.ultima_confirmacion_en,
      siguiente_procedimiento_en: data.siguiente_procedimiento_en,
      riesgo_actual: data.riesgo_actual,
      minutos_intervalo: data.minutos_intervalo,
      created_at: new Date().toISOString(),
    };
    this.estado_vesical_paciente.push(estado);
    return estado;
  }

  getEstadoByPacienteId(pacienteId) {
    return (
      this.estado_vesical_paciente.find((e) => e.paciente_id === String(pacienteId)) || null
    );
  }

  updateEstadoVesical(pacienteId, updates) {
    const estado = this.getEstadoByPacienteId(pacienteId);
    if (estado) {
      Object.assign(estado, updates);
    }
    return estado;
  }

  // ===== HIDRATACION_REGISTROS =====
  insertHidratacion(data) {
    const hidratacion = {
      id: String(this.nextHidratacionId++),
      paciente_id: String(data.paciente_id),
      cantidad_ml: Number(data.cantidad_ml),
      origen: data.origen,
      registrado_en: data.registrado_en || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    this.hidratacion_registros.push(hidratacion);
    return hidratacion;
  }

  getHidratacionDelDia(pacienteId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return this.hidratacion_registros
      .filter((h) => h.paciente_id === String(pacienteId) && new Date(h.registrado_en) >= todayStart)
      .sort((a, b) => new Date(b.registrado_en) - new Date(a.registrado_en));
  }

  getUltimoRegistroHidratacion(pacienteId) {
    const registros = this.hidratacion_registros
      .filter((h) => h.paciente_id === String(pacienteId))
      .sort((a, b) => new Date(b.registrado_en) - new Date(a.registrado_en));

    return registros[0] || null;
  }

  // ===== PROCEDIMIENTO_REGISTROS =====
  insertProcedimiento(data) {
    const procedimiento = {
      id: String(this.nextProcedimientoId++),
      paciente_id: String(data.paciente_id),
      actor: data.actor,
      checklist_lavado_manos: Boolean(data.checklist_lavado_manos),
      checklist_material_limpio: Boolean(data.checklist_material_limpio),
      checklist_tecnica_correcta: Boolean(data.checklist_tecnica_correcta),
      confirmado_en: data.confirmado_en || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    this.procedimiento_registros.push(procedimiento);
    return procedimiento;
  }

  // ===== ALERTAS =====
  insertAlerta(data) {
    const alerta = {
      id: String(this.nextAlertaId++),
      paciente_id: String(data.paciente_id),
      cuidador_id: data.cuidador_id ? String(data.cuidador_id) : null,
      tipo: data.tipo || "procedimiento",
      nivel: data.nivel,
      riesgo: data.riesgo,
      destino: data.destino,
      mensaje: data.mensaje,
      retraso_minutos: data.retraso_minutos,
      estado: data.estado || "activa",
      disparada_en: new Date().toISOString(),
      confirmada_en: null,
      resuelta_en: null,
      created_at: new Date().toISOString(),
    };
    this.alertas.push(alerta);
    return alerta;
  }

  getAlertasActivasByPacienteId(pacienteId) {
    return this.alertas
      .filter((a) => a.paciente_id === String(pacienteId) && a.estado === "activa")
      .sort((a, b) => new Date(b.disparada_en) - new Date(a.disparada_en));
  }

  findActiveAlerta(pacienteId, nivel, destino, tipo = null) {
    return this.alertas.find(
      (a) =>
        a.paciente_id === String(pacienteId) &&
        a.nivel === nivel &&
        a.destino === destino &&
        (tipo ? a.tipo === tipo : true) &&
        a.estado === "activa"
    ) || null;
  }

  getAlertasActivasByPacienteIdAndTipo(pacienteId, tipo) {
    return this.alertas.filter(
      (a) => a.paciente_id === String(pacienteId) && a.estado === "activa" && a.tipo === tipo
    );
  }

  updateAlertasActivasByPacienteIdAndTipo(pacienteId, tipo, updates) {
    const alertas = this.getAlertasActivasByPacienteIdAndTipo(pacienteId, tipo);
    alertas.forEach((a) => Object.assign(a, updates));
    return alertas;
  }

  updateAlerta(alertaId, updates) {
    const alerta = this.alertas.find((a) => a.id === String(alertaId));
    if (alerta) {
      Object.assign(alerta, updates);
    }
    return alerta;
  }

  updateAlertasByPacienteId(pacienteId, updates) {
    const alertas = this.alertas.filter(
      (a) => a.paciente_id === String(pacienteId) && a.estado === "activa"
    );
    alertas.forEach((a) => Object.assign(a, updates));
    return alertas;
  }

  // ===== UTILIDAD =====
  generar0000CodigoVinculacion() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "";
    for (let i = 0; i < 4; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
  }
}

// Export singleton
const store = new SessionStore();
module.exports = store;
