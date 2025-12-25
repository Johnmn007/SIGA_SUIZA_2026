import { db } from '../config/database.js';
import { PlanEstudio } from '../models/PlanEstudio.js';

export class PlanEstudioRepository {
    async crear(planData) {
        const query = `
            INSERT INTO planes_estudio (
                codigo, codigo_base, version, codigo_completo, nombre, 
                nivel_formativo, total_horas, total_creditos, modalidad, 
                sector_economico, familia_productiva, actividad_economica,
                perfil_egreso, estado_version, vigente_desde, vigente_hasta, 
                fecha_retiro, version_anterior_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *
        `;
        
        const values = [
            planData.codigo,
            planData.codigo_base,
            planData.version,
            planData.codigo_completo,
            planData.nombre,
            planData.nivel_formativo,
            planData.total_horas,
            planData.total_creditos,
            planData.modalidad,
            planData.sector_economico,
            planData.familia_productiva,
            planData.actividad_economica,
            planData.perfil_egreso,
            planData.estado_version || 'vigente',
            planData.vigente_desde,
            planData.vigente_hasta,
            planData.fecha_retiro,
            planData.version_anterior_id
        ];

        const result = await db.query(query, values);
        return new PlanEstudio(result.rows[0]);
    }

    async obtenerPorId(id) {
        const query = 'SELECT * FROM planes_estudio WHERE id = $1 AND estado = $2';
        const result = await db.query(query, [id, 'activo']);
        
        if (result.rows.length === 0) return null;
        return new PlanEstudio(result.rows[0]);
    }

    async obtenerPorCodigo(codigo) {
        const query = 'SELECT * FROM planes_estudio WHERE codigo = $1 AND estado = $2';
        const result = await db.query(query, [codigo, 'activo']);
        
        if (result.rows.length === 0) return null;
        return new PlanEstudio(result.rows[0]);
    }

    async obtenerPorCodigoCompleto(codigoCompleto) {
        const query = 'SELECT * FROM planes_estudio WHERE codigo_completo = $1 AND estado = $2';
        const result = await db.query(query, [codigoCompleto, 'activo']);
        
        if (result.rows.length === 0) return null;
        return new PlanEstudio(result.rows[0]);
    }

    // 🆕 MÉTODOS NUEVOS PARA VERSIONADO

    async obtenerVersionesPorCodigoBase(codigoBase) {
        const query = `
            SELECT * FROM planes_estudio 
            WHERE codigo_base = $1 AND estado = $2 
            ORDER BY 
                CASE estado_version 
                    WHEN 'vigente' THEN 1
                    WHEN 'borrador' THEN 2  
                    WHEN 'historico' THEN 3
                    ELSE 4
                END,
                version DESC
        `;
        const result = await db.query(query, [codigoBase, 'activo']);
        
        return result.rows.map(row => new PlanEstudio(row));
    }

    async obtenerPlanesVigentes() {
        const query = `
            SELECT * FROM planes_estudio 
            WHERE estado_version = 'vigente' 
            AND estado = 'activo'
            AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
            ORDER BY codigo_base, version DESC
        `;
        const result = await db.query(query);
        
        return result.rows.map(row => new PlanEstudio(row));
    }

    async obtenerPlanesConEstudiantesActivos() {
        const query = `
            SELECT * FROM planes_estudio 
            WHERE estado = 'activo'
            AND (estado_version = 'vigente' OR 
                 (estado_version = 'historico' AND 
                  (fecha_retiro IS NULL OR fecha_retiro >= CURRENT_DATE)))
            ORDER BY codigo_base, version DESC
        `;
        const result = await db.query(query);
        
        return result.rows.map(row => new PlanEstudio(row));
    }

    async crearNuevaVersion(planId, nuevaVersionData) {
        // Obtener plan base
        const planBase = await this.obtenerPorId(planId);
        if (!planBase) throw new Error('Plan base no encontrado');

        // Crear nueva versión
        const nuevaVersion = {
            ...nuevaVersionData,
            codigo_base: planBase.codigo_base,
            codigo_completo: `${planBase.codigo_base}-${nuevaVersionData.version}`,
            version_anterior_id: planId,
            estado_version: 'borrador'
        };

        return await this.crear(nuevaVersion);
    }

    async activarVersion(planId) {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // Obtener plan a activar
            const plan = await this.obtenerPorId(planId);
            if (!plan) throw new Error('Plan no encontrado');

            // Desactivar versión anterior vigente
            const desactivarQuery = `
                UPDATE planes_estudio 
                SET estado_version = 'historico',
                    vigente_hasta = CURRENT_DATE
                WHERE codigo_base = $1 
                AND estado_version = 'vigente'
                AND estado = 'activo'
            `;
            await client.query(desactivarQuery, [plan.codigo_base]);

            // Activar nueva versión
            const activarQuery = `
                UPDATE planes_estudio 
                SET estado_version = 'vigente',
                    vigente_desde = CURRENT_DATE,
                    vigente_hasta = NULL
                WHERE id = $1
            `;
            await client.query(activarQuery, [planId]);

            await client.query('COMMIT');

            // Retornar plan actualizado
            return await this.obtenerPorId(planId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ✅ MÉTODOS EXISTENTES (mantener compatibilidad)

    async listar() {
        const query = `
            SELECT * FROM planes_estudio 
            WHERE estado = $1 
            ORDER BY 
                CASE estado_version 
                    WHEN 'vigente' THEN 1
                    WHEN 'borrador' THEN 2  
                    WHEN 'historico' THEN 3
                    ELSE 4
                END,
                fecha_creacion DESC
        `;
        const result = await db.query(query, ['activo']);
        
        return result.rows.map(row => new PlanEstudio(row));
    }

    async desactivar(id) {
        const query = 'UPDATE planes_estudio SET estado = $1 WHERE id = $2 RETURNING *';
        const result = await db.query(query, ['inactivo', id]);
        
        if (result.rows.length === 0) return null;
        return new PlanEstudio(result.rows[0]);
    }
}