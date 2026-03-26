const { obtenerAlertasActivas, confirmarAlertas, crearAlertaSimulada } = require("../utils/vesicalService");

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

async function simularAlertaCtrl(req, res) {
  try {
    const resultado = await crearAlertaSimulada({
      tipo: req.body.tipo,
      nivel: req.body.nivel,
      mensaje: req.body.mensaje,
      destino: req.body.destino || "paciente",
    });

    if (!resultado.ok) {
      return res.status(400).json(resultado);
    }

    return res.status(201).json(resultado);
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = { obtenerAlertasActivasCtrl, confirmarAlertasCtrl, simularAlertaCtrl };
