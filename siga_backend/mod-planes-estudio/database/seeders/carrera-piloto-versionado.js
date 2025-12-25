import { db } from '../../src/config/database.js';

export class CarreraPilotoVersionadoSeeder {
    async ejecutar() {
        try {
            console.log('🚀 Iniciando carga de carrera piloto CON VERSIONADO...');
            
            // 1. Crear múltiples versiones del plan
            const planes = await this.crearPlanesVersionados();
            
            // 2. Crear estructura para cada versión
            for (const plan of planes) {
                await this.crearEstructuraCompleta(plan.id, plan.version);
            }
            
            console.log('✅ Carrera piloto con versionado cargada exitosamente');
            
            // 3. Mostrar resumen
            await this.mostrarResumen();
        } catch (error) {
            console.error('❌ Error en seeder:', error);
        }
    }

    async crearPlanesVersionados() {
        const planes = [
            {
                codigo: 'J2662-3-2023',
                codigo_base: 'J2662-3',
                version: '2023',
                codigo_completo: 'J2662-3-2023',
                nombre: 'DESARROLLO DE SISTEMAS DE INFORMACIÓN (2023)',
                nivel_formativo: 'Profesional técnico',
                total_horas: 3264,
                total_creditos: 127,
                modalidad: 'Presencial',
                sector_economico: 'Información y Comunicaciones',
                familia_productiva: 'Tecnologías de la información y comunicaciones - TICS',
                actividad_economica: 'Programación informática, consultoría de informática y actividades conexas',
                perfil_egreso: 'El profesional técnico en Desarrollo de Sistemas de Información diseña, desarrolla y mantiene sistemas informáticos que automatizan procesos de las organizaciones, aplicando metodologías ágiles y estándares de calidad. Versión 2023.',
                estado_version: 'historico',
                vigente_desde: '2023-01-01',
                vigente_hasta: '2023-12-31',
                fecha_retiro: '2026-12-31'
            },
            {
                codigo: 'J2662-3-2024',
                codigo_base: 'J2662-3',
                version: '2024', 
                codigo_completo: 'J2662-3-2024',
                nombre: 'DESARROLLO DE SISTEMAS DE INFORMACIÓN (2024)',
                nivel_formativo: 'Profesional técnico',
                total_horas: 3264,
                total_creditos: 127,
                modalidad: 'Presencial',
                sector_economico: 'Información y Comunicaciones',
                familia_productiva: 'Tecnologías de la información y comunicaciones - TICS',
                actividad_economica: 'Programación informática, consultoría de informática y actividades conexas',
                perfil_egreso: 'El profesional técnico en Desarrollo de Sistemas de Información diseña, desarrolla y mantiene sistemas informáticos que automatizan procesos de las organizaciones, aplicando metodologías ágiles y estándares de calidad. Versión 2024 con actualizaciones en tecnologías web.',
                estado_version: 'vigente',
                vigente_desde: '2024-01-01',
                vigente_hasta: null,
                fecha_retiro: null
            },
            {
                codigo: 'J2662-3-2027',
                codigo_base: 'J2662-3',
                version: '2027',
                codigo_completo: 'J2662-3-2027',
                nombre: 'DESARROLLO DE SISTEMAS DE INFORMACIÓN (2027)',
                nivel_formativo: 'Profesional técnico',
                total_horas: 3300,
                total_creditos: 130,
                modalidad: 'Presencial',
                sector_economico: 'Información y Comunicaciones',
                familia_productiva: 'Tecnologías de la información y comunicaciones - TICS',
                actividad_economica: 'Programación informática, consultoría de informática y actividades conexas',
                perfil_egreso: 'El profesional técnico en Desarrollo de Sistemas de Información diseña, desarrolla y mantiene sistemas informáticos que automatizan procesos de las organizaciones, aplicando metodologías ágiles, estándares de calidad e inteligencia artificial. Versión 2027.',
                estado_version: 'borrador',
                vigente_desde: null,
                vigente_hasta: null,
                fecha_retiro: null
            }
        ];

        const planesCreados = [];
        for (const planData of planes) {
            const planId = await this.crearPlan(planData);
            planesCreados.push({ id: planId, ...planData });
            console.log(`📚 Plan ${planData.version} creado: ${planData.codigo_completo}`);
        }

        return planesCreados;
    }

