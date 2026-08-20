# تقرير المسح المعماري الشامل — R2: خريطة الإتقان وهيكل المهارات (Mastery & Taxonomy)

**التاريخ:** 2026-08-20  
**المعد:** Survey Explorer 2 (Taxonomy & Mastery Specialist)  
**الحالة:** مكتمل ومتحقق منه بالكامل

---

## 1. الملخص التنفيذي (Executive Summary)

يقدم هذا التقرير تحليلاً شاملاً وتفصيلياً للوضع الراهن لمنصة LMS فيما يخص هيكل المقررات، المناهج، بنك الأسئلة، تتبع تقدم الطلاب، وأنظمة التقييم، مع وضع التصميم المعماري والرياضي الكامل لمتطلب **R2: شجرة المهارات وخريطة الإتقان (Mastery & Taxonomy)**.

### أهم نتائج المسح:
1. **هيكل المناهج والمحتوى الحالي:** المنصة تعتمد نظاماً هرمياً متعدد الطبقات: `stages` (المراحل/السنوات) -> `branches` (المواد/الفروع) -> `monthly_courses` (الكورسات/الباقات الشهرية) -> `monthly_course_sections` (أقسام الكورس) -> `lectures` (المحاضرات) -> `lessons` (الدروس والفيديوهات)، مع وجود هيكل قديم منفصل (`courses` -> `course_sections` -> `course_lessons`).
2. **فجوة هيكل التصنيف (Taxonomy Gap):** التصنيف الحالي مسطح ومحدود؛ حيث يوجد حقل `topics String[]` في جدول `branches`، وجدول وسوم مسطح `question_bank_topics` بدون أي هيكلية هرمية أو ارتباط بالدروس ونواتج التعلم.
3. **فجوة تتبع الإتقان (Mastery Gap):** يتم اشتقاق مهارات الطلاب حالياً في شاشة البروفايل (`app/admin/students/[id]/actions.ts:461`) كمتوسط تقريبي عام لدرجات امتحانات الفرع ونسبة إكمال الكورسات دون وجود أي تتبع للمهارات الدقيقة أو رصد لتكرار الأخطاء.
4. **الحل المعماري المقترح:** بناء شجرة مهارات هرمية ثلاثية المستويات (مجال/وحدة -> موضوع -> مهارة/مهارة فرعية)، مع جداول ربط متعددة بالدروس والأسئلة والامتحانات، ومحرك تقييم رياضي دقيق يدمج دقة حل التقييمات بالأوزان الزمنية (0.55)، جزاء تكرار الأخطاء (0.20)، اكتمال المحتوى والدروس (0.25)، ومعايرة الثقة الإحصائية (kappa).

---

## 2. المسح التفصيلي للكود وقاعدة البيانات الحالية

### 2.1 هيكلية المقررات والمحتوى (Curriculum Models)

| الكيان / الجدول | مسار الملف / السطور | الدور والوظيفة | الحقول والعلاقات |
|---|---|---|---|
| `stages` | `prisma/schema.prisma:1361` | المرحلة / السنة الدراسية (مثل: الصف الثالث الثانوي) | `id`, `slug`, `title`, `term_price`, `branches[]`, `terms[]` |
| `branches` | `prisma/schema.prisma:622` | المادة / الفرع الدراسي (تفاضل وتكامل، جبر، استاتيكا) | `id`, `stage_id`, `slug`, `title`, `topics String[]` |
| `terms` | `prisma/schema.prisma:1483` | الفصول الدراسية (الترم الأول/الثاني) | `id`, `stage_id`, `title`, `price`, `sort_order` |
| `monthly_courses` | `prisma/schema.prisma:1062` | الكورسات / الباقات الشهرية | `id`, `branch_id`, `term_id`, `slug`, `title`, `price` |
| `monthly_course_sections` | `prisma/schema.prisma:1046` | أسابيع / وحدات الكورس الشهري | `id`, `monthly_course_id`, `title`, `sort_order` |
| `lectures` | `prisma/schema.prisma:941` | المحاضرات التعليمية | `id`, `branch_id`, `monthly_course_id`, `title`, `price`, `lessons[]` |
| `lessons` | `prisma/schema.prisma:994` | الدروس، الفيديوهات والملفات | `id`, `lecture_id`, `slug`, `title`, `duration`, `video_id`, `is_free` |

### 2.2 بنك الأسئلة والامتحانات (Assessment Models)

