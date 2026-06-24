import { enrolledCourses, type CourseProgress } from './student-data'

export type LessonType = 'فيديو' | 'مقال' | 'تمرين'

export type Lesson = {
  id: string
  title: string
  type: LessonType
  duration: string
  completed: boolean
  locked: boolean
  videoUrl?: string
  description?: string
}

export type Section = {
  id: string
  title: string
  lessons: Lesson[]
}

export type AssignmentStatus = 'لم يبدأ' | 'قيد التنفيذ' | 'تم التسليم' | 'مصحّح'

export type Assignment = {
  id: string
  courseId: string
  title: string
  description: string
  instructions: string[]
  dueDate: string
  points: number
  score?: number
  status: AssignmentStatus
  attachments: { name: string; size: string }[]
}

export type CourseDetail = CourseProgress & {
  description: string
  rating: number
  studentsCount: number
  durationHours: number
  level: string
  lastUpdated: string
  sections: Section[]
  whatYouLearn: string[]
}

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

function buildSections(prefix: string, total: number, completed: number): Section[] {
  // Distribute lessons across 4 sections
  const sectionTitles = [
    'مقدمة وتأسيس',
    'المفاهيم الأساسية',
    'تطبيقات عملية',
    'مشروع التخرج',
  ]
  const lessonTitlesPool = [
    'نظرة عامة على المحتوى',
    'تجهيز بيئة العمل',
    'الأساسيات النظرية',
    'تمرين تطبيقي موجّه',
    'دراسة حالة عملية',
    'أفضل الممارسات',
    'حل المشكلات الشائعة',
    'تحدٍّ برمجي',
    'مراجعة الوحدة',
    'إعداد المشروع النهائي',
  ]

  const perSection = Math.ceil(total / sectionTitles.length)
  let counter = 0

  return sectionTitles.map((title, si) => {
    const lessons: Lesson[] = []
    for (let i = 0; i < perSection && counter < total; i++) {
      counter++
      const isDone = counter <= completed
      const isNext = counter === completed + 1
      lessons.push({
        id: `${prefix}-l${counter}`,
        title: lessonTitlesPool[(counter - 1) % lessonTitlesPool.length],
        type: counter % 5 === 0 ? 'تمرين' : counter % 4 === 0 ? 'مقال' : 'فيديو',
        duration: `${8 + ((counter * 3) % 20)}:${counter % 2 === 0 ? '30' : '00'}`,
        completed: isDone,
        locked: !isDone && !isNext && counter > completed + 1,
        videoUrl: SAMPLE_VIDEO,
        description:
          'في هذا الدرس نتناول المفاهيم بشكل عملي مع أمثلة توضيحية وخطوات قابلة للتطبيق مباشرةً.',
      })
    }
    return { id: `${prefix}-s${si + 1}`, title, lessons }
  })
}

const extraMeta: Record<
  string,
  { description: string; whatYouLearn: string[]; level: string }
> = {
  c1: {
    description:
      'كورس شامل لإتقان تطوير واجهات المستخدم باستخدام React من الصفر حتى الاحتراف، مع التركيز على المشاريع العملية وأفضل الممارسات في الصناعة.',
    whatYouLearn: [
      'بناء مكوّنات React قابلة لإعادة الاستخدام',
      'إدارة الحالة باستخدام Hooks و Context',
      'التعامل مع الـ API وجلب البيانات',
      'تحسين الأداء وأفضل ممارسات الكود',
    ],
    level: 'متوسط',
  },
  c2: {
    description:
      'تعلّم أساسيات تصميم تجربة وواجهة المستخدم، من البحث ووضع التصوّرات حتى بناء نماذج تفاعلية احترافية.',
    whatYouLearn: [
      'مبادئ التصميم ونظرية الألوان',
      'بناء أنظمة تصميم متكاملة',
      'إنشاء نماذج أولية تفاعلية',
      'اختبار قابلية الاستخدام',
    ],
    level: 'مبتدئ',
  },
  c3: {
    description:
      'مدخلك إلى عالم علوم البيانات باستخدام لغة Python، مع تحليل بيانات حقيقية وبناء نماذج تنبؤية.',
    whatYouLearn: [
      'أساسيات لغة Python للبيانات',
      'التعامل مع البيانات عبر Pandas',
      'تصوّر البيانات ورسمها بيانياً',
      'مقدمة في تعلّم الآلة',
    ],
    level: 'مبتدئ',
  },
  c4: {
    description:
      'دليلك الكامل لاحتراف التسويق الرقمي وإدارة الحملات الإعلانية الناجحة عبر مختلف المنصات.',
    whatYouLearn: [
      'بناء استراتيجية تسويقية متكاملة',
      'إدارة إعلانات السوشيال ميديا',
      'تحسين محركات البحث SEO',
      'تحليل أداء الحملات',
    ],
    level: 'متوسط',
  },
}