    async crearPlan(planData) {
        const query = `
            INSERT INTO planes_estudio (
                codigo, codigo_base, version, codigo_completo, nombre, 
                nivel_formativo, total_horas, total_creditos, modalidad, 
                sector_economico, familia_productiva, actividad_economica,
                perfil_egreso, estado_version, vigente_desde, vigente_hasta, 
                fecha_retiro, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING id
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
            planData.estado_version,
            planData.vigente_desde,
            planData.vigente_hasta,
            planData.fecha_retiro,
            'activo'
        ];

        const result = await db.query(query, values);
        return result.rows[0].id;
    }

    async crearEstructuraCompleta(planId, version) {
        console.log(`🏗 Creando estructura académica para plan ${version}...`);
        
        // Crear módulos básicos (simplificado para ejemplo)
        const modulos = [
            {
                nombre: `ARQUITECTURA DE COMPUTADORAS Y DESARROLLO DE SOFTWARE (${version})`,
                numero: 1,
                descripcion: `Módulo enfocado en fundamentos de hardware y desarrollo de software básico - ${version}`,
                creditos_tecnicos: 25,
                horas_tecnicas: 800
            },
            {
                nombre: `DISEÑO Y ADMINISTRACIÓN DE BASES DE DATOS Y SOFTWARE (${version})`,
                numero: 2,
                descripcion: `Módulo especializado en bases de datos y desarrollo de software intermedio - ${version}`,
                creditos_tecnicos: 30,
                horas_tecnicas: 960
            },
            {
                nombre: `DESARROLLO DE APLICACIONES WEB Y EMPRENDIMIENTO (${version})`,
                numero: 3,
                descripcion: `Módulo avanzado de desarrollo web y habilidades emprendedoras - ${version}`,
                creditos_tecnicos: 35,
                horas_tecnicas: 1120
            }
        ];

        for (const moduloData of modulos) {
            await this.crearModulo(planId, moduloData);
        }

        console.log(`✅ Estructura académica creada para plan ${version}`);
    }

    async crearModulo(planId, moduloData) {
        const query = `
            INSERT INTO modulos (
                plan_estudio_id, nombre, numero, descripcion,
                creditos_tecnicos, horas_tecnicas, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const values = [
            planId,
            moduloData.nombre,
            moduloData.numero,
            moduloData.descripcion,
            moduloData.creditos_tecnicos,
            moduloData.horas_tecnicas,
            'activo'
        ];

        await db.query(query, values);
    }

    async mostrarResumen() {
        console.log('\n📊 RESUMEN DE CARRERA PILOTO CON VERSIONADO:');
        console.log('============================================');
        
        // Planes vigentes
        const vigentesQuery = `
            SELECT codigo_completo, nombre, estado_version, vigente_desde, vigente_hasta 
            FROM planes_estudio 
            WHERE codigo_base = 'J2662-3' 
            ORDER BY version DESC
        `;
        const result = await db.query(vigentesQuery);
        
        result.rows.forEach(plan => {
            console.log(`📚 ${plan.codigo_completo}: ${plan.nombre}`);
            console.log(`   Estado: ${plan.estado_version}`);
            console.log(`   Vigente desde: ${plan.vigente_desde}`);
            console.log(`   Vigente hasta: ${plan.vigente_hasta || 'Indefinido'}`);
            console.log('---');
        });
    }
}

// Ejecutar seeder si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const seeder = new CarreraPilotoVersionadoSeeder();
    seeder.ejecutar();
}