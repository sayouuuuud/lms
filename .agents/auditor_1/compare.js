const fs = require('fs');
const path = require('path');

const oldBase = 'C:/Users/ASUS/.gemini/antigravity/brain/5d20df95-ba9c-417a-a01e-0868e85f8cc7/scratch/old_repo';
const newBase = 'd:/Workspace/LMS';

const targets = [
  'app/globals.css',
  'app/layout.tsx',
  'components/landing/landing-page.tsx',
  'components/landing/landing-navbar.tsx',
  'components/landing/hero-section.tsx',
  'components/landing/features-section.tsx',
  'components/landing/stages-section.tsx',
  'components/landing/stats-section.tsx',
  'components/landing/testimonials-section.tsx',
  'components/landing/cta-section.tsx',
  'components/landing/site-footer.tsx',
  'components/landing/animated-number.tsx',
  'components/landing/math-loader.tsx',
  'components/landing/scroll-refresh.tsx',
  'components/landing/gravity-pills.tsx',
  'components/landing/function-curve.tsx',
  'app/auth/page.tsx',
  'components/auth/auth-form.tsx',
  'app/stages/[id]/page.tsx',
  'app/stages/[id]/[branchId]/page.tsx',
  'app/stages/[id]/[branchId]/[courseId]/page.tsx',
  'components/stages/stage-detail.tsx',
  'components/stages/branch-detail.tsx',
  'components/stages/course-landing.tsx',
  'components/stages/free-lecture-watch.tsx'
];

targets.forEach(rel => {
  const oldP = path.join(oldBase, rel);
  const newP = path.join(newBase, rel);
  const oldExists = fs.existsSync(oldP);
  const newExists = fs.existsSync(newP);
  if (!oldExists && !newExists) {
    console.log('[BOTH MISSING] ' + rel);
  } else if (!oldExists) {
    console.log('[ONLY IN NEW] ' + rel);
  } else if (!newExists) {
    console.log('[ONLY IN OLD] ' + rel);
  } else {
    const oldContent = fs.readFileSync(oldP, 'utf8');
    const newContent = fs.readFileSync(newP, 'utf8');
    if (oldContent === newContent) {
      console.log('[EXACT MATCH] ' + rel + ' (' + newContent.length + ' chars)');
    } else {
      console.log('[MODIFIED/INTEGRATED] ' + rel + ' (old: ' + oldContent.length + ', new: ' + newContent.length + ' chars)');
    }
  }
});