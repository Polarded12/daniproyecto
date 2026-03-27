const { recalcularAlertas } = require("./vesicalService");

let recalculoEnCurso = false;

function buildErrorDetail(error) {
  const partes = [];
  let current = error;
  while (current) {
    if (current.message) {
      partes.push(current.message);
    }
    current = current.cause;
  }
  return partes.join(" | causa: ");
}

function iniciarCronJobs() {
  setInterval(async () => {
    if (recalculoEnCurso) {
      return;
    }

    recalculoEnCurso = true;
    try {
      const resumen = await recalcularAlertas();
      if (resumen.totalAlertasActivas > 0) {
        console.log(`[cron] Alertas activas: ${resumen.totalAlertasActivas}`);
      }
    } catch (error) {
      console.error(`[cron] Error al recalcular alertas: ${buildErrorDetail(error)}`);
    } finally {
      recalculoEnCurso = false;
    }
  }, 60 * 1000);
}

module.exports = { iniciarCronJobs };
