const { recalcularAlertas } = require("./vesicalService");

function iniciarCronJobs() {
  setInterval(async () => {
    try {
      const resumen = await recalcularAlertas();
      if (resumen.totalAlertasActivas > 0) {
        console.log(`[cron] Alertas activas: ${resumen.totalAlertasActivas}`);
      }
    } catch (error) {
      console.error(`[cron] Error al recalcular alertas: ${error.message}`);
    }
  }, 60 * 1000);
}

module.exports = { iniciarCronJobs };
