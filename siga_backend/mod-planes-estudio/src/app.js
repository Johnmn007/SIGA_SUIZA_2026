import express from 'express';
import planEstudioRoutes from './routes/planEstudioRoutes.js';
import { db } from './config/database.js';
import excelRoutes from './routes/excelRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(express.json());

// Health check mejorado
app.get('/health', async (req, res) => {
    const dbHealth = await db.healthCheck();
    
    res.status(dbHealth ? 200 : 503).json({
        status: dbHealth ? 'healthy' : 'unhealthy',
        module: 'mod-planes-estudio',
        version: '1.0.0',
        database: dbHealth ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Routes
app.use('/api/v1/upload', excelRoutes);  // ← Ruta separada para uploads
app.use('/api/v1/planes-estudio', planEstudioRoutes);

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error global:', error);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 mod-planes-estudio running on port ${PORT}`);
    console.log(`📚 API disponible en: http://localhost:${PORT}/api/v1/planes-estudio`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});