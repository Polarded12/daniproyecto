const express = require("express");
const { guardarPerfilPaciente, conectarCuidador, obtenerPerfil } = require("../controllers/perfilCtrl");

const router = express.Router();

router.post("/paciente", guardarPerfilPaciente);
router.post("/cuidador/vincular", conectarCuidador);
router.get("/", obtenerPerfil);

module.exports = router;
