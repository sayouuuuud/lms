const fs = require('fs');  
const glob = require('fs').readdirSync;  
function processDir(dir) {  
  for (const file of fs.readdirSync(dir)) {  
    const fullPath = require('path').join(dir, file);  
    if (fs.statSync(fullPath).isDirectory()) processDir(fullPath);  
    else if (fullPath.endsWith('-header.tsx')) {  
      let content = fs.readFileSync(fullPath, 'utf8');  
      content = content.replace(/useCanManage/g, 'useCanEdit');  
      fs.writeFileSync(fullPath, content);  
    }  
  }  
}  
