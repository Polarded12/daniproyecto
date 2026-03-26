function mostrarMensaje(el, texto, tipo = "") {
  if (!el) {
    return;
  }
  el.textContent = texto;
  el.className = `mensaje ${tipo}`.trim();
}

const CODIGO_REGISTRO_KEY = "codigoRegistroPaciente";

function renderBarra(barraEl, porcentaje) {
  if (!barraEl) {
    return;
  }
  barraEl.style.width = `${porcentaje}%`;
}

function formatearFechaHora(iso) {
  if (!iso) {
    return "sin registro";
  }
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return iso;
  }
  return fecha.toLocaleString("es-CL");
}

function renderAlertas(container, alertas) {
  if (!container) {
    return;
  }
  container.innerHTML = "";

  if (!alertas || alertas.length === 0) {
    container.innerHTML = "<p>Sin alertas activas.</p>";
    return;
  }

  alertas.forEach((alerta) => {
    const p = document.createElement("p");
    p.className = alerta.nivel === "roja" ? "alerta-roja" : "alerta-amarilla";
    p.textContent = `[${alerta.nivel.toUpperCase()}] ${alerta.mensaje}`;
    container.appendChild(p);
  });
}

function obtenerChecklistDesdeFormulario(form) {
  const formData = new FormData(form);
  return {
    lavadoManos: formData.get("lavadoManos") === "on",
    materialLimpio: formData.get("materialLimpio") === "on",
    tecnicaCorrecta: formData.get("tecnicaCorrecta") === "on",
  };
}

function initIndex() {
  const btnPaciente = document.getElementById("btn-paciente");
  const btnCuidador = document.getElementById("btn-cuidador");
  const panelCuidador = document.getElementById("panel-cuidador");
  const formVincular = document.getElementById("form-vincular-cuidador");
  const inputCodigo = document.getElementById("codigo-vinculacion");
  const msg = document.getElementById("mensaje-vinculacion");
  const msgInicio = document.getElementById("mensaje-inicio");

  const codigoReciente = sessionStorage.getItem(CODIGO_REGISTRO_KEY);
  if (codigoReciente) {
    mostrarMensaje(msgInicio, `Perfil creado correctamente. Codigo del paciente: ${codigoReciente}`, "ok");
    sessionStorage.removeItem(CODIGO_REGISTRO_KEY);
  }

  btnPaciente?.addEventListener("click", () => {
    window.rolStore.setRol("paciente");
    window.location.href = "registro.html";
  });

  btnCuidador?.addEventListener("click", () => {
    panelCuidador?.classList.remove("oculto");
    inputCodigo?.focus();
  });

  formVincular?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await window.api.vincularCuidador(inputCodigo.value.trim().toUpperCase());
      window.rolStore.setRol("cuidador");
      window.location.href = "dashboard_cuidador.html";
    } catch (error) {
      mostrarMensaje(msg, error.message, "error");
    }
  });
}

