import express from "express";
import productosRoutes from "./routes/productos.routes.js";
import movimientosRoutes from "./routes/movimientos.routes.js";
import documentosRoutes from "./routes/documentos.routes.js";
import dashboardRoutes from './routes/dashboard.routes.js';


const app = express();

app.use(express.json());

// Rutas principales
app.use("/api/productos", productosRoutes);
app.use("/api/movimientos", movimientosRoutes);
app.use("/api/documentos", documentosRoutes); 

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Rutas del dashboard
app.use('/api/dashboard', dashboardRoutes);


export default app;