| الكيان / الجدول | مسار الملف / السطور | الدور والوظيفة | الملاحظات والفجوات |
|---|---|---|---|
| `question_bank_questions` | `prisma/schema.prisma:1673` | بنك الأسئلة المركزي للمنصة | يحتوي على `difficulty`, `auto_difficulty`, `answers_count`, `correct_count` |
| `question_bank_scopes` | `prisma/schema.prisma:1706` | ربط الأسئلة بنطاقات المحتوى (stage, branch, monthly_course, lecture) | متعدد النطاقات Polymorphic |
| `question_bank_topics` | `prisma/schema.prisma:1721` | وسوم المواضيع الحالية | مجرد جدول مسطح (`id`, `title`) بدون تراتبية |
| `question_bank_question_topics` | `prisma/schema.prisma:1731` | ربط الأسئلة بالمواضيع الحالية | Many-to-Many وسوم مسطحة |
| `exams` | `prisma/schema.prisma:890` | الامتحانات والاختبارات | `id`, `code`, `title`, `pass_mark`, `duration`, `branch_id`, `stage_id` |
| `exam_questions` | `prisma/schema.prisma:845` | أسئلة الامتحان الفردية | ترتبط بـ `bank_question_id` ولكن لا ترتبط بمهارات معرفية |
| `exam_submissions` | `prisma/schema.prisma:869` | تسليمات ومحاولات الطلاب | `score`, `total`, `status`, `grading_status`, `auto_score`, `manual_score` |
| `exam_answers` | `prisma/schema.prisma:825` | إجابات الطلاب على كل سؤال | `awarded_points`, `is_correct`, `selected_option`, `needs_manual` |
| `assignments` | `prisma/schema.prisma:563` | التكليفات والواجبات | `points`, `due_date`, `lecture_id`, `assignment_questions[]` |
| `assignment_submissions` | `prisma/schema.prisma:546` | تسليمات الواجبات للطلاب | `score`, `status`, `attachment_url`, `submitted_at` |

### 2.3 تقدم الطالب ونشاط التعلم (Student Progress & Analytics)

1. `student_content_progress` (`prisma/schema.prisma:1389`): تسجيل إكمال الدروس والواجبات (`item_type = 'lesson' | 'assignment'`).
2. `lesson_watch_progress` (`prisma/schema.prisma:1202`): تسجيل نسبة مشاهدة الفيديو (`max_percent`)، الثواني المشاهدة (`watched_seconds`)، وعدد مرات المشاهدة.
3. `lesson_segment_viewers` (`prisma/schema.prisma:1226`): تتبع تفاعل الطالب وانقطاعه عبر 20 شريحة لكل فيديو.
4. `learning_activity` (`prisma/schema.prisma:916`): تسجيل دقائق التعلم اليومية.
5. `student_weekly_goals` (`prisma/schema.prisma:1424`): تتبع أهداف الطالب الأسبوعية (دروس، ساعات، واجبات، امتحانات).

---

## 3. التصميم المعماري لشجرة المهارات وخريطة الإتقان (R2 Architecture)

### 3.1 الهيكل الهرمي لشجرة المهارات (Taxonomy Hierarchy)

الهيكل المعتمد يربط المعرفة التعليمية من المستوى العام إلى ناتج التعلم الدقيق:
```
المادة الدراسية (Branch)
 └── المجال / الوحدة التعليمية (Taxonomy Domain / Unit)
      └── الموضوع التخصصي (Taxonomy Topic)
           └── المهارة الأساسية (Taxonomy Skill)
                └── [اختياري] المهارة الفرعية (Sub-Skill)
```

- **المجال / الوحدة (`taxonomy_domains`):** يمثل الوحدة الكبرى في المنهج (مثل: *الوحدة الأولى: الاستاتيكا - الاحتكاك والعزوم*).
- **الموضوع (`taxonomy_topics`):** يمثل موضوعاً دراسياً محدداً داخل الوحدة (مثل: *اتزان جسم على مستوى مائل خشن*).
- **المهارة (`taxonomy_skills`):** تمثل ناتج التعلم القابل للقياس المباشر (مثل: *تحليل القوى على المستوى المائل وحساب قوة الاحتكاك السكوني النهائي*).

### 3.2 شبكة الربط متعددة الكيانات (Multi-Entity Linking)

1. **الربط بالدروس (`lesson_skills`):**
   - ربط الدروس بالمهارات المشروحة فيها وتحديد المهارة الأساسية (`is_primary`).
   - عند مشاهدة الدرس وإكماله، يحصل الطالب على نقاط اكتمال المحتوى $C_s$ الخاصة بتلك المهارات.
