const express = require("express");
const {
	registrarAguaCtrl,
	obtenerHidratacion,
	confirmarProcedimientoCtrl,
	obtenerEstadoProcedimiento,
} = require("../controllers/vesicalCtrl");

const router = express.Router();

router.post("/agua", registrarAguaCtrl);
router.get("/hidratacion", obtenerHidratacion);
router.post("/procedimiento/confirmar", confirmarProcedimientoCtrl);
router.get("/procedimiento/estado", obtenerEstadoProcedimiento);

module.exports = router;
