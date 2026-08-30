const fs = require('fs');
const path = require('path');

const baseDir = 'd:/Workspace/LMS';

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('// FAKE') || content.includes('// MOCK') || content.includes('return true; // always')) {
    console.log('Suspicious match in: ' + filePath);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git' || e.name === '.agents') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx') || e.name.endsWith('.js') || e.name.endsWith('.mjs')) {
      checkFile(full);
    }
  }
}

walk(baseDir);
console.log('Forensic walk completed.');