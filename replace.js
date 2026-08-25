const fs = require('fs');
const path = require('path');

function processDir(dir) {
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // Match export async function functionName(...)
      const functionRegex = /export\s+async\s+function\s+([a-zA-Z0-9_]+)\s*\(/g;
      let match;
      let functionPositions = [];
      while ((match = functionRegex.exec(content)) !== null) {
        functionPositions.push({ name: match[1], index: match.index });
      }
      
      // Replace 'manage' with 'edit' for non-delete functions
      const newContent = content.replace(/hasResourceAccess\(([^,]+),\s*'manage'\)/g, (fullMatch, resource, offset) => {
        // Find which function this belongs to
        let funcName = null;
        for (let i = functionPositions.length - 1; i >= 0; i--) {
          if (offset > functionPositions[i].index) {
            funcName = functionPositions[i].name;
            break;
          }
        }
        
        if (funcName && (funcName.startsWith('delete') || funcName.startsWith('remove') || funcName.startsWith('destroy') || funcName.startsWith('hardDelete'))) {
          // Keep manage
          return fullMatch;
        } else {
          // Change to edit
          return `hasResourceAccess(${resource}, 'edit')`;
        }
      });
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir('app/admin');
