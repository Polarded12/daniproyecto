const API_BASE_URL = "http://localhost:3000/api";

async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error en la solicitud");
  }
  return data;
}

async function apiPost(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.mensaje || "Error en la solicitud");
  }
  return data;
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
};

window.api = api;
