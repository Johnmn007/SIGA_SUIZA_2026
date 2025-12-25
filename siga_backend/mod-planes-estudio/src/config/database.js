import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

console.log('🔧 CONFIGURACIÓN DE BASE DE DATOS:');
console.log('Usuario:', process.env.DB_USER);
console.log('Host:', process.env.DB_HOST);
console.log('Base de datos:', process.env.DB_NAME);
console.log('Puerto:', process.env.DB_PORT);
console.log('¿Tiene password?', process.env.DB_PASSWORD ? 'SÍ' : 'NO');

export class Database {
    constructor() {
        try {
            this.pool = new Pool({
                user: process.env.DB_USER,
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT,
            });
            console.log('✅ Pool de conexión creado');
        } catch (error) {
            console.error('❌ Error creando pool:', error.message);
        }
    }

    async query(text, params) {
        try {
            const client = await this.pool.connect();
            console.log('✅ Conexión a BD establecida');
            try {
                const result = await client.query(text, params);
                return result;
            } finally {
                client.release();
                console.log('✅ Conexión liberada');
            }
        } catch (error) {
            console.error('❌ Error en query:', error.message);
            throw error;
        }
    }

    async healthCheck() {
        try {
            console.log('🔍 Ejecutando health check...');
            await this.query('SELECT 1');
            console.log('✅ Health check exitoso');
            return true;
        } catch (error) {
            console.error('❌ Health check falló:', error.message);
            return false;
        }
    }
}

export const db = new Database();