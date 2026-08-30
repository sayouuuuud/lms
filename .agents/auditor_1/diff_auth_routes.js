const fs = require('fs');
const path = require('path');

const oldBase = 'C:/Users/ASUS/.gemini/antigravity/brain/5d20df95-ba9c-417a-a01e-0868e85f8cc7/scratch/old_repo';
const newBase = 'd:/Workspace/LMS';

[
  'app/auth/forgot-password/route.ts',
  'app/auth/reset-password/route.ts',
  'lib/email.ts'
].forEach(rel => {
  const oldP = path.join(oldBase, rel);
  const newP = path.join(newBase, rel);
  console.log('=== ' + rel + ' ===');
  console.log('Old exists: ' + fs.existsSync(oldP) + ', New exists: ' + fs.existsSync(newP));
  if (fs.existsSync(oldP) && fs.existsSync(newP)) {
    const oldC = fs.readFileSync(oldP, 'utf8');
    const newC = fs.readFileSync(newP, 'utf8');
    console.log('Exact match: ' + (oldC === newC));
  }
});