const fs = require('fs');
let code = fs.readFileSync('lib/student-lectures-data.ts', 'utf8');

if (!code.includes('import { hasActiveSubscription, isReleasedFilter }')) {
  code = code.replace(
    "import { prisma } from '@/lib/prisma'\n",
    "import { prisma } from '@/lib/prisma'\nimport { hasActiveSubscription, isReleasedFilter } from '@/lib/subscriptions'\n"
  );
}

const getPurchasedLectureIdsReplacement = `export async function getPurchasedLectureIds(userId: string): Promise<string[]> {
  const isSubscribed = await hasActiveSubscription(userId)
  if (isSubscribed) {
    const allLectures = await prisma.lectures.findMany({
      where: isReleasedFilter,
      select: { id: true }
    })
    return allLectures.map((l: any) => l.id)
  }

  const data = await prisma.orders.findMany({`;

code = code.replace(
  'export async function getPurchasedLectureIds(userId: string): Promise<string[]> {\n  const data = await prisma.orders.findMany({',
  getPurchasedLectureIdsReplacement
);

const getPurchasedCourseIdsReplacement = `export async function getPurchasedCourseIds(userId: string): Promise<string[]> {
  const isSubscribed = await hasActiveSubscription(userId)
  if (isSubscribed) {
    const allCourses = await prisma.monthly_courses.findMany({
      where: isReleasedFilter,
      select: { id: true }
    })
    return allCourses.map((c: any) => c.id)
  }

  const data = await prisma.orders.findMany({`;

code = code.replace(
  'export async function getPurchasedCourseIds(userId: string): Promise<string[]> {\n  const data = await prisma.orders.findMany({',
  getPurchasedCourseIdsReplacement
);

fs.writeFileSync('lib/student-lectures-data.ts', code);
console.log('updated');
