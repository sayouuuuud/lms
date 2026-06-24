export type CourseProgress = {
  id: string
  title: string
  instructor: string
  image: string
  category: string
  completedLessons: number
  totalLessons: number
  nextLesson: string
}

export type ScheduleItem = {
  id: string
  title: string
  course: string
  type: 'محاضرة' | 'اختبار' | 'واجب' | 'مراجعة'
  day: string
  date: string
  time: string
}

export type SessionType = 'محاضرة' | 'اختبار' | 'واجب' | 'مراجعة' | 'مباشر'

export type WeekDay =
  | 'السبت'
  | 'الأحد'
  | 'الإثنين'
  | 'الثلاثاء'
  | 'الأربعاء'
  | 'الخميس'
  | 'الجمعة'

export type SessionItem = {
  id: string
  title: string
  course: string
  instructor: string
  type: SessionType
  day: WeekDay
  date: string
  startTime: string
  endTime: string
  location: string
  isLive?: boolean
}

export type GradeItem = {
  id: string
  title: string
  course: string
  score: number
  total: number
  date: string
}

export type Certificate = {
  id: string
  title: string
  issuer: string
  date: string
}

export type Announcement = {
  id: string
  title: string
  text: string
  time: string
  course: string
}

export const studentProfile = {
  name: 'مريم خالد',
  email: 'mariam.khaled@email.com',
  initials: 'م خ',
  level: 'طالبة مجتهدة',
  id: 'STD-1035',
  gender: 'أنثى' as const,
}

export const enrolledCourses: CourseProgress[] = [
  {
    id: 'c1',
    title: 'تطوير واجهات React الاحترافية',
    instructor: 'م. أحمد سمير',
    image: '/react-course.png',
    category: 'برمجة',
    completedLessons: 18,
    totalLessons: 24,
    nextLesson: 'إدارة الحالة باستخدام Context',
  },
  {
    id: 'c2',
    title: 'أساسيات تصميم واجهات المستخدم UI/UX',
    instructor: 'أ. سارة منير',
    image: '/ui-ux-design-course.png',
    category: 'تصميم',
    completedLessons: 9,
    totalLessons: 20,
    nextLesson: 'نظرية الألوان في التصميم',
  },
  {
    id: 'c3',
    title: 'مقدمة في علوم البيانات وPython',
    instructor: 'د. كريم فؤاد',
    image: '/data-science-python-course.png',
    category: 'بيانات',
    completedLessons: 5,
    totalLessons: 30,
    nextLesson: 'مكتبة Pandas للتعامل مع البيانات',
  },
  {
    id: 'c4',
    title: 'التسويق الرقمي من الصفر للاحتراف',
    instructor: 'أ. ليلى حسن',
    image: '/digital-marketing-course.png',
    category: 'تسويق',
    completedLessons: 12,
    totalLessons: 16,
    nextLesson: 'إعلانات السوشيال ميديا',
  },
]

export const upcomingSchedule: ScheduleItem[] = [
  {
    id: 's1',
    title: 'إدارة الحالة باستخدام Context',
    course: 'تطوير واجهات React',
    type: 'محاضرة',
    day: 'اليوم',
    date: '24 يونيو',
    time: '07:00 م',
  },
  {
    id: 's2',
    title: 'اختبار الوحدة الثالثة',
    course: 'علوم البيانات وPython',
    type: 'اختبار',
    day: 'غداً',
    date: '25 يونيو',
    time: '05:00 م',
  },
  {
    id: 's3',
    title: 'تسليم مشروع التصميم',
    course: 'أساسيات UI/UX',
    type: 'واجب',
    day: 'الخميس',
    date: '26 يونيو',
    time: '11:59 م',
  },
  {
    id: 's4',
    title: 'مراجعة شاملة قبل الامتحان',
    course: 'التسويق الرقمي',
    type: 'مراجعة',
    day: 'السبت',
    date: '28 يونيو',
    time: '08:00 م',
  },
]

export const recentGrades: GradeItem[] = [
  {
    id: 'g1',
    title: 'اختبار الوحدة الثانية',
    course: 'تطوير واجهات React',
    score: 47,
    total: 50,
    date: 'منذ يومين',
  },
  {
    id: 'g2',
    title: 'واجب تصميم لوحة تحكم',
    course: 'أساسيات UI/UX',
    score: 38,
    total: 40,
    date: 'منذ 4 أيام',
  },
  {
    id: 'g3',
    title: 'اختبار قصير - المتغيرات',
    course: 'علوم البيانات وPython',
    score: 18,
    total: 20,
    date: 'منذ أسبوع',
  },
  {
    id: 'g4',
    title: 'تحليل حملة تسويقية',
    course: 'التسويق الرقمي',
    score: 27,
    total: 30,
    date: 'منذ أسبوع',
  },
]

export const certificates: Certificate[] = [
  { id: 'cert1', title: 'أساسيات HTML و CSS', issuer: 'منصة تعليمية', date: 'مايو 2024' },
  { id: 'cert2', title: 'مقدمة في JavaScript', issuer: 'منصة تعليمية', date: 'أبريل 2024' },
]

