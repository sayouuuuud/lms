import { enrolledCourses } from './student-data'
import type {
  CourseProgress,
  LessonType,
  Lesson,
  Section,
  AssignmentStatus,
  AssignmentType,
  QuestionKind,
  QuizQuestion,
  Assignment,
  CourseItem,
  CourseDetail,
} from './student-types'

// الأنواع مُعرَّفة في lib/student-types.ts — re-export للتوافق مع الاستيرادات الموجودة
export type {
  LessonType,
  Lesson,
  Section,
  AssignmentStatus,
  AssignmentType,
  QuestionKind,
  QuizQuestion,
  Assignment,
  CourseItem,
  CourseDetail,
} from './student-types'

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
    sectionId: 'c1-s1',
    type: 'اختبار',
    title: 'اختبار: أساسيات React',
    description:
      'اختبار قصير لقياس فهمك لأساسيات React التي تناولناها في الوحدة الأولى. اجتزه بعد إكمال دروس الوحدة.',
    instructions: [
      'أجب عن جميع الأسئلة',
      'لكل سؤال إجابة واحدة صحيحة',
      'تحتاج إلى 60% على الأقل للنجاح',
    ],
    dueDate: '26 يونيو 2024',
    points: 10,
    status: 'لم يبدأ',
    attachments: [],
    questions: [
      {
        id: 'q1',
        kind: 'mcq',
        question: 'ما هي الأداة المستخدمة لإدارة الحالة داخل المكوّن في React؟',
        options: ['useState', 'useFetch', 'useRouter', 'useStyle'],
        correctIndex: 0,
      },
      {
        id: 'q2',
        kind: 'mcq',
        question: 'ماذا تُعيد دالة المكوّن (Functional Component) في React؟',
        options: ['كائن CSS', 'عنصر JSX', 'سلسلة نصية فقط', 'دالة أخرى'],
        correctIndex: 1,
      },
      {
        id: 'q3',
        kind: 'mcq',
        question: 'أي خطّاف (Hook) يُستخدم لمشاركة الحالة بين عدة مكوّنات دون تمريرها يدوياً؟',
        options: ['useEffect', 'useMemo', 'useContext', 'useRef'],
        correctIndex: 2,
      },
      {
        id: 'q4',
        kind: 'mcq',
        question: 'متى يُنفَّذ الكود داخل useEffect بمصفوفة اعتماديات فارغة []؟',
        options: [
          'عند كل إعادة رسم',
          'مرة واحدة بعد أول تركيب للمكوّن',
          'لا يُنفَّذ أبداً',
          'عند تغيّر أي حالة',
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: 'as3',
    courseId: 'c1',
    sectionId: 'c1-s3',
    type: 'تسليم',
    title: 'بناء لوحة تحكم تفاعلية بـ React',
    description:
      'قم ببناء لوحة تحكم تعرض بيانات المستخدمين مع إمكانية الفلترة والبحث، مستخدماً المكوّنات وإدارة الحالة التي تعلّمناها.',
    instructions: [
      'أنشئ مكوّن جدول لعرض بيانات المستخدمين',
      'أضف خانة بحث لتصفية النتائج فورياً',
      'استخدم Context لإدارة الحالة المشتركة',
      'تأكد من أن التصميم متجاوب مع الجوال',
    ],
    dueDate: '28 يونيو 2024',
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
    sectionId: 'c2-s2',
    type: 'تسليم',
    title: 'تصميم نموذج أولي لتطبيق جوال',
    description:
      'صمّم نموذجاً أولياً تفاعلياً لتطبيق جوال يحتوي على ثلاث شاشات رئيسية مع تطبيق مبادئ التصميم.',
    instructions: [
      'حدّد رحلة المستخدم الأساسية',
      'صمّم ثلاث شاشات على الأقل',
      'طبّق نظام ألوان متناسق',
      'اربط الشاشات بتفاعلات واقعية',
    ],
    dueDate: '30 يونيو 2024',
    points: 30,
    status: 'لم يبدأ',
    attachments: [{ name: 'دليل-الهوية-البصرية.pdf', size: '1.2 MB' }],
  },
  {
    id: 'as4',
    courseId: 'c3',
    type: 'تسليم',
    title: 'تحليل مجموعة بيانات باستخدام Pandas',
    description:
      'حمّل مجموعة البيانات المرفقة ونظّفها ثم استخرج ثلاث رؤى تحليلية مدعومة برسوم بيانية واضحة.',
    instructions: [
      'نظّف البيانات وتعامل مع القيم المفقودة',
      'استخدم Pandas لاستخراج الإحصائيات',
      'ارسم مخططين بيانيين على الأقل',
      'اكتب ملخصاً للرؤى المستخلصة',
    ],
    dueDate: '22 يونيو 2024',
    points: 35,
    score: 32,
    status: 'مصحّح',
    attachments: [{ name: 'sales-data.csv', size: '210 KB' }],
  },
  {
    id: 'as5',
    courseId: 'c4',
    type: 'تسليم',
    title: 'إعداد خطة حملة إعلانية متكاملة',
    description:
      'جهّز خطة حملة إعلانية لمنتج افتراضي تشمل الجمهور المستهدف والميزانية والقنوات ومؤشرات الأداء.',
    instructions: [
      'حدّد شريحة الجمهور المستهدف',
      'وزّع الميزانية على القنوات',
      'اقترح مؤشرات أداء قابلة للقياس',
    ],
    dueDate: '23 يونيو 2024',
    points: 25,
    status: 'تم التسليم',
    attachments: [{ name: 'قالب-الخطة.docx', size: '95 KB' }],
  },
  {
    id: 'as6',
    courseId: 'c2',
    type: 'تسليم',
    title: 'مراجعة تجربة مستخدم لتطبيق شهير',
    description:
      'اختر تطبيقاً تستخدمه يومياً وقدّم تحليلاً نقدياً لتجربة المستخدم مع اقتراحات للتحسين.',
    instructions: [
      'حدّد ثلاث نقاط احتكاك في التجربة',
      'اقترح حلولاً عملية لكل نقطة',
      'ادعم تحليلك بلقطات شاشة',
    ],
    dueDate: '2 يوليو 2024',
    points: 20,
    status: 'قيد التنفيذ',
    attachments: [],
  },
]

// اربط كل واجب/اختبار بالوحدة التي ينتمي إليها داخل الكورس
for (const course of courseDetails) {
  for (const section of course.sections) {
    section.assignment = assignments.find((a) => a.sectionId === section.id)
  }
}

export function getAssignment(id: string): Assignment | undefined {
  return assignments.find((a) => a.id === id)
}

export function getCourseAssignments(courseId: string): Assignment[] {
  return assignments.filter((a) => a.courseId === courseId)
}

/** عناصر الوحدة مرتّبة (دروس وواجبات متداخلة كما رتّبها الأدمن) */
export function getSectionItems(section: Section): CourseItem[] {
  // Prefer the explicit ordered list when present (real lecture data).
  if (section.items && section.items.length > 0) return section.items
  const items: CourseItem[] = section.lessons.map((lesson) => ({
    kind: 'lesson' as const,
    lesson,
    sectionId: section.id,
  }))
  if (section.assignment) {
    items.push({
      kind: 'assignment',
      assignment: section.assignment,
      sectionId: section.id,
    })
  }
  return items
}

/** تدفّق محتوى الكورس مرتّباً عبر كل الوحدات */
export function getCourseItems(course: CourseDetail): CourseItem[] {
  return course.sections.flatMap((section) => getSectionItems(section))
}

/**
 * هل الواجب مفتوح؟ يصبح مفتوحاً عندما تكتمل كل الدروس التي تسبقه في الترتيب.
 */
export function isAssignmentUnlocked(course: CourseDetail, assignmentId: string): boolean {
  const items = getCourseItems(course)
  const index = items.findIndex(
    (it) => it.kind === 'assignment' && it.assignment.id === assignmentId,
  )
  if (index === -1) return true
  // كل الدروس التي تسبق الواجب يجب أن تكون مكتملة.
  return items
    .slice(0, index)
    .every((it) => it.kind !== 'lesson' || it.lesson.completed)
}
