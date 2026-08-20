const fs = require('fs');
const text = fs.readFileSync('scripts/004_release_and_subscriptions.sql', 'utf8');

const wantedLines = text.split('\n').filter(line => {
    if (line.includes('DROP CONSTRAINT')) return false;
    if (line.includes('-- DropForeignKey')) return false;
    if (line.includes('ALTER TABLE "exam_attempts"')) return false;
    if (line.includes('ALTER COLUMN "status"')) return false;
    if (line.includes('exam_answers_question_id_fkey')) return false;
    if (line.includes('exam_attempts_idempotency_key_key')) return false;
    if (line.includes('idx_exam_attempts_expires')) return false;
    if (line.includes('-- AddForeignKey') && line.includes('exam_answers')) return false;
    if (line.includes('ALTER COLUMN "started_at" SET DEFAULT CURRENT_TIMESTAMP')) return false;
    if (line.includes('ALTER COLUMN "last_heartbeat_at" SET DEFAULT CURRENT_TIMESTAMP')) return false;
    if (line.includes('ALTER COLUMN "idempotency_key" SET DATA TYPE TEXT')) return false;
    if (line.includes('ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP')) return false;
    if (line.includes('ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP')) return false;
    return true;
});

// We need to clean up floating -- AlterTable and empty lines left over
let finalLines = [];
for (let i = 0; i < wantedLines.length; i++) {
    if (wantedLines[i].includes('-- AlterTable') && (wantedLines[i+1] === '' || wantedLines[i+1].includes('-- '))) {
        // Skip orphaned comment
        continue;
    }
    if (wantedLines[i].includes('-- AddForeignKey') && (wantedLines[i+1] === '' || wantedLines[i+1].includes('-- '))) {
        continue;
    }
    finalLines.push(wantedLines[i]);
}

fs.writeFileSync('scripts/004_release_and_subscriptions.sql', finalLines.join('\n').replace(/\n\n\n+/g, '\n\n').trim() + '\n');