export const announcements: Announcement[] = [
  {
    id: 'a1',
    title: 'تم إضافة درس جديد',
    text: 'تم رفع درس "الخطافات المتقدمة" في كورس React',
    time: 'منذ ساعة',
    course: 'تطوير واجهات React',
  },
  {
    id: 'a2',
    title: 'تذكير بموعد التسليم',
    text: 'باقي يومان على تسليم مشروع التصميم النهائي',
    time: 'منذ 3 ساعات',
    course: 'أساسيات UI/UX',
  },
  {
    id: 'a3',
    title: 'تعديل موعد المحاضرة',
    text: 'تم تأجيل محاضرة الغد إلى الساعة 6 مساءً',
    time: 'أمس',
    course: 'علوم البيانات',
  },
]

export const weekDays: WeekDay[] = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
]

export const weeklySchedule: SessionItem[] = [
  {
    id: 'ws1',
    title: 'إدارة الحالة باستخدام Context',
    course: 'تطوير واجهات React',
    instructor: 'م. أحمد سمير',
    type: 'محاضرة',
    day: 'السبت',
    date: '24 يونيو',
    startTime: '07:00 م',
    endTime: '08:30 م',
    location: 'غرفة Zoom الرئيسية',
    isLive: true,
  },
  {
    id: 'ws2',
    title: 'نظرية الألوان في التصميم',
    course: 'أساسيات UI/UX',
    instructor: 'أ. سارة منير',
    type: 'محاضرة',
    day: 'السبت',
    date: '24 يونيو',
    startTime: '09:00 م',
    endTime: '10:00 م',
    location: 'غرفة التصميم',
  },
  {
    id: 'ws3',
    title: 'جلسة مباشرة: أسئلة وأجوبة',
    course: 'علوم البيانات وPython',
    instructor: 'د. كريم فؤاد',
    type: 'مباشر',
    day: 'الأحد',
    date: '25 يونيو',
    startTime: '05:00 م',
    endTime: '06:00 م',
    location: 'بث مباشر',
  },
  {
    id: 'ws4',
    title: 'اختبار الوحدة الثالثة',
    course: 'علوم البيانات وPython',
    instructor: 'د. كريم فؤاد',
    type: 'اختبار',
    day: 'الأحد',
    date: '25 يونيو',
    startTime: '07:00 م',
    endTime: '08:00 م',
    location: 'منصة الاختبارات',
  },
  {
    id: 'ws5',
    title: 'مكتبة Pandas للتعامل مع البيانات',
    course: 'علوم البيانات وPython',
    instructor: 'د. كريم فؤاد',
    type: 'محاضرة',
    day: 'الإثنين',
    date: '26 يونيو',
    startTime: '06:00 م',
    endTime: '07:30 م',
    location: 'غرفة Zoom الرئيسية',
  },
  {
    id: 'ws6',
    title: 'تسليم مشروع التصميم',
    course: 'أساسيات UI/UX',
    instructor: 'أ. سارة منير',
    type: 'واجب',
    day: 'الإثنين',
    date: '26 يونيو',
    startTime: '11:59 م',
    endTime: '11:59 م',
    location: 'تسليم إلكتروني',
  },
  {
    id: 'ws7',
    title: 'إعلانات السوشيال ميديا',
    course: 'التسويق الرقمي',
    instructor: 'أ. ليلى حسن',
    type: 'محاضرة',
    day: 'الثلاثاء',
    date: '27 يونيو',
    startTime: '08:00 م',
    endTime: '09:30 م',
    location: 'غرفة التسويق',
  },
  {
    id: 'ws8',
    title: 'الخطافات المتقدمة في React',
    course: 'تطوير واجهات React',
    instructor: 'م. أحمد سمير',
    type: 'محاضرة',
    day: 'الأربعاء',
    date: '28 يونيو',
    startTime: '07:00 م',
    endTime: '08:30 م',
    location: 'غرفة Zoom الرئيسية',
  },
  {
    id: 'ws9',
    title: 'مراجعة شاملة قبل الامتحان',
    course: 'التسويق الرقمي',
    instructor: 'أ. ليلى حسن',
    type: 'مراجعة',
    day: 'الخميس',
    date: '29 يونيو',
    startTime: '08:00 م',
    endTime: '09:00 م',
    location: 'غرفة التسويق',
  },
  {
    id: 'ws10',
    title: 'ورشة تطبيقية: بناء لوحة تحكم',
    course: 'تطوير واجهات React',
    instructor: 'م. أحمد سمير',
    type: 'مباشر',
    day: 'الخميس',
    date: '29 يونيو',
    startTime: '10:00 م',
    endTime: '11:30 م',
    location: 'بث مباشر',
  },
]

// weekly learning hours
export const learningActivity = [
  { day: 'السبت', hours: 2.5 },
  { day: 'الأحد', hours: 1.8 },
  { day: 'الإثنين', hours: 3.2 },
  { day: 'الثلاثاء', hours: 2.1 },
  { day: 'الأربعاء', hours: 4 },
  { day: 'الخميس', hours: 1.5 },
  { day: 'الجمعة', hours: 2.8 },
]
