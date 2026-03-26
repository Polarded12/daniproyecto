const express = require("express");
const { verificarConexionSupabase } = require("../config/database");

const router = express.Router();

router.get("/supabase", async (_req, res) => {
  try {
    await verificarConexionSupabase();
    return res.json({ ok: true, mensaje: "Conexion con Supabase OK" });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message });
  }
});

module.exports = router;
