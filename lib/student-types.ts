/**
 * lib/student-types.ts
 * مصدر الأنواع الوحيد لبوابة الطالب.
 * ملفات lib/student-*-data.ts تعمل re-export من هنا للأنواع فقط.
 */

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export type StudentProfileInfo = {
  name: string
  email: string
  phone: string
  avatarUrl: string
  initials: string
  /** الكود مثل STD-1035 */
  code: string
  gender: 'ذكر' | 'أنثى'
  stageTitle: string
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export type ActivityDay = {
  day: string
  hours: number
}

// ---------------------------------------------------------------------------
// Courses & Lessons
// ---------------------------------------------------------------------------

export type LessonType = 'فيديو' | 'مقال' | 'تمرين'

export type Lesson = {
  id: string
  /** UUID من قاعدة البيانات — يُستخدم لحفظ التقدّم */
  lessonId?: string
  title: string
  type: LessonType
  duration: string
  completed: boolean
  locked: boolean
  videoUrl?: string
  description?: string
}

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

export type Section = {
  id: string
  title: string
  lessons: Lesson[]
  assignment?: Assignment
  items?: CourseItem[]
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

export type CourseItem =
  | { kind: 'lesson'; lesson: Lesson; sectionId: string }
  | { kind: 'assignment'; assignment: Assignment; sectionId: string }

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export type AssignmentStatus = 'لم يبدأ' | 'قيد التنفيذ' | 'تم التسليم' | 'مصحّح'
export type AssignmentType = 'تسليم' | 'اختبار'
export type QuestionKind = 'mcq' | 'essay' | 'file'

export type QuizQuestion = {
  id: string
  kind: QuestionKind
  question: string
  options: string[]
  correctIndex: number
}

export type Assignment = {
  id: string
  courseId: string
  sectionId?: string
  type: AssignmentType
  title: string
  description: string
  instructions: string[]
  dueDate: string
  points: number
  score?: number
  status: AssignmentStatus
  attachments: { name: string; size: string }[]
  questions?: QuizQuestion[]
  locked?: boolean
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export type ExamStatus = 'متاح' | 'قادم' | 'مكتمل'

export type ExamQuestion = {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export type Exam = {
  id: string
  title: string
  course: string
  courseId: string
  instructor: string
  category: string
  description: string
  instructions: string[]
  date: string
  time: string
  durationMinutes: number
  totalPoints: number
  passingPercent: number
  status: ExamStatus
  score?: number
  topics: string[]
  questions: ExamQuestion[]
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

export type ScheduleEventType = 'محاضرة' | 'اختبار' | 'واجب' | 'مراجعة' | 'مباشر'

export type ScheduleEvent = {
  id: string
  title: string
  /** yyyy-mm-dd */
  date: string
  /** HH:mm */
  time: string
  type: ScheduleEventType
  course: string
  instructor?: string
  duration?: number
  location?: string
}

/** مختصر للداشبورد */
export type ScheduleItem = {
  id: string
  title: string
  course: string
  type: 'محاضرة' | 'اختبار' | 'واجب' | 'مراجعة'
  day: string
  date: string
  time: string
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

// ---------------------------------------------------------------------------
// Announcements (مشتقة من notifications في DB)
// ---------------------------------------------------------------------------

export type Announcement = {
  id: string
  title: string
  text: string
  time: string
  course: string
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export type InvoiceStatus = 'غير مدفوعة' | 'قيد المراجعة' | 'مدفوعة' | 'مرفوضة'
export type PaymentMethod = 'انستاباي' | 'فودافون كاش'

export type Invoice = {
  id: string
  course: string
  instructor: string
  amount: number
  issuedAt: string
  dueDate: string
  status: InvoiceStatus
  method?: PaymentMethod
  reference?: string
  senderInfo?: string
  submittedAt?: string
  rejectionReason?: string
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type ChatMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

export type TicketStatus = 'open' | 'closed'

export type Conversation = {
  id: string
  name: string
  role: string
  initials: string
  avatar?: string
  subject: string
  status: TicketStatus
  lastTime: string
  unread: number
  messages: ChatMessage[]
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'lesson'
  | 'exam'
  | 'assignment'
  | 'grade'
  | 'message'
  | 'certificate'
  | 'system'

export type Notification = {
  id: string
  type: NotificationType
  title: string
  text: string
  time: string
  read: boolean
}

// ---------------------------------------------------------------------------
// StudentData (Context)
// ---------------------------------------------------------------------------

export type StudentData = {
  profile: StudentProfileInfo
  enrolledCourses: CourseProgress[]
  schedule: ScheduleItem[]
  grades: GradeItem[]
  announcements: Announcement[]
  activity: ActivityDay[]
  notifications: Notification[]
}
