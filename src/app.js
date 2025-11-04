import express from "express";
import cors from "cors";
import productosRoutes from "./routes/productos.routes.js";
import movimientosRoutes from "./routes/movimientos.routes.js";
import documentosRoutes from "./routes/documentos.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import reportesRoutes from "./routes/reportes.routes.js";
import authRoutes from "./routes/auth.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js"; 
import perfilRoutes from "./routes/perfil.routes.js";
import instructivoRoutes from './routes/instructivo.routes.js';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuariosRoutes); 
app.use("/api/perfil", perfilRoutes);     
app.use("/api/productos", productosRoutes);
app.use("/api/movimientos", movimientosRoutes);
app.use("/api/documentos", documentosRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reportes", reportesRoutes);

app.use('/api/instructivo', instructivoRoutes);

// Servir archivos estáticos
app.use("/uploads", express.static("uploads"));

export default app;