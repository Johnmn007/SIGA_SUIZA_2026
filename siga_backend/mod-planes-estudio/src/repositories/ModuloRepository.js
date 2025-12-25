import { db } from '../config/database.js';
import { Modulo } from '../models/Modulo.js';

export class ModuloRepository {
    async crear(moduloData) {
        const query = `
            INSERT INTO modulos (
                plan_estudio_id, nombre, numero, descripcion,
                competencias_tecnicas, competencias_empleabilidad,
                creditos_tecnicos, creditos_empleabilidad, creditos_esrt,
                horas_tecnicas, horas_empleabilidad, horas_esrt
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        const values = [
            moduloData.plan_estudio_id,
            moduloData.nombre,
            moduloData.numero,
            moduloData.descripcion,
            JSON.stringify(moduloData.competencias_tecnicas || []),
            JSON.stringify(moduloData.competencias_empleabilidad || []),
            moduloData.creditos_tecnicos || 0,
            moduloData.creditos_empleabilidad || 0,
            moduloData.creditos_esrt || 0,
            moduloData.horas_tecnicas || 0,
            moduloData.horas_empleabilidad || 0,
            moduloData.horas_esrt || 0
        ];

        const result = await db.query(query, values);
        return new Modulo(result.rows[0]);
    }

    async obtenerPorPlanEstudio(planEstudioId) {
        const query = 'SELECT * FROM modulos WHERE plan_estudio_id = $1 AND estado = $2 ORDER BY numero';
        const result = await db.query(query, [planEstudioId, 'activo']);
        
        return result.rows.map(row => new Modulo(row));
    }

    async obtenerConUnidades(planEstudioId) {
        const query = `
            SELECT m.*, 
                   json_agg(
                       json_build_object(
                           'id', ud.id,
                           'nombre', ud.nombre,
                           'periodo_academico', ud.periodo_academico,
                           'creditos_teoricos', ud.creditos_teoricos,
                           'creditos_practicos', ud.creditos_practicos,
                           'horas_teoricas', ud.horas_teoricas,
                           'horas_practicas', ud.horas_practicas,
                           'tipo', ud.tipo
                       ) ORDER BY ud.periodo_academico
                   ) as unidades_didacticas
            FROM modulos m
            LEFT JOIN unidades_didacticas ud ON m.id = ud.modulo_id AND ud.estado = 'activo'
            WHERE m.plan_estudio_id = $1 AND m.estado = 'activo'
            GROUP BY m.id
            ORDER BY m.numero
        `;
        
        const result = await db.query(query, [planEstudioId]);
        return result.rows;
    }
}