function initRegistro() {
  const form = document.getElementById("form-registro");
  const msg = document.getElementById("mensaje-registro");
  const tipoManejoEl = document.getElementById("tipo-manejo");
  const configSonda = document.getElementById("config-sonda");
  const frecuenciaSondaEl = document.getElementById("frecuencia-cambio-sonda");
  const fechaUltimoCambioSondaEl = document.getElementById("fecha-ultimo-cambio-sonda");

  const today = new Date().toISOString().slice(0, 10);
  if (fechaUltimoCambioSondaEl && !fechaUltimoCambioSondaEl.value) {
    fechaUltimoCambioSondaEl.value = today;
  }

  function actualizarCamposSonda() {
    const esSonda = tipoManejoEl?.value === "sonda_permanente";
    configSonda?.classList.toggle("oculto", !esSonda);
    if (frecuenciaSondaEl) {
      frecuenciaSondaEl.required = esSonda;
    }
    if (fechaUltimoCambioSondaEl) {
      fechaUltimoCambioSondaEl.required = esSonda;
    }
  }

  tipoManejoEl?.addEventListener("change", actualizarCamposSonda);
  actualizarCamposSonda();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const payload = {
      nombre: formData.get("nombre"),
      edad: Number(formData.get("edad")),
      sexo: formData.get("sexo"),
      nivelLesion: formData.get("nivelLesion"),
      tipoManejo: formData.get("tipoManejo"),
      tieneCuidador: formData.get("tieneCuidador") === "si",
      frecuenciaCambioSondaDias: Number(formData.get("frecuenciaCambioSondaDias") || 30),
      fechaUltimoCambioSonda: formData.get("fechaUltimoCambioSonda") || undefined,
    };

    try {
      const result = await window.api.registrarPaciente(payload);
      const codigoGuardado = result?.data?.codigoVinculacion;
      if (!codigoGuardado) {
        throw new Error("No se pudo obtener el codigo de vinculacion del paciente");
      }
      sessionStorage.setItem(CODIGO_REGISTRO_KEY, codigoGuardado);
      window.rolStore.setRol("");
      window.location.href = "index.html";
    } catch (error) {
      mostrarMensaje(msg, error.message, "error");
    }
  });
}

async function refrescarPanelPaciente() {
  const txtHid = document.getElementById("texto-hidratacion");
  const barra = document.getElementById("barra-hidratacion");
  const txtSiguiente = document.getElementById("siguiente-procedimiento");
  const listaAlertas = document.getElementById("lista-alertas-paciente");

  const hid = await window.api.obtenerHidratacion();
  txtHid.textContent = `${hid.data.consumidoMl} / ${hid.data.metaMl} ml`;
  renderBarra(barra, hid.data.progreso);

  const est = await window.api.estadoProcedimiento();
  txtSiguiente.textContent = `Siguiente procedimiento: ${est.data.siguienteProcedimiento || "pendiente"}`;

  const alertas = await window.api.obtenerAlertas();
  renderAlertas(listaAlertas, alertas.data);
}

function initDashboardPaciente() {
  const btnTomeAgua = document.getElementById("btn-agua-tome");
  const b250 = document.getElementById("btn-agua-250");
  const b500 = document.getElementById("btn-agua-500");
  const form = document.getElementById("form-procedimiento");
  const msg = document.getElementById("mensaje-procedimiento");

  btnTomeAgua?.addEventListener("click", async () => {
    await window.api.registrarAgua(250);
    mostrarMensaje(msg, "Registro de agua guardado", "ok");
    await refrescarPanelPaciente();
  });

  b250?.addEventListener("click", async () => {
    await window.api.registrarAgua(250);
    await refrescarPanelPaciente();
  });

  b500?.addEventListener("click", async () => {
    await window.api.registrarAgua(500);
    await refrescarPanelPaciente();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const checklist = obtenerChecklistDesdeFormulario(form);
      await window.api.confirmarProcedimiento(checklist, "paciente");
      mostrarMensaje(msg, "Procedimiento confirmado y contador reiniciado", "ok");
      form.reset();
      await refrescarPanelPaciente();
    } catch (error) {
      mostrarMensaje(msg, error.message, "error");
    }
  });

  refrescarPanelPaciente();
  setInterval(refrescarPanelPaciente, 30000);
}

