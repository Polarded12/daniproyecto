const {
  registrarAgua,
  obtenerEstadoHidratacion,
  confirmarProcedimiento,
  obtenerResumen,
} = require("../utils/vesicalService");

async function registrarAguaCtrl(req, res) {
  const { ml } = req.body;
  if (![250, 500].includes(Number(ml))) {
    return res.status(400).json({ ok: false, mensaje: "Solo se permiten cargas rapidas de 250ml o 500ml" });
  }

  try {
    const data = await registrarAgua(Number(ml));
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

async function obtenerHidratacion(_req, res) {
  try {
    const data = await obtenerEstadoHidratacion();
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

async function confirmarProcedimientoCtrl(req, res) {
  try {
    const resultado = await confirmarProcedimiento({
      checklist: req.body.checklist,
      actor: req.body.actor || "paciente",
    });

    if (!resultado.ok) {
      return res.status(400).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

async function obtenerEstadoProcedimiento(_req, res) {
  try {
    const resumen = await obtenerResumen();
    return res.json({
      ok: true,
      data: {
        ultimaConfirmacion: resumen.ultimaConfirmacion,
        siguienteProcedimiento: resumen.siguienteProcedimiento,
        alertasActivas: resumen.alertasActivas,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  registrarAguaCtrl,
  obtenerHidratacion,
  confirmarProcedimientoCtrl,
  obtenerEstadoProcedimiento,
};
