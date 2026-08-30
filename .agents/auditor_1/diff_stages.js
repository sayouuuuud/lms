const fs = require('fs');
const path = require('path');

const oldBase = 'C:/Users/ASUS/.gemini/antigravity/brain/5d20df95-ba9c-417a-a01e-0868e85f8cc7/scratch/old_repo';
const newBase = 'd:/Workspace/LMS';

function diffFiles(rel) {
  console.log('====================');
  console.log('DIFF FOR: ' + rel);
  console.log('====================');
  const oldP = path.join(oldBase, rel);
  console.log('Old exists: ' + fs.existsSync(oldP));
  if (fs.existsSync(oldP)) {
    const oldLines = fs.readFileSync(oldP, 'utf8').split('\n');
    const newLines = fs.readFileSync(path.join(newBase, rel), 'utf8').split('\n');
    console.log(`Old lines: ${oldLines.length}, New lines: ${newLines.length}`);
  }
}

[
  'app/stages/[id]/[branchId]/page.tsx',
  'app/stages/[id]/[branchId]/[courseId]/page.tsx',
  'components/stages/subscribe-button.tsx',
  'app/subscriptions/[planId]/page.tsx'
].forEach(diffFiles);