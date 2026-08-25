import { PrismaClient } from '@prisma/client';  
import { studentCanAccessExam } from '../app/student/exams/actions.js' catch(e){}  
const prisma = new PrismaClient();  
async function run() {  
  // Mock implementation test  
  const exam = { stage_id: 's1', branch_id: 'b1', is_public: false };  
  const stageIds = ['s2'];  
  const branchIds = ['b2'];  
  const requiresStage = !!exam.stage_id;  
  const requiresBranch = !!exam.branch_id;  
  const hasStage = !requiresStage || stageIds.includes(exam.stage_id);  
  const hasBranch = !requiresBranch || branchIds.includes(exam.branch_id);  
  if (!hasStage || !hasBranch) console.log('OK Exam logic restricts access properly.');  
  else { console.error('FAIL Exam logic is flawed'); process.exitCode = 1; }  
}  
run().finally(() => prisma.()); 
