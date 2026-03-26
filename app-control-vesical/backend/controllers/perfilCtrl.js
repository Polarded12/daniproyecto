const { iniciarPaciente, vincularCuidador, obtenerResumen } = require("../utils/vesicalService");

async function guardarPerfilPaciente(req, res) {
  const { nombre, edad, sexo, nivelLesion, tipoManejo } = req.body;
  if (!nombre || !edad || !sexo || !nivelLesion || !tipoManejo) {
    return res.status(400).json({ ok: false, mensaje: "Faltan campos obligatorios del perfil" });
  }

  try {
    const data = await iniciarPaciente(req.body);
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

async function conectarCuidador(req, res) {
  const { codigoVinculacion } = req.body;
  if (!codigoVinculacion) {
    return res.status(400).json({ ok: false, mensaje: "Debes ingresar un codigo" });
  }

  try {
    const resultado = await vincularCuidador(codigoVinculacion);
    if (!resultado.ok) {
      return res.status(400).json(resultado);
    }

    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

async function obtenerPerfil(_req, res) {
  try {
    const data = await obtenerResumen();
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = { guardarPerfilPaciente, conectarCuidador, obtenerPerfil };
