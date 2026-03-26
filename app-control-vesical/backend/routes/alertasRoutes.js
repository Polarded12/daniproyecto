const express = require("express");
const { obtenerAlertasActivasCtrl, confirmarAlertasCtrl, simularAlertaCtrl } = require("../controllers/calculoRiesgoCtrl");

const router = express.Router();

router.get("/", obtenerAlertasActivasCtrl);
router.post("/confirmar", confirmarAlertasCtrl);
router.post("/simular", simularAlertaCtrl);

module.exports = router;
