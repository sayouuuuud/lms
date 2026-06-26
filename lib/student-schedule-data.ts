export type ScheduleEventType = 'محاضرة' | 'اختبار' | 'واجب' | 'مراجعة' | 'مباشر'

export type ScheduleEvent = {
  id: string
  title: string
  /** التاريخ بصيغة yyyy-mm-dd */
  date: string
  /** وقت البداية بصيغة HH:mm */
  time: string
  type: ScheduleEventType
  course: string
  instructor?: string
  /** مدة الحدث بالدقائق */
  duration?: number
  location?: string
}

export const scheduleEventTypes: ScheduleEventType[] = [
  'محاضرة',
  'اختبار',
  'واجب',
  'مراجعة',
  'مباشر',
]

/** ألوان كل نوع حدث (متوافقة مع الوضع الفاتح والداكن) */
export const scheduleTypeStyles: Record<
  ScheduleEventType,
  { chip: string; bar: string; dot: string }
> = {
  محاضرة: {
    chip: 'bg-primary/10 text-primary',
    bar: 'border-r-primary',
    dot: 'bg-primary',
  },
  اختبار: {
    chip: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    bar: 'border-r-rose-500',
    dot: 'bg-rose-500',
  },
  واجب: {
    chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    bar: 'border-r-amber-500',
    dot: 'bg-amber-500',
  },
  مراجعة: {
    chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    bar: 'border-r-emerald-500',
    dot: 'bg-emerald-500',
  },
  مباشر: {
    chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    bar: 'border-r-blue-500',
    dot: 'bg-blue-500',
  },
}

// Neutral fallback for unknown event types coming from the database.
export const scheduleTypeStyleFallback = {
  chip: 'bg-secondary text-muted-foreground',
  bar: 'border-r-border',
  dot: 'bg-muted-foreground',
}

/** Safe lookup: never returns undefined for an unexpected event type. */
export function getScheduleTypeStyle(type: string | null | undefined) {
  return scheduleTypeStyles[type as ScheduleEventType] ?? scheduleTypeStyleFallback
}

/** أسماء أيام الأسبوع (يبدأ من السبت) */
export const weekDays = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
]

export const monthNames = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

/** يحوّل تاريخ إلى صيغة yyyy-mm-dd بدون مشاكل التوقيت */
function toKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** يبني تاريخًا نسبيًا للشهر الحالي حتى تظهر الأحداث دائمًا */
function relativeDate(dayOffset: number) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return toKey(d)
}

export const scheduleEvents: ScheduleEvent[] = [
  {
    id: 'SCH-01',
    title: 'إدارة الحالة باستخدام Context',
    date: relativeDate(0),
    time: '19:00',
    type: 'محاضرة',
    course: 'تطوير واجهات React',
    instructor: 'م. أحمد سمير',
    duration: 90,
    location: 'قاعة افتراضية A',
  },
  {
    id: 'SCH-02',
    title: 'جلسة مباشرة: أسئلة وأجوبة',
    date: relativeDate(0),
    time: '21:00',
    type: 'مباشر',
    course: 'أساسيات UI/UX',
    instructor: 'أ. سارة منير',
    duration: 60,
  },
  {
    id: 'SCH-03',
    title: 'اختبار الوحدة الثالثة',
    date: relativeDate(1),
    time: '17:00',
    type: 'اختبار',
    course: 'علوم البيانات وPython',
    instructor: 'د. كريم فؤاد',
    duration: 50,
  },
  {
    id: 'SCH-04',
    title: 'نظرية الألوان في التصميم',
    date: relativeDate(2),
    time: '18:30',
    type: 'محاضرة',
    course: 'أساسيات UI/UX',
    instructor: 'أ. سارة منير',
    duration: 75,
    location: 'قاعة افتراضية B',
  },
  {
    id: 'SCH-05',
    title: 'تسليم مشروع التصميم',
    date: relativeDate(2),
    time: '23:59',
    type: 'واجب',
    course: 'أساسيات UI/UX',
  },
  {
    id: 'SCH-06',
    title: 'مراجعة شاملة قبل الامتحان',
    date: relativeDate(4),
    time: '20:00',
    type: 'مراجعة',
    course: 'التسويق الرقمي',
    instructor: 'أ. ليلى حسن',
    duration: 120,
  },
  {
    id: 'SCH-07',
    title: 'مكتبة Pandas للتعامل مع البيانات',
    date: relativeDate(3),
    time: '19:00',
    type: 'محاضرة',
    course: 'علوم البيانات وPython',
    instructor: 'د. كريم فؤاد',
    duration: 90,
    location: 'قاعة افتراضية A',
  },
  {
    id: 'SCH-08',
    title: 'إعلانات السوشيال ميديا',
    date: relativeDate(5),
    time: '18:00',
    type: 'محاضرة',
    course: 'التسويق الرقمي',
    instructor: 'أ. ليلى حسن',
    duration: 60,
  },
  {
    id: 'SCH-09',
    title: 'تسليم واجب الخطافات المتقدمة',
    date: relativeDate(6),
    time: '23:59',
    type: 'واجب',
    course: 'تطوير واجهات React',
  },
  {
    id: 'SCH-10',
    title: 'اختبار قصير: المتغيرات',
    date: relativeDate(-2),
    time: '17:00',
    type: 'اختبار',
    course: 'علوم البيانات وPython',
    duration: 20,
  },
  {
    id: 'SCH-11',
    title: 'جلسة مباشرة: مراجعة المشاريع',
    date: relativeDate(7),
    time: '20:30',
    type: 'مباشر',
    course: 'تطوير واجهات React',
    instructor: 'م. أحمد سمير',
    duration: 90,
  },
  {
    id: 'SCH-12',
    title: 'الخطافات المتقدمة في React',
    date: relativeDate(9),
    time: '19:00',
    type: 'محاضرة',
    course: 'تطوير واجهات React',
    instructor: 'م. أحمد سمير',
    duration: 90,
    location: 'قاعة افتراضية A',
  },
]
