const fs = require('fs');
let code = fs.readFileSync('lib/student-lectures-data.ts', 'utf8');

const replacement = `export async function getEnrolledMonthlyCourses(): Promise<EnrolledMonthlyCourse[]> {
  const session = await auth()
  const user = session?.user
  if (!user || !user.id) return []

  const isSubscribed = await hasActiveSubscription(user.id)
  const enrolledAtByCourse = new Map<string, string>()

  if (isSubscribed) {
    const allCourses = await prisma.monthly_courses.findMany({
      where: isReleasedFilter,
      select: { id: true, created_at: true }
    })
    for (const c of allCourses) {
      enrolledAtByCourse.set(c.id, (c.created_at || new Date()).toISOString())
    }
  } else {
    const orderRows = await prisma.orders.findMany({
      where: { student_id: user.id, status: 'approved' },
      select: { created_at: true, order_items: { select: { monthly_course_id: true, item_type: true } } }
    })
    
    if (orderRows) {
      for (const order of orderRows) {
        for (const item of order.order_items) {
          if (item.item_type === 'course_bundle' && item.monthly_course_id) {
            const existing = enrolledAtByCourse.get(item.monthly_course_id)
            const created = order.created_at.toISOString()
            if (!existing || new Date(created) < new Date(existing)) {
              enrolledAtByCourse.set(item.monthly_course_id, created)
            }
          }
        }
      }
    }
  }

  const courseIds = [...enrolledAtByCourse.keys()]
  if (courseIds.length === 0) return []`;

code = code.replace(
  /export async function getEnrolledMonthlyCourses\(\): Promise<EnrolledMonthlyCourse\[\]> \{[\s\S]*?if \(courseIds\.length === 0\) return \[\]/,
  replacement
);

fs.writeFileSync('lib/student-lectures-data.ts', code);