async function refrescarPanelCuidador() {
  const nombre = document.getElementById("info-paciente-nombre");
  const edad = document.getElementById("info-paciente-edad");
  const sexo = document.getElementById("info-paciente-sexo");
  const lesion = document.getElementById("info-paciente-lesion");
  const manejo = document.getElementById("info-paciente-manejo");
  const resumenHid = document.getElementById("resumen-hidratacion");
  const barra = document.getElementById("barra-hidratacion-cuidador");
  const ultimo = document.getElementById("ultimo-procedimiento");
  const lista = document.getElementById("lista-alertas-cuidador");

  const perfil = await window.api.obtenerPerfil();
  const data = perfil.data;
  const paciente = data.paciente || {};

  nombre.textContent = `Nombre: ${paciente.nombre || "-"}`;
  edad.textContent = `Edad: ${paciente.edad || "-"}`;
  sexo.textContent = `Sexo: ${paciente.sexo || "-"}`;
  lesion.textContent = `Nivel de lesion: ${paciente.nivelLesion || "-"}`;
  manejo.textContent = `Tipo de manejo: ${paciente.tipoManejo || "-"}`;

  resumenHid.textContent = `Hidratacion: ${data.hidratacion.consumidoMl} / ${data.hidratacion.metaMl} ml`;
  renderBarra(barra, data.hidratacion.progreso);
  ultimo.textContent = `Ultimo procedimiento: ${formatearFechaHora(data.ultimaConfirmacion)}`;

  const alertas = await window.api.obtenerAlertas();
  renderAlertas(lista, alertas.data);
}

function initDashboardCuidador() {
  const form = document.getElementById("form-procedimiento-cuidador");
  const btnRegistrarAguaCuidador = document.getElementById("btn-registrar-agua-cuidador");
  const btnConfirmarAlerta = document.getElementById("btn-confirmar-alerta");
  const btnSimularAgua = document.getElementById("btn-simular-agua");
  const btnSimularSonda = document.getElementById("btn-simular-sonda");
  const btnSimularProcedimiento = document.getElementById("btn-simular-procedimiento");
  const msg = document.getElementById("mensaje-cuidador");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const checklist = obtenerChecklistDesdeFormulario(form);
      await window.api.confirmarProcedimiento(checklist, "cuidador");
      mostrarMensaje(msg, "Procedimiento confirmado por cuidador", "ok");
      form.reset();
      await refrescarPanelCuidador();
    } catch (error) {
      mostrarMensaje(msg, error.message, "error");
    }
  });

  btnConfirmarAlerta?.addEventListener("click", async () => {
    await window.api.confirmarAlertas();
    mostrarMensaje(msg, "Alertas confirmadas", "ok");
    await refrescarPanelCuidador();
  });

  btnRegistrarAguaCuidador?.addEventListener("click", async () => {
    await window.api.registrarAgua(250);
    mostrarMensaje(msg, "Registro de agua guardado por cuidador", "ok");
    await refrescarPanelCuidador();
  });

  btnSimularAgua?.addEventListener("click", async () => {
    await window.api.simularAlerta({
      tipo: "hidratacion",
      nivel: "amarilla",
      mensaje: "Simulacion: Es hora de tomar agua",
    });
    mostrarMensaje(msg, "Notificacion simulada de agua enviada", "ok");
    await refrescarPanelCuidador();
  });

  btnSimularSonda?.addEventListener("click", async () => {
    await window.api.simularAlerta({
      tipo: "sonda",
      nivel: "roja",
      mensaje: "Simulacion: Hoy corresponde cambio de sonda",
    });
    mostrarMensaje(msg, "Notificacion simulada de sonda enviada", "ok");
    await refrescarPanelCuidador();
  });

  btnSimularProcedimiento?.addEventListener("click", async () => {
    await window.api.simularAlerta({
      tipo: "procedimiento",
      nivel: "roja",
      mensaje: "Simulacion: Retraso critico en procedimiento vesical",
    });
    mostrarMensaje(msg, "Notificacion simulada de procedimiento enviada", "ok");
    await refrescarPanelCuidador();
  });

  refrescarPanelCuidador();
  setInterval(refrescarPanelCuidador, 30000);
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("btn-paciente") && document.getElementById("btn-cuidador")) {
    initIndex();
    return;
  }

  if (document.getElementById("form-registro")) {
    initRegistro();
    return;
  }

  if (document.getElementById("form-procedimiento")) {
    initDashboardPaciente();
    return;
  }

  if (document.getElementById("form-procedimiento-cuidador")) {
    initDashboardCuidador();
  }
});
