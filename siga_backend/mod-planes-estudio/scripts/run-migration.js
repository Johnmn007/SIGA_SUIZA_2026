import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationRunner {
    async run() {
        try {
            console.log('🚀 Ejecutando migración de versionado...');
            
            // Leer archivo de migración
            const migrationPath = path.join(__dirname, '../database/migrations/001-add-versioning.sql');
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            console.log('📝 Aplicando cambios de esquema...');
            
            // Dividir el SQL en sentencias individuales
            const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    await db.query(statement);
                }
            }
            
            console.log('✅ Migración de versionado aplicada exitosamente');
            
            // Verificar migración
            await this.verifyMigration();
            
        } catch (error) {
            console.error('❌ Error en migración:', error.message);
            process.exit(1);
        }
    }

    async verifyMigration() {
        console.log('🔍 Verificando migración...');
        
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'planes_estudio' 
            AND column_name IN ('codigo_base', 'version', 'estado_version')
        `;
        
        const result = await db.query(checkQuery);
        
        if (result.rows.length === 3) {
            console.log('✅ Todas las columnas de versionado fueron agregadas correctamente');
            
            // Mostrar planes actualizados
            await this.showCurrentPlans();
        } else {
            console.log('⚠️ Columnas encontradas:', result.rows.map(r => r.column_name));
            throw new Error('No se pudieron verificar todas las columnas de versionado');
        }
    }

    async showCurrentPlans() {
        const plansQuery = `
            SELECT codigo, codigo_base, version, estado_version, vigente_desde
            FROM planes_estudio 
            ORDER BY id
        `;
        
        const result = await db.query(plansQuery);
        
        console.log('\n📊 Planes actuales después de migración:');
        console.log('======================================');
        result.rows.forEach(plan => {
            console.log(`📚 ${plan.codigo} -> ${plan.codigo_base}-${plan.version} (${plan.estado_version})`);
        });
    }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const runner = new MigrationRunner();
    runner.run();
}

export default MigrationRunner;