export const courseDetails: CourseDetail[] = enrolledCourses.map((course, idx) => {
  const meta = extraMeta[course.id] ?? {
    description: 'كورس تعليمي متكامل يأخذك خطوة بخطوة نحو الإتقان.',
    whatYouLearn: ['المفاهيم الأساسية', 'التطبيق العملي', 'بناء مشروع متكامل', 'أفضل الممارسات'],
    level: 'متوسط',
  }
  return {
    ...course,
    description: meta.description,
    whatYouLearn: meta.whatYouLearn,
    level: meta.level,
    rating: [4.9, 4.7, 4.8, 4.6][idx % 4],
    studentsCount: [3240, 1890, 2560, 4120][idx % 4],
    durationHours: [28, 22, 35, 18][idx % 4],
    lastUpdated: ['يونيو 2024', 'مايو 2024', 'يونيو 2024', 'أبريل 2024'][idx % 4],
    sections: buildSections(course.id, course.totalLessons, course.completedLessons),
  }
})

export function getCourseDetail(id: string): CourseDetail | undefined {
  return courseDetails.find((c) => c.id === id)
}

export function getCourseLessons(course: CourseDetail): Lesson[] {
  return course.sections.flatMap((s) => s.lessons)
}

export function getLesson(
  courseId: string,
  lessonId: string,
): { course: CourseDetail; lesson: Lesson; index: number; all: Lesson[] } | undefined {
  const course = getCourseDetail(courseId)
  if (!course) return undefined
  const all = getCourseLessons(course)
  const index = all.findIndex((l) => l.id === lessonId)
  if (index === -1) return undefined
  return { course, lesson: all[index], index, all }
}

export const assignments: Assignment[] = [
  {
    id: 'as1',
    courseId: 'c1',
    title: 'بناء لوحة تحكم تفاعلية بـ React',
    description:
      'قم ببناء لوحة تحكم تعرض بيانات المستخدمين مع إمكانية الفلترة والبحث، مستخدماً المكوّنات وإدارة الحالة التي تعلّمناها.',
    instructions: [
      'أنشئ مكوّن جدول لعرض بيانات المستخدمين',
      'أضف خانة بحث لتصفية النتائج فورياً',
      'استخدم Context لإدارة الحالة المشتركة',
      'تأكد من أن التصميم متجاوب مع الجوال',
    ],
    dueDate: '26 يونيو 2024',
    points: 40,
    status: 'قيد التنفيذ',
    attachments: [
      { name: 'متطلبات-المشروع.pdf', size: '320 KB' },
      { name: 'ملف-البيانات.json', size: '78 KB' },
    ],
  },
  {
    id: 'as2',
    courseId: 'c2',
    title: 'تصميم نموذج أولي لتطبيق جوال',
    description:
      'صمّم نموذجاً أولياً تفاعلياً لتطبيق جوال يحتوي على ثلاث شاشات رئيسية مع تطبيق مبادئ التصميم.',
    instructions: [
      'حدّد رحلة المستخدم الأساسية',
      'صمّم ثلاث شاشات على الأقل',
      'طبّق نظام ألوان متناسق',
      'اربط الشاشات بتفاعلات واقعية',
    ],
    dueDate: '28 يونيو 2024',
    points: 30,
    status: 'لم يبدأ',
    attachments: [{ name: 'دليل-الهوية-البصرية.pdf', size: '1.2 MB' }],
  },
  {
    id: 'as3',
    courseId: 'c1',
    title: 'تحليل أداء مكوّنات React',
    description:
      'حلّل أداء تطبيق React معطى وحدّد نقاط الاختناق، ثم طبّق تحسينات لرفع الأداء.',
    instructions: [
      'استخدم React DevTools لقياس الأداء',
      'حدّد المكوّنات التي تُعاد رسمتها بكثرة',
      'طبّق memo و useMemo حيث يلزم',
      'وثّق النتائج قبل وبعد التحسين',
    ],
    dueDate: '20 يونيو 2024',
    points: 25,
    score: 23,
    status: 'مصحّح',
    attachments: [{ name: 'التطبيق-المصدر.zip', size: '540 KB' }],
  },
]

export function getAssignment(id: string): Assignment | undefined {
  return assignments.find((a) => a.id === id)
}

export function getCourseAssignments(courseId: string): Assignment[] {
  return assignments.filter((a) => a.courseId === courseId)
}