2. **الربط بالأسئلة (`question_bank_question_skills` و `exam_question_skills`):**
   - ربط كل سؤال بمهارة أو أكثر مع تحديد وزن المساهمة (`weight` من 0.1 إلى 1.0).
   - عند إجابة الطالب على السؤال في الامتحان، تُحدَّث مهارات الطالب فوراً.
3. **الربط بالاختبارات والواجبات:**
   - اشتقاق تلقائي لخريطة تغطية المهارات في الامتحان بناءً على أسئلته.

---

## 4. محرك وخوارزمية تقييم مستوى الإتقان (Mastery Assessment Engine)

### 4.1 المعادلة الأساسية لدرجة المهارة ($M_s$)

يتم حساب درجة إتقان الطالب للمهارة $s$ عبر المعادلة المركبة:
$$M_s = W_p \cdot P_s + W_e \cdot E_s + W_c \cdot C_s$$

حيث الأوزان المعيارية:
- $W_p = 0.55$ (أداء الأسئلة والامتحانات - Assessment Performance)
- $W_e = 0.20$ (استقرار الإجابات وخلو الأخطاء - Error Stability)
- $W_c = 0.25$ (اكتمال مشاهدة المحتوى والدروس - Content Completion)

---

### 4.2 تفصيل مكونات المعادلة الرياضية

#### أ) أداء التقييمات ($P_s$ - Assessment Performance)
يُحسب كمتوسط مرجح لحداثة وصعوبة آخر $k$ محاولة (بحد أقصى 10 محاولات):
$$P_s = \frac{\sum_{i=1}^k w_i \cdot \text{score\_ratio}_i}{\sum_{i=1}^k w_i} \times 100$$
حيث معامل الوزن لكل محاولة:
$$w_i = e^{-\lambda \cdot \Delta t_i} \cdot \text{diff\_weight}_i$$
- $\Delta t_i$: الوقت المنقضي بالأيام منذ المحاولة.
- $\lambda = \frac{\ln(2)}{30} \approx 0.0231$ (نصف عمر 30 يوماً لنمذجة منحنى النسيان).
- $\text{diff\_weight}_i$: وزن الصعوبة (سهل = 0.8، متوسط = 1.0، صعب = 1.3).

#### ب) استقرار الإجابات وجزاء تكرار الأخطاء ($E_s$ - Error Repetition Penalty)
تكرار الأخطاء المتتالية يعكس وجود مفهوم خاطئ (Misconception):
- ليكن $C_{\text{err}}$ هو عدد الأخطاء المتتالية الحالية على المهارة (Error Streak).
- ليكن $R_{\text{total}}$ هو إجمالي الأخطاء التاريخية على المهارة.
- دالة الجزاء (Penalty Function):
$$\text{Penalty}(s) = \min\Big(50, (C_{\text{err}} \times 15) + \min(20, R_{\text{total}} \times 3)\Big)$$
- درجة الاستقرار:
$$E_s = \max(0, 100 - \text{Penalty}(s))$$

#### ج) اكتمال المحتوى والدروس ($C_s$ - Content Completion)
متوسط نسب مشاهدة وإكمال الدروس المرتبطة بالمهارة $L_s$:
$$C_s = \begin{cases} \frac{1}{|L_s|} \sum_{l \in L_s} \min\Big(1.0, \frac{\text{watched\_percent}_l}{85}\Big) \times 100 & \text{إذا كان } |L_s| > 0 \\ P_s & \text{إذا لم توجد دروس مرتبطة} \end{cases}$$

---

### 4.3 معايرة الثقة الإحصائية (Confidence Calibration $\kappa_s$)

لمنع إعطاء درجة 100% لطالب حل سؤالاً واحداً بالصدفة:
$$\kappa_s = 1 - e^{-\frac{k}{k_0}} \quad (k_0 = 4)$$
الدرجة المعايرة النهائية:
$$\text{FinalMastery}(s) = \kappa_s \cdot M_s + (1 - \kappa_s) \cdot 50$$

---

### 4.4 مستويات الإتقان وتصنيفاتها (Mastery Status Classification)

