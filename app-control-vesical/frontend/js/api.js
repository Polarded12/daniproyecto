const API_BASE_URL = window.__API_BASE_URL__ || "https://daniproyecto.onrender.com/api";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (_error) {
    throw new Error("No se pudo conectar con el backend. Verifica que este ejecutandose en http://localhost:3000");
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_error) {
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }
    return {};
  }

  if (!response.ok) {
    throw new Error(data.mensaje || `Error HTTP ${response.status}`);
  }

  return data;
}

async function apiGet(path) {
  return request(path);
}

async function apiPost(path, payload) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const api = {
  obtenerPerfil: () => apiGet("/perfil"),
  registrarPaciente: (payload) => apiPost("/perfil/paciente", payload),
  vincularCuidador: (codigoVinculacion) => apiPost("/perfil/cuidador/vincular", { codigoVinculacion }),
  registrarAgua: (ml) => apiPost("/vesical/agua", { ml }),
  obtenerHidratacion: () => apiGet("/vesical/hidratacion"),
  confirmarProcedimiento: (checklist, actor) =>
    apiPost("/vesical/procedimiento/confirmar", { checklist, actor }),
  estadoProcedimiento: () => apiGet("/vesical/procedimiento/estado"),
  obtenerAlertas: () => apiGet("/alertas"),
  confirmarAlertas: () => apiPost("/alertas/confirmar", {}),
  simularAlerta: (payload) => apiPost("/alertas/simular", payload),
};

window.api = api;
