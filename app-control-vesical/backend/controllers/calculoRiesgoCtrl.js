const { obtenerAlertasActivas, confirmarAlertas } = require("../utils/vesicalService");

async function obtenerAlertasActivasCtrl(_req, res) {
  try {
    const alertas = await obtenerAlertasActivas();
    return res.json({ ok: true, data: alertas });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

async function confirmarAlertasCtrl(_req, res) {
  try {
    const resultado = await confirmarAlertas();
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = { obtenerAlertasActivasCtrl, confirmarAlertasCtrl };
