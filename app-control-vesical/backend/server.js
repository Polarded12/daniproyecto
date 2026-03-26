const express = require("express");
const cors = require("cors");
require("dotenv").config();

const perfilRoutes = require("./routes/perfilRoutes");
const vesicalRoutes = require("./routes/vesicalRoutes");
const alertasRoutes = require("./routes/alertasRoutes");
const healthRoutes = require("./routes/healthRoutes");
const { iniciarCronJobs } = require("./utils/cronJobs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/perfil", perfilRoutes);
app.use("/api/vesical", vesicalRoutes);
app.use("/api/alertas", alertasRoutes);
app.use("/api/health", healthRoutes);

app.get("/", (_req, res) => {
  res.json({ message: "Backend de App Control Vesical activo" });
});

iniciarCronJobs();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
