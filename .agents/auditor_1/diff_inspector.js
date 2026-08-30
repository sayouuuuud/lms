const fs = require('fs');
const path = require('path');

const oldBase = 'C:/Users/ASUS/.gemini/antigravity/brain/5d20df95-ba9c-417a-a01e-0868e85f8cc7/scratch/old_repo';
const newBase = 'd:/Workspace/LMS';

function diffFiles(rel) {
  console.log('====================');
  console.log('DIFF FOR: ' + rel);
  console.log('====================');
  const oldP = path.join(oldBase, rel);
  const newP = path.join(newBase, rel);
  if (!fs.existsSync(oldP)) {
    console.log('New file (not in old repo)');
    return;
  }
  const oldLines = fs.readFileSync(oldP, 'utf8').split('\n');
  const newLines = fs.readFileSync(newP, 'utf8').split('\n');
  
  // print line counts
  console.log(`Old lines: ${oldLines.length}, New lines: ${newLines.length}`);
  
  // find added or modified sections
  const oldSet = new Set(oldLines.map(l => l.trim()));
  const newSet = new Set(newLines.map(l => l.trim()));
  
  console.log('--- Lines in NEW not in OLD (trimmed sample):');
  newLines.filter(l => l.trim() && !oldSet.has(l.trim())).slice(0, 15).forEach(l => console.log('+ ' + l));
  
  console.log('--- Lines in OLD not in NEW (trimmed sample):');
  oldLines.filter(l => l.trim() && !newSet.has(l.trim())).slice(0, 15).forEach(l => console.log('- ' + l));
}

[
  'components/landing/landing-page.tsx',
  'app/auth/page.tsx',
  'components/auth/auth-form.tsx',
  'app/stages/[id]/page.tsx',
  'components/stages/stage-detail.tsx',
  'components/stages/branch-detail.tsx'
].forEach(diffFiles);