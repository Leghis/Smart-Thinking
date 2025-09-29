/**
 * Script pour configurer les permissions d'exécution de manière cross-plateforme
 * Compatible avec Windows, Mac et Linux
 */
const fs = require('fs');
const { platform } = require('os');
const { execSync } = require('child_process');
const { join, resolve } = require('path');

const isWindows = platform() === 'win32';
const targets = [
  resolve(join(__dirname, '..', 'build', 'cli.js'))
];

for (const execPath of targets) {
  console.log(`Smart-Thinking: Configuring executable at ${execPath}`);
  console.log(`Smart-Thinking: Detected platform: ${platform()}`);

  try {
    fs.accessSync(execPath);

    if (!isWindows) {
      try {
        execSync(`chmod +x "${execPath}"`);
        console.log('Smart-Thinking: File permissions set successfully for Unix-like systems');
      } catch (err) {
        console.log(`Smart-Thinking: Warning - Could not set execution permissions: ${err.message}`);
      }
    } else {
      console.log('Smart-Thinking: File exists and is accessible on Windows');

      const content = fs.readFileSync(execPath, 'utf8');
      if (!content.startsWith('#!/usr/bin/env node')) {
        try {
          fs.writeFileSync(execPath, `#!/usr/bin/env node\n${content}`);
          console.log('Smart-Thinking: Added Node.js shebang to ensure proper execution');
        } catch (writeErr) {
          console.log(`Smart-Thinking: Warning - Could not update file with shebang: ${writeErr.message}`);
        }
      }
    }
  } catch (err) {
    console.log(`Smart-Thinking: Script execution permissions setup skipped for ${execPath}: ${err.message}`);
  }
}
