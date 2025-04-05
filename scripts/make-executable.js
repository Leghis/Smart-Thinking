/**
 * Script pour configurer les permissions d'exécution de manière cross-plateforme
 * Compatible avec Windows, Mac et Linux
 */
const fs = require('fs');
const { platform } = require('os');
const { execSync } = require('child_process');
const { join, resolve } = require('path');

const isWindows = platform() === 'win32';
const execPath = resolve(join(__dirname, '..', 'build', 'index.js'));

console.log(`Smart-Thinking: Configuring executable at ${execPath}`);
console.log(`Smart-Thinking: Detected platform: ${platform()}`);

try {
  // Vérification que le fichier existe
  fs.accessSync(execPath);
  
  if (!isWindows) {
    // Unix-like systems: utiliser chmod
    try {
      execSync(`chmod +x "${execPath}"`);
      console.log('Smart-Thinking: File permissions set successfully for Unix-like systems');
    } catch (err) {
      console.log(`Smart-Thinking: Warning - Could not set execution permissions: ${err.message}`);
    }
  } else {
    // Windows: aucune action spécifique nécessaire pour les permissions
    console.log('Smart-Thinking: File exists and is accessible on Windows');
    
    // Vérifier si le fichier a un shebang en première ligne pour Node.js
    const content = fs.readFileSync(execPath, 'utf8');
    if (!content.startsWith('#!/usr/bin/env node')) {
      try {
        // Ajouter un shebang au début du fichier si nécessaire
        fs.writeFileSync(execPath, `#!/usr/bin/env node\n${content}`);
        console.log('Smart-Thinking: Added Node.js shebang to ensure proper execution');
      } catch (writeErr) {
        console.log(`Smart-Thinking: Warning - Could not update file with shebang: ${writeErr.message}`);
      }
    }
  }
} catch (err) {
  console.log(`Smart-Thinking: Script execution permissions setup skipped: ${err.message}`);
}