| المستوى | الشروط الرياضية | الإجراء المترتب والنظام العلاجي |
|---|---|---|
| **لم يبدأ (`not_started`)** | $k = 0$ ونسبة اكتمال المحتوى $C_s = 0$ | إبراز الدرس التأسيسي الأول في لوحة الطالب |
| **يحتاج مراجعة / متعثر (`needs_review`)** | $\text{FinalMastery} < 60$ أو $C_{\text{err}} \ge 2$ | إدراج في قائمة الإنقاذ واقتراح مراجعة فورية |
| **قيد التطوير / متوسط (`developing`)** | $60 \le \text{FinalMastery} < 85$ و $C_{\text{err}} < 2$ | اقتراح أسئلة تدريبية متوسطة لتعزيز التمكن |
| **متقن (`mastered`)** | $\text{FinalMastery} \ge 85$ و $k \ge 3$ و $\kappa_s \ge 0.6$ | منح شارة الإتقان وفتح التحديات المتقدمة |

---

## 5. سكيما قاعدة البيانات (Prisma & DDL Schema)

```prisma
// ─── Taxonomy & Mastery Schema ──────────────────────────────────────────────

model taxonomy_domains {
  id          String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  branch_id   String            @db.Uuid
  code        String            @unique
  title       String
  description String            @default("")
  sort_order  Int               @default(0)
  icon        String?
  created_at  DateTime          @default(now()) @db.Timestamptz(6)
  updated_at  DateTime          @default(now()) @db.Timestamptz(6)

  branches    branches          @relation(fields: [branch_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  topics      taxonomy_topics[]

  @@index([branch_id], map: "idx_tax_domain_branch")
  @@schema("public")
}

model taxonomy_topics {
  id          String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  domain_id   String            @db.Uuid
  code        String            @unique
  title       String
  description String            @default("")
  sort_order  Int               @default(0)
  created_at  DateTime          @default(now()) @db.Timestamptz(6)
  updated_at  DateTime          @default(now()) @db.Timestamptz(6)

  domains     taxonomy_domains  @relation(fields: [domain_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  skills      taxonomy_skills[]

  @@index([domain_id], map: "idx_tax_topic_domain")
  @@schema("public")
}

model taxonomy_skills {
  id                 String                     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  topic_id           String                     @db.Uuid
  parent_skill_id    String?                    @db.Uuid
  code               String                     @unique
  title              String
  description        String                     @default("")
  importance_weight  Float                      @default(1.0)
  difficulty_level   String                     @default("medium")
  sort_order         Int                        @default(0)
  created_at         DateTime                   @default(now()) @db.Timestamptz(6)
  updated_at         DateTime                   @default(now()) @db.Timestamptz(6)

  topic              taxonomy_topics            @relation(fields: [topic_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  parent_skill       taxonomy_skills?           @relation("SkillSubSkills", fields: [parent_skill_id], references: [id], onDelete: SetNull, onUpdate: NoAction)
  sub_skills         taxonomy_skills[]          @relation("SkillSubSkills")
  
  lesson_skills      lesson_skills[]
  qb_question_skills question_bank_question_skills[]
  exam_question_skills exam_question_skills[]
  student_mastery    student_skill_mastery[]

  @@index([topic_id], map: "idx_tax_skill_topic")
  @@index([parent_skill_id], map: "idx_tax_skill_parent")
  @@schema("public")
}

model lesson_skills {
  lesson_id   String          @db.Uuid
  skill_id    String          @db.Uuid
  is_primary  Boolean         @default(true)
  created_at  DateTime        @default(now()) @db.Timestamptz(6)

  lessons     lessons         @relation(fields: [lesson_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  skills      taxonomy_skills @relation(fields: [skill_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@id([lesson_id, skill_id])
  @@index([skill_id], map: "idx_lesson_skills_skill")
  @@schema("public")
}

model question_bank_question_skills {
  question_id String                  @db.Uuid
  skill_id    String                  @db.Uuid
  weight      Float                   @default(1.0)
  created_at  DateTime                @default(now()) @db.Timestamptz(6)

  question    question_bank_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  skill       taxonomy_skills         @relation(fields: [skill_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@id([question_id, skill_id])
  @@index([skill_id], map: "idx_qbq_skills_skill")
  @@schema("public")
}

model exam_question_skills {
  question_id String          @db.Uuid
  skill_id    String          @db.Uuid
  weight      Float           @default(1.0)
  created_at  DateTime        @default(now()) @db.Timestamptz(6)

  exam_question exam_questions @relation(fields: [question_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  skill       taxonomy_skills  @relation(fields: [skill_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@id([question_id, skill_id])
  @@index([skill_id], map: "idx_eq_skills_skill")
  @@schema("public")
}

model student_skill_mastery {
  id                         String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  student_id                 String          @db.Uuid
  skill_id                   String          @db.Uuid
  mastery_score              Float           @default(0.0)
  status                     String          @default("not_started")
  confidence_score           Float           @default(0.0)
  total_questions_attempted  Int             @default(0)
  correct_answers_count      Int             @default(0)
  consecutive_errors         Int             @default(0)
  total_error_repetition     Int             @default(0)
  content_completion_rate    Float           @default(0.0)
  last_attempt_at            DateTime?       @db.Timestamptz(6)
  last_correct_at            DateTime?       @db.Timestamptz(6)
  history_log                Json            @default("[]")
  created_at                 DateTime        @default(now()) @db.Timestamptz(6)
  updated_at                 DateTime        @default(now()) @db.Timestamptz(6)

  students                   students        @relation(fields: [student_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  skills                     taxonomy_skills @relation(fields: [skill_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@unique([student_id, skill_id], map: "uq_student_skill_mastery")
  @@index([student_id, status], map: "idx_ssm_student_status")
  @@index([skill_id], map: "idx_ssm_skill")
  @@schema("public")
}
```

