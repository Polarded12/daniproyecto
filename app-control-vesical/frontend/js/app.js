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
  const b250 = document.getElementById("btn-agua-250");
  const b500 = document.getElementById("btn-agua-500");
  const form = document.getElementById("form-procedimiento");
  const msg = document.getElementById("mensaje-procedimiento");

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
  const resumenHid = document.getElementById("resumen-hidratacion");
  const barra = document.getElementById("barra-hidratacion-cuidador");
  const ultimo = document.getElementById("ultimo-procedimiento");
  const lista = document.getElementById("lista-alertas-cuidador");

  const perfil = await window.api.obtenerPerfil();
  const data = perfil.data;
  resumenHid.textContent = `Hidratacion: ${data.hidratacion.consumidoMl} / ${data.hidratacion.metaMl} ml`;
  renderBarra(barra, data.hidratacion.progreso);
  ultimo.textContent = `Ultimo procedimiento: ${data.ultimaConfirmacion || "sin registro"}`;

  const alertas = await window.api.obtenerAlertas();
  renderAlertas(lista, alertas.data);
}

function initDashboardCuidador() {
  const form = document.getElementById("form-procedimiento-cuidador");
  const btnConfirmarAlerta = document.getElementById("btn-confirmar-alerta");
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
