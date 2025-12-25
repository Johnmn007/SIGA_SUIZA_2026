// tools/gen_structure.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌳 GENERADOR DE ESTRUCTURA EN ÁRBOL - SIGA\n');

// Configuración
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'tools'];
const IGNORE_FILES = ['.DS_Store', '.env', 'gen_structure.js', 'arbol.txt'];
const MAX_DEPTH = 5;

function generateTree(startPath = '.') {
    function buildTree(currentPath, depth = 0, prefix = '', isLast = true) {
        if (depth > MAX_DEPTH) return '';
        
        try {
            const items = fs.readdirSync(currentPath)
                .filter(item => !IGNORE_DIRS.includes(item) && !IGNORE_FILES.includes(item))
                .sort((a, b) => {
                    // Directorios primero, luego archivos
                    const aIsDir = fs.statSync(path.join(currentPath, a)).isDirectory();
                    const bIsDir = fs.statSync(path.join(currentPath, b)).isDirectory();
                    return bIsDir - aIsDir;
                });

            let tree = '';
            const connector = isLast ? '└── ' : '├── ';
            
            if (depth === 0) {
                tree += path.basename(currentPath) + '/\n';
            } else {
                tree += prefix + connector + path.basename(currentPath) + (items.length ? '/' : '') + '\n';
            }

            items.forEach((item, index) => {
                const fullPath = path.join(currentPath, item);
                const itemIsLast = index === items.length - 1;
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                
                if (fs.statSync(fullPath).isDirectory()) {
                    tree += buildTree(fullPath, depth + 1, newPrefix, itemIsLast);
                } else {
                    tree += newPrefix + (itemIsLast ? '└── ' : '├── ') + item + '\n';
                }
            });

            return tree;
        } catch (error) {
            return prefix + '└── [Error leyendo directorio]\n';
        }
    }

    return buildTree(startPath);
}

// Generar y guardar estructura
const moduleName = path.basename(process.cwd());
const treeStructure = generateTree();
const outputContent = `🌳 ESTRUCTURA EN ÁRBOL - MÓDULO: ${moduleName}\n📅 Generado: ${new Date().toLocaleString()}\n\n${treeStructure}\n✅ Archivo generado por gen_structure.js`;

// Guardar en archivo
fs.writeFileSync('arbol.txt', outputContent, 'utf8');

console.log(`📂 MÓDULO: ${moduleName}`);
console.log('📊 ESTRUCTURA GENERADA EN: arbol.txt');
console.log('✅ Proceso completado - Puedes eliminar gen_structure.js');