---

## 6. واجهات الخدمات البرمجية (Service Contracts)

```ts
export type DomainNode = {
  id: string
  code: string
  title: string
  description: string
  sortOrder: number
  topicsCount: number
  skillsCount: number
}

export type TopicNode = {
  id: string
  domainId: string
  code: string
  title: string
  description: string
  sortOrder: number
  skills: SkillNode[]
}

export type SkillNode = {
  id: string
  topicId: string
  parentSkillId: string | null
  code: string
  title: string
  importanceWeight: number
  difficultyLevel: 'easy' | 'medium' | 'hard'
  sortOrder: number
  lessonsCount: number
  questionsCount: number
}

export interface ITaxonomyService {
  getBranchTaxonomyTree(branchId: string): Promise<DomainNode[]>
  saveDomain(input: { id?: string; branchId: string; code: string; title: string; description?: string }): Promise<{ success: boolean; id: string }>
  saveTopic(input: { id?: string; domainId: string; code: string; title: string; description?: string }): Promise<{ success: boolean; id: string }>
  saveSkill(input: { id?: string; topicId: string; parentSkillId?: string; code: string; title: string; difficultyLevel?: string; importanceWeight?: number }): Promise<{ success: boolean; id: string }>
  linkLessonSkills(lessonId: string, skillIds: string[], primarySkillId?: string): Promise<{ success: boolean }>
  linkQuestionSkills(questionId: string, skillWeights: { skillId: string; weight: number }[], source: 'bank' | 'exam'): Promise<{ success: boolean }>
}

export type SkillMasteryResult = {
  skillId: string
  skillTitle: string
  topicTitle: string
  domainTitle: string
  masteryScore: number
  status: 'not_started' | 'needs_review' | 'developing' | 'mastered'
  confidenceScore: number
  totalAttempted: number
  correctCount: number
  consecutiveErrors: number
  totalErrors: number
  contentCompletionRate: number
  lastAttemptAt: Date | null
}

export interface IMasteryEngine {
  processExamSubmission(submissionId: string): Promise<{ updatedSkillsCount: number; masteryResults: SkillMasteryResult[] }>
  processLessonProgress(studentId: string, lessonId: string, watchPercent: number): Promise<void>
  getStudentMasteryMap(studentId: string, branchId: string): Promise<{
    overallScore: number
    domains: { id: string; title: string; score: number; topics: { id: string; title: string; score: number; skills: SkillMasteryResult[] }[] }[]
    weakestSkills: SkillMasteryResult[]
    masteredSkills: SkillMasteryResult[]
  }>
}
```

---

## 7. سيناريوهات ومسارات الاختبار المستقل (Verification Test Scenarios)

1. **اختبار التحديث التلقائي للإتقان:** إنشاء محاولة امتحان تجريبية بأسئلة مربوطة بمهارات، والتحقق من تحديث جدول `student_skill_mastery` تلقائياً فور تصحيح الامتحان.
2. **اختبار جزاء تكرار الأخطاء:** محاكاة 3 إجابات خاطئة متتالية لنفس المهارة، والتأكد من تطبيق خصم الجزاء وهبوط الحالة إلى `needs_review`.
3. **اختبار اكتمال المحتوى:** تسجيل مشاهدة درس مرتبط بمهارة بنسبة 100%، والتأكد من ارتفاع درجة اكتمال المحتوى $C_s$ وتأثيرها على الإتقان العام.
4. **اختبار تكامل نظام الإنقاذ:** التأكد من ظهور المهارات ذات التصنيف `needs_review` في لوحة دعم الطالب واقتراح أسئلة علاجية مناسبة.

---
