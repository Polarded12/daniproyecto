const express = require("express");
const { obtenerAlertasActivasCtrl, confirmarAlertasCtrl } = require("../controllers/calculoRiesgoCtrl");

const router = express.Router();

router.get("/", obtenerAlertasActivasCtrl);
router.post("/confirmar", confirmarAlertasCtrl);

module.exports = router;
