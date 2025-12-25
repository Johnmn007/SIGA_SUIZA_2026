// tools/mod-compilado-v2.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📦 COMPILADOR MEJORADO - SIGA\n');

// Configuración más flexible
const INTERESTING_EXTENSIONS = ['.js', '.sql', '.json', '.yaml', '.yml', '.md', '.txt', '.env'];
const INTERESTING_PATTERNS = [
    'package.json', 'manifest.yaml', 'Dockerfile', '.env', 
    'schema.sql', 'README.md', '*.md', '*.js', '*.sql'
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'tools'];
const MAX_FILE_SIZE = 100000; // 100KB máximo

function scanAllFiles(startPath = '.') {
    const allFiles = [];
    
    function scanRecursive(currentPath) {
        try {
            const items = fs.readdirSync(currentPath);
            
            for (const item of items) {
                if (IGNORE_DIRS.includes(item)) continue;
                
                const fullPath = path.join(currentPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanRecursive(fullPath);
                } else {
                    // Verificar si es archivo de interés
                    const ext = path.extname(item);
                    const shouldInclude = INTERESTING_EXTENSIONS.includes(ext) || 
                                         INTERESTING_PATTERNS.some(pattern => 
                                             pattern.includes('*') ? 
                                                 new RegExp(pattern.replace('*', '.*')).test(item) :
                                                 item === pattern
                                         );
                    
                    if (shouldInclude) {
                        allFiles.push({
                            path: fullPath,
                            relativePath: path.relative(startPath, fullPath),
                            size: stat.size
                        });
                    }
                }
            }
        } catch (error) {
            console.log(`⚠️  Error en ${currentPath}: ${error.message}`);
        }
    }
    
    scanRecursive(startPath);
    return allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function categorizeFile(filePath) {
    const categories = {
        'CONFIGURACIÓN': ['package.json', 'manifest.yaml', 'Dockerfile', '.env'],
        'BASE DE DATOS': ['.sql', 'schema.sql'],
        'MODELOS': ['/models/', 'Model.js'],
        'CONTROLADORES': ['/controllers/', 'Controller.js'],
        'RUTAS': ['/routes/', 'Routes.js', 'routes.js'],
        'CONFIG': ['/config/', 'config.js'],
        'APLICACIÓN': ['app.js', 'server.js', 'index.js'],
        'DOCUMENTACIÓN': ['.md', 'README', 'docs/']
    };
    
    for (const [category, patterns] of Object.entries(categories)) {
        for (const pattern of patterns) {
            if (filePath.includes(pattern) || filePath.endsWith(pattern)) {
                return category;
            }
        }
    }
    
    return 'OTROS';
}

function readFileContent(filePath) {
    try {
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_FILE_SIZE) {
            return `[ARCHIVO DEMASIADO GRANDE: ${stats.size} bytes - OMITIDO]`;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        return content.trim() || '[ARCHIVO VACÍO]';
    } catch (error) {
        return `[ERROR LEYENDO ARCHIVO: ${error.message}]`;
    }
}

// Generar compilación mejorada
const moduleName = path.basename(process.cwd());
console.log(`🔍 Escaneando módulo: ${moduleName}...`);

const files = scanAllFiles();
console.log(`📁 Archivos encontrados: ${files.length}`);

let compilation = `📦 COMPILADO COMPLETO - MÓDULO: ${moduleName}\n`;
compilation += `📅 Generado: ${new Date().toLocaleString()}\n`;
compilation += `📊 Total archivos: ${files.length}\n\n`;
compilation += '='.repeat(80) + '\n\n';

// Agrupar por categoría
const filesByCategory = {};
files.forEach(file => {
    const category = categorizeFile(file.relativePath);
    if (!filesByCategory[category]) {
        filesByCategory[category] = [];
    }
    filesByCategory[category].push(file);
});

// Generar contenido
for (const [category, categoryFiles] of Object.entries(filesByCategory)) {
    compilation += `🎯 ${category} (${categoryFiles.length} archivos)\n`;
    compilation += '─'.repeat(80) + '\n\n';
    
    for (const file of categoryFiles) {
        compilation += `📁 ${file.relativePath} (${file.size} bytes)\n`;
        compilation += '─'.repeat(40) + '\n';
        compilation += readFileContent(file.path);
        compilation += '\n\n' + '═'.repeat(80) + '\n\n';
    }
}

// Guardar
fs.writeFileSync('compilado_completo.txt', compilation, 'utf8');
console.log('✅ COMPILACIÓN COMPLETADA: compilado_completo.txt');
console.log('📊 Resumen por categoría:');
Object.entries(filesByCategory).forEach(([category, files]) => {
    console.log(`   • ${category}: ${files.length} archivos`);
});