const { createClient } = require("@supabase/supabase-js");

let supabaseClient;

function validarVariablesSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  }

  if (supabaseUrl.includes("TU-PROYECTO") || supabaseServiceRoleKey.includes("TU_SERVICE_ROLE_KEY")) {
    throw new Error("Debes reemplazar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY con credenciales reales");
  }
}

function connectDatabase() {
  validarVariablesSupabase();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return supabaseClient;
}

async function verificarConexionSupabase() {
  const supabase = connectDatabase();
  const { error } = await supabase.from("pacientes").select("id", { count: "exact", head: true });
  if (error) {
    throw new Error(`Supabase no responde correctamente: ${error.message}`);
  }
  return true;
}

module.exports = { connectDatabase, verificarConexionSupabase };
