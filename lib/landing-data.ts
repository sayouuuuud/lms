// A single lesson inside a lecture
export type Lesson = {
  id: string
  title: string
  duration: string
  // free preview lessons
  isFree?: boolean
  // youtube video url
  videoUrl?: string | null
}

// A lecture belongs to a branch. The PRICE lives here (not on the branch).
export type Lecture = {
  id: string
  // real database UUID (present when loaded from the DB; used by the cart)
  dbId?: string
  title: string
  description: string
  price: number
  oldPrice?: number
  badge?: string
  // optional admin-uploaded artwork; falls back to /lessons/<slug>.png
  image?: string
  lessons: Lesson[]
  // التصنيف اللي المحاضرة تابعة له داخل الكورس (null = بدون تصنيف)
  sectionId?: string | null
  // محاضرة مجانية: أي زائر يقدر يتفرج عليها ودروسها حتى بدون اشتراك
  isFree?: boolean
}

// تصنيف داخل الكورس يجمّع ويرتّب مجموعة محاضرات (مثال: المراجعة النهائية)
export type CourseSection = {
  id: string
  title: string
}

export type MonthlyCourse = {
  id: string
  dbId?: string
  title: string
  description: string
  image?: string
  price: number
  oldPrice?: number
  badge?: string
  isPublished: boolean
  lectures: Lecture[]
  sections?: CourseSection[]
}

// A branch of the subject (e.g. الكيمياء العضوية). No price — it groups lectures and monthly courses.
export type Branch = {
  id: string
  title: string
  description: string
  image: string
  topics: string[]
  lectures: Lecture[]
  monthlyCourses?: MonthlyCourse[]
}

// A purchasable term that bundles all courses in a stage (ترم أول / ترم تاني)
export type Term = {
  id: string          // DB uuid
  title: string       // e.g. "ترم أول"
  price: number
  oldPrice?: number
}

export type Stage = {
  id: string
  index: string
  title: string
  subtitle: string
  rows: string[]
  formula: string
  image: string
  accent: 'gold' | 'emerald'
  // full-term price for the whole grade (subscribe to everything) — legacy
  termPrice: number
  termOldPrice?: number
  terms?: Term[]      // structured terms (ترم أول, ترم تاني…)
  branches: Branch[]
}

// ── helpers ────────────────────────────────────────────────────────────────
export function buildStaticMonthlyCourses(lectures: Lecture[]): MonthlyCourse[] {
  return lectures.map((lecture) => ({
    id: lecture.id,
    dbId: lecture.dbId,
    title: lecture.title,
    description: lecture.description,
    image: lecture.image || `/lessons/${lecture.id}.png`,
    price: lecture.price,
    oldPrice: lecture.oldPrice,
    badge: lecture.badge,
    isPublished: true,
    lectures: [lecture],
  }))
}

export function getStaticStages(): Stage[] {
  return stages.map((stage) => ({
    ...stage,
    branches: stage.branches.map((branch) => ({
      ...branch,
      monthlyCourses: branch.monthlyCourses && branch.monthlyCourses.length > 0
        ? branch.monthlyCourses
        : buildStaticMonthlyCourses(branch.lectures),
    })),
  }))
}

export function getStage(id: string) {
  return getStaticStages().find((s) => s.id === id)
}

export function getBranch(stageId: string, branchId: string) {
  return getStage(stageId)?.branches.find((b) => b.id === branchId)
}

export function countLessons(branch: Branch) {
  return branch.lectures.reduce((sum, l) => sum + l.lessons.length, 0)
}

export const stages: Stage[] = [
  {
    id: 'sec-1',
    index: '٠١',
    title: 'الصف الأول الثانوي',
    subtitle: 'الأساس المتين: الكيمياء مركز العلوم، الكيمياء الكمية والمول، والمحاليل والأحماض والقواعد.',
    rows: ['الكيمياء مركز العلوم', 'الكيمياء الكمية (المول)', 'المحاليل والأحماض والقواعد'],
    formula: 'n = m / M  (المول والكتلة)',
    image: '/stages/sec-1.jpg',
    accent: 'emerald',
    termPrice: 750,
    termOldPrice: 1100,
    branches: [
      {
        id: 'chem-center',
        title: 'الكيمياء مركز العلوم',
        description: 'مدخل الكيمياء وأهميتها كمركز للعلوم وتكاملها مع الفيزياء والطب وأدوات القياس وتقنية النانو.',
        image: '/lectures/chem-center.png',
        topics: ['الكيمياء والقياس المعملي', 'أدوات القياس في المعمل', 'النانو تكنولوجي والكيمياء', 'تطبيقات النانو والمخاطر'],
        lectures: [
          {
            id: 'measurement',
            title: 'الكيمياء والقياس في المعمل',
            description: 'مفهوم القياس وأدوات المعمل المدرجة واستخداماتها الدقيقة وتعيين الكثافة والـ pH.',
            price: 120,
            badge: 'تأسيس معملي',
            lessons: [
              { id: 'l1', title: 'مفهوم القياس وأهميته في الكيمياء', duration: '15:20', isFree: true },
              { id: 'l2', title: 'أدوات القياس المعملية واستخداماتها', duration: '18:40' },
              { id: 'l3', title: 'مقياس الرقم الهيدروجيني والأدلة', duration: '14:15' },
            ],
          },
          {
            id: 'nanotechnology',
            title: 'كيمياء النانو والمواد النانوية',
            description: 'المقياس النانوي والخواص الفائقة وتصنيف المواد وتطبيقات أنابيب الكربون وكرة البوكي.',
            price: 110,
            lessons: [
              { id: 'l1', title: 'المقياس النانوي والخواص الفريدة', duration: '16:30', isFree: true },
              { id: 'l2', title: 'تصنيف المواد النانوية وأنابيب الكربون', duration: '15:10' },
              { id: 'l3', title: 'تطبيقات وتأثيرات تكنولوجيا النانو', duration: '13:45' },
            ],
          },
        ],
      },
      {
        id: 'quantitative-chem',
        title: 'الكيمياء الكمية (المول والحساب الكيميائي)',
        description: 'فهم المعادلة الكيميائية الموزونة والمول والكتلة المولية وحجم الغاز والنسب المئوية والمادة المحددة.',
        image: '/lectures/quantitative-chem.png',
        topics: ['المعادلة الأيونية والمول', 'حجم الغاز وقانون أفوجادرو', 'الصيغ الكيميائية والنسبة المئوية', 'المادة المحددة للتفاعل والناتج الفعلي'],
        lectures: [
          {
            id: 'mole-concept',
            title: 'المول والمعادلة الكيميائية',
            description: 'وزن المعادلات وحساب الكتلة المولية وعدد أفوجادرو وعلاقة المول بحجم الغازات.',
            price: 130,
            badge: 'الأكثر طلبًا',
            lessons: [
              { id: 'l1', title: 'المعادلة الكيميائية والمول', duration: '16:20', isFree: true },
              { id: 'l2', title: 'الكتلة المولية وعدد الجسيمات', duration: '17:45' },
              { id: 'l3', title: 'حجم الغازات وفرض أفوجادرو', duration: '15:10' },
            ],
          },
          {
            id: 'chemical-formulas',
            title: 'الصيغ والنسبة المئوية وحساب التفاعل',
            description: 'استنتاج الصيغ الأولية والجزيئية وحساب النسبة المئوية الكتلية والناتج الفعلي.',
            price: 125,
            lessons: [
              { id: 'l1', title: 'الصيغة الأولية والجزيئية', duration: '18:00' },
              { id: 'l2', title: 'المادة المحددة للتفاعل والناتج الفعلي', duration: '19:30' },
            ],
          },
        ],
      },
      {
        id: 'solutions-acids',
        title: 'المحاليل والأحماض والقواعد',
        description: 'خواص المحاليل المائية والتركيز المولاري والخواص الجمعية ونظريات الأحماض والقواعد.',
        image: '/lectures/solutions-acids.png',
        topics: ['المحاليل والغرويات والمعلقات', 'التركيز المولاري والمولالي', 'الخواص الجمعية للمحاليل', 'نظريات الأحماض والقواعد والأملاح'],
        lectures: [
          {
            id: 'solution-properties',
            title: 'المحاليل وخواصها والتركيز',
            description: 'تصنيف المحاليل وطرق التعبير عن التركيز وانخفاض الضغط البخاري ودرجة التجمد.',
            price: 125,
            badge: 'تجارب معملية',
            lessons: [
              { id: 'l1', title: 'تصنيف المحاليل وقوى التجاذب', duration: '14:40', isFree: true },
              { id: 'l2', title: 'التركيز المولاري والكسر المولي', duration: '16:15' },
              { id: 'l3', title: 'الخواص الجمعية وانخفاض الضغط البخاري', duration: '17:20' },
            ],
          },
          {
            id: 'acids-bases',
            title: 'الأحماض والقواعد وتفاعلات الأملاح',
            description: 'نظريات أرهينيوس وبرونشتد ولويس وقوة الأحماض والقواعد والأس الهيدروجيني وتكوين الأملاح.',
            price: 120,
            lessons: [
              { id: 'l1', title: 'نظريات أرهينيوس وبرونشتد ولويس', duration: '15:50' },
              { id: 'l2', title: 'الرقم الهيدروجيني pH وتفاعلات المعايرة', duration: '18:30' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sec-2',
    index: '٠٢',
    title: 'الصف الثاني الثانوي',
    subtitle: 'نقطة التحول: بنية الذرة وأطياف الانبعاث، الجدول الدوري وتدرج الخواص، والروابط الكيميائية والتهجين.',
    rows: ['بنية الذرة وأطياف الانبعاث', 'الجدول الدوري وتدرج الخواص', 'الروابط الكيميائية والتهجين'],
    formula: 'E = h·ν  (طاقة الفوتون وتردد الطيف)',
    image: '/stages/sec-2.jpg',
    accent: 'gold',
    termPrice: 850,
    termOldPrice: 1300,
    branches: [
      {
        id: 'atomic-structure',
        title: 'بنية الذرة وأطياف الانبعاث',
        description: 'تطور مفهوم بنية الذرة ونموذج بور وطيف الانبعاث الخطي والنظرية الحديثة وأعداد الكم.',
        image: '/lectures/atomic-structure.png',
        topics: ['نموذج رذرفورد وطومسون', 'طيف الانبعاث الخطي ونموذج بور', 'النظرية الميكانيكية الموجية للذرة', 'أعداد الكم وقواعد التوزيع الإلكتروني'],
        lectures: [
          {
            id: 'bohr-model',
            title: 'طيف الانبعاث ونموذج بور الذري',
            description: 'أشعة المهبط واكتشاف الإلكترون وتجربة رذرفورد وتفسير طيف ذرة الهيدروجين الخطي.',
            price: 140,
            badge: 'الأكثر طلبًا',
            lessons: [
              { id: 'l1', title: 'أشعة المهبط واكتشاف الإلكترون', duration: '15:30', isFree: true },
              { id: 'l2', title: 'طيف الانبعاث الخطي للذرات', duration: '17:00' },
              { id: 'l3', title: 'نموذج بور وفرضياته وقصوره', duration: '16:40' },
            ],
          },
          {
            id: 'quantum-numbers',
            title: 'أعداد الكم وقواعد التوزيع الحديث',
            description: 'أعداد الكم الأربعة وتطبيقات مبدأ البناء التصاعدي وقاعدة هوند ومبدأ باولي.',
            price: 145,
            lessons: [
              { id: 'l1', title: 'أعداد الكم الأربعة (n, l, m, s)', duration: '19:20' },
              { id: 'l2', title: 'مبدأ البناء التصاعدي وقاعدة هوند', duration: '18:15' },
            ],
          },
        ],
      },
      {
        id: 'periodic-table',
        title: 'الجدول الدوري وتدرج الخواص',
        description: 'تصنيف العناصر وتدرج نصف القطر وجهد التأين والميل الإلكتروني والسالبية والأكاسيد.',
        image: '/lectures/periodic-table.png',
        topics: ['تصنيف فئات الجدول الدوري', 'تدرج نصف القطر الذري والأيوني', 'جهد التأين والميل الإلكتروني والسالبية', 'الخاصية الحامضية والقاعدية وأعداد التأكسد'],
        lectures: [
          {
            id: 'periodic-trends',
            title: 'تدرج الخواص الذرية والكهروسالبية',
            description: 'توزيع العناصر في الفئات وتدرج نصف القطر وجهود التأين والميل والسالبية الكهربية.',
            price: 140,
            badge: 'أساس الامتحانات',
            lessons: [
              { id: 'l1', title: 'فئات الجدول الدوري وعناصره', duration: '16:00', isFree: true },
              { id: 'l2', title: 'تدرج نصف القطر وجهد التأين', duration: '18:40' },
              { id: 'l3', title: 'الميل الإلكتروني والسالبية الكهربية', duration: '15:50' },
            ],
          },
          {
            id: 'oxidation-states',
            title: 'الأكاسيد وأعداد التأكسد',
            description: 'تدرج الخواص الفلزية واللافلزية والأكاسيد المترددة وقواعد حساب أعداد التأكسد.',
            price: 130,
            lessons: [
              { id: 'l1', title: 'الخواص الفلزية والحامضية والقاعدية', duration: '17:15' },
              { id: 'l2', title: 'حساب أعداد التأكسد في المركبات', duration: '19:00' },
            ],
          },
        ],
      },
      {
        id: 'chemical-bonds',
        title: 'الروابط الكيميائية والتهجين',
        description: 'الروابط الأيونية والتساهمية ونظريات الترابط وتنافر أزواج الإلكترونات VSEPR والتهجين.',
        image: '/lectures/chemical-bonds.png',
        topics: ['الرابطة الأيونية والتساهمية ونموذج لويس', 'نظرية تنافر أزواج الإلكترونات VSEPR', 'نظرية رابطة التكافؤ والتهجين', 'الرابطة التناسقية والهيدروجينية والفلزية'],
        lectures: [
          {
            id: 'bonding-theories',
            title: 'الروابط التساهمية ونظرية تنافر الأزواج',
            description: 'الرابطة الأيونية والتساهمية والقطبية ونظرية الثمانيات ونظرية VSEPR للأشكال الفراغية.',
            price: 135,
            badge: 'نماذج مجسمة',
            lessons: [
              { id: 'l1', title: 'الرابطة الأيونية والتساهمية وقطبية الجزيئات', duration: '15:20', isFree: true },
              { id: 'l2', title: 'نظرية VSEPR والأشكال الفراغية', duration: '17:50' },
            ],
          },
          {
            id: 'hybridization',
            title: 'التهجين والروابط التناسقية والفيزيائية',
            description: 'مفهوم تداخل الأوربيتالات والتهجين بأنواعه والروابط التناسقية والهيدروجينية والفلزية.',
            price: 140,
            lessons: [
              { id: 'l1', title: 'مفهوم التهجين وأنواعه (sp, sp2, sp3)', duration: '20:10' },
              { id: 'l2', title: 'الرابطة الهيدروجينية والفلزية والتناسقية', duration: '16:30' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sec-3',
    index: '٠٣',
    title: 'الصف الثالث الثانوي',
    subtitle: 'سنة الحسم: العناصر الانتقالية، التحليل الكيميائي، الاتزان، الكيمياء الكهربية، والكيمياء العضوية الشاملة.',
    rows: ['العناصر الانتقالية والتحليل', 'الاتزان والكيمياء الكهربية', 'الكيمياء العضوية الشاملة'],
    formula: 'Kc = [C]^c [D]^d / ([A]^a [B]^b)  |  E°cell = E°c - E°a',
    image: '/stages/sec-3.jpg',
    accent: 'emerald',
    termPrice: 1100,
    termOldPrice: 1600,
    branches: [
      {
        id: 'transition-elements',
        title: 'العناصر الانتقالية والحديد',
        description: 'عناصر السلسلة الانتقالية الأولى، الخواص المغناطيسية والألوان، تعدين وتفاعلات وسبائك وأكاسيد الحديد.',
        image: '/lectures/transition-elements.png',
        topics: ['خواص السلسلة الانتقالية الأولى', 'النشاط الحفزي والخواص المغناطيسية', 'استخلاص الحديد والسبائك', 'أكاسيد الحديد ومخططات التحويلات'],
        lectures: [
          {
            id: 'transition-properties',
            title: 'السلسلة الانتقالية والخواص العامة',
            description: 'التوزيع الإلكتروني وحالات التأكسد والخواص البارا والدايامغناطيسية والنشاط الحفزي والألوان.',
            price: 170,
            badge: 'الأكثر طلبًا',
            lessons: [
              { id: 'l1', title: 'التوزيع الإلكتروني وحالات التأكسد', duration: '18:40', isFree: true },
              { id: 'l2', title: 'الخواص المغناطيسية والنشاط الحفزي والألوان', duration: '19:10' },
            ],
          },
          {
            id: 'iron-reactions',
            title: 'تفاعلات الحديد ومخطط الأكاسيد',
            description: 'خامات واستخلاص الحديد والفرن العالي ومدركس وأكاسيد الحديد الثلاثة ومخطط التحويلات.',
            price: 180,
            badge: 'مخططات ربط',
            lessons: [
              { id: 'l1', title: 'خامات واستخلاص الحديد والفرن العالي ومدركس', duration: '17:30' },
              { id: 'l2', title: 'أكاسيد الحديد الثلاثة والتحويلات المعملية', duration: '22:15' },
            ],
          },
        ],
      },
      {
        id: 'chemical-analysis',
        title: 'التحليل الكيميائي الوصفي والكمي',
        description: 'الكشف عن الأنيونات والكاتيونات بالمعمل، التحليل الحجمي والمعايرة، والتحليل الكتلي بالتطاير والترسيب.',
        image: '/lectures/chemical-analysis.png',
        topics: ['الكشف عن أنيونات الأحماض', 'الكشف عن الكاتيونات الفلزية', 'المعايرة والتحليل الحجمي', 'مسائل التطاير والترسيب'],
        lectures: [
          {
            id: 'qualitative-analysis',
            title: 'التحليل الوصفي والكواشف المعملية',
            description: 'الكشف عن الأنيونات بمجموعات HCl و H2SO4 و BaCl2 وتجارب الكشف عن الكاتيونات الفلزية.',
            price: 175,
            badge: 'تجارب معملية',
            lessons: [
              { id: 'l1', title: 'الكشف عن أنيونات مجموعة حمض الهيدروكلوريك', duration: '19:00', isFree: true },
              { id: 'l2', title: 'الكشف عن أنيونات H2SO4 ومحلول BaCl2', duration: '18:30' },
              { id: 'l3', title: 'الكشف عن المجموعات التحليلية للكاتيونات', duration: '20:10' },
            ],
          },
          {
            id: 'quantitative-analysis',
            title: 'التحليل الكمي والمعايرة والترسيب',
            description: 'قوانين المعايرة وحساب التركيز والنسبة المئوية الكتلية ومسائل التطاير والترسيب.',
            price: 180,
            lessons: [
              { id: 'l1', title: 'المعايرة وحساب التركيز والنسبة المئوية', duration: '21:00' },
              { id: 'l2', title: 'مسائل التطاير وماء التبلر والترسيب', duration: '19:45' },
            ],
          },
        ],
      },
      {
        id: 'chemical-equilibrium',
        title: 'الاتزان الكيميائي والأيوني',
        description: 'سرعة التفاعل الكيميائي، قاعدة لوشاتيليه، ثابت الاتزان Kc و Kp، الاتزان الأيوني والـ pH وحاصل الإذابة Ksp.',
        image: '/lectures/chemical-equilibrium.png',
        topics: ['مفهوم الاتزان وسرعة التفاعل', 'العوامل المؤثرة وقاعدة لوشاتيليه', 'الاتزان الأيوني والرقم الهيدروجيني', 'التميه وحاصل الإذابة Ksp'],
        lectures: [
          {
            id: 'reaction-equilibrium',
            title: 'الاتزان الكيميائي وقاعدة لوشاتيليه',
            description: 'التفاعلات التامة والمنعكسة وثابت الاتزان Kc وقاعدة لوشاتيليه ومخططات طاقة التنشيط.',
            price: 170,
            lessons: [
              { id: 'l1', title: 'التفاعلات التامة والمنعكسة وثابت الاتزان Kc', duration: '18:15', isFree: true },
              { id: 'l2', title: 'قاعدة لوشاتيليه وتأثير الضغط والحرارة والتركيز', duration: '20:30' },
            ],
          },
          {
            id: 'ionic-equilibrium',
            title: 'الاتزان الأيوني وحاصل الإذابة Ksp',
            description: 'تأين الأحماض والقواعد الضعيفة وحسابات الـ pH والـ pOH وقانون أوستفالد وحاصل الإذابة Ksp.',
            price: 175,
            lessons: [
              { id: 'l1', title: 'تأين الإلكتروليتات الضعيفة والـ pH والـ pOH', duration: '19:50' },
              { id: 'l2', title: 'التحلل المائي للأملاح وحاصل الإذابة Ksp', duration: '18:20' },
            ],
          },
        ],
      },
      {
        id: 'electrochemistry',
        title: 'الكيمياء الكهربية والخلايا',
        description: 'الأكسدة والاختزال، الخلايا الجلفانية، متسلسلة الجهود، البطاريات، صدأ الحديد، وقوانين فاراداي.',
        image: '/lectures/electrochemistry.png',
        topics: ['الخلايا الجلفانية وقطب الهيدروجين القياسي', 'متسلسلة الجهود الكهربية وحساب E°cell', 'البطاريات الأولية والثانوية وصدأ المعادن', 'قوانين فاراداي والتحليل الكهربي وتطبيقاته'],
        lectures: [
          {
            id: 'galvanic-cells',
            title: 'الخلايا الجلفانية والبطاريات وصدأ الحديد',
            description: 'خلية دانيال ومتسلسلة الجهود وخلايا الوقود والزئبق ومركم الرصاص وبطارية الليثيوم وصدأ الحديد.',
            price: 175,
            badge: 'الخلايا الحديثة',
            lessons: [
              { id: 'l1', title: 'خلية دانيال ومتسلسلة الجهود الكهربية', duration: '19:30', isFree: true },
              { id: 'l2', title: 'خلية الزئبق وخلايا الوقود وبطارية أيون الليثيوم', duration: '21:10' },
              { id: 'l3', title: 'ميكانيكية صدأ الحديد وطرق حمايته', duration: '17:40' },
            ],
          },
          {
            id: 'faraday-laws',
            title: 'قوانين فاراداي والتحليل الكهربي',
            description: 'قوانين فاراداي ومسائل كمية الكهرباء والفراداي وتطبيقات الطلاء الكهربي وتنقية المعادن.',
            price: 180,
            lessons: [
              { id: 'l1', title: 'قوانين فاراداي الأول والثاني ومسائلها', duration: '22:00' },
              { id: 'l2', title: 'تطبيقات التحليل الكهربي (الطلاء وتنقية الفلزات)', duration: '18:15' },
            ],
          },
        ],
      },
      {
        id: 'organic-chemistry',
        title: 'الكيمياء العضوية الشاملة',
        description: 'الهيدروكربونات الأليفاتية والأروماتية، التسمية بنظام IUPAC، مشتقات الهيدروكربونات، ومخطط التفاعلات.',
        image: '/lectures/organic-chemistry.png',
        topics: ['الهيدروكربونات الأليفاتية (ألكانات، ألكينات، ألكاينات)', 'الهيدروكربونات الحلقية والبنزين العطري', 'الكحولات والفينولات وتفاعلاتها', 'الأحماض الكربوكسيلية والإسترات'],
        lectures: [
          {
            id: 'hydrocarbons',
            title: 'الهيدروكربونات الأليفاتية والأروماتية',
            description: 'التسمية بنظام IUPAC والألكانات والألكينات والألكاينات وتفاعلات الإضافة والبنزين العطري.',
            price: 190,
            badge: 'أساس العضوية',
            lessons: [
              { id: 'l1', title: 'مقدمة العضوية ونظرية القوى الحيوية والتسمية', duration: '21:30', isFree: true },
              { id: 'l2', title: 'الميثان والإيثين والإيثاين وتفاعلات الإضافة', duration: '24:00' },
              { id: 'l3', title: 'البنزين العطري والتفاعلات الأروماتية', duration: '22:45' },
            ],
          },
          {
            id: 'organic-derivatives',
            title: 'مشتقات الهيدروكربونات ومخطط الامتحان',
            description: 'الكحولات والفينولات والأحماض العضوية والإسترات ومخطط الربط الشامل لجميع تفاعلات العضوية.',
            price: 200,
            badge: 'ليالي الامتحان',
            lessons: [
              { id: 'l1', title: 'الكحولات وتصنيفها والأكسدة والفينولات', duration: '23:15' },
              { id: 'l2', title: 'الأحماض العضوية وتفاعل تكوين الإسترات', duration: '21:50' },
              { id: 'l3', title: 'مخطط الربط الشامل لجميع تفاعلات العضوية', duration: '26:00' },
            ],
          },
        ],
      },
    ],
  },
]

export type Feature = {
  step: string
  title: string
  description: string
  icon: string
}

export const features: Feature[] = [
  {
    step: '٠١',
    title: 'شرح تفاعلي للتجارب المعملية',
    description: 'توضيح مسارات التفاعل وآلياته بنماذج مجسمة ثلاثية الأبعاد تحول المعادلات المجردة لفهم بصري عميق.',
    icon: 'lightbulb',
  },
  {
    step: '٠٢',
    title: 'ربط المفاهيم من الذرة للمركب',
    description: 'تأسيس شامل في التوزيع الإلكتروني وأعداد التأكسد والروابط لتسهيل استيعاب الكيمياء الكهربية والعضوية.',
    icon: 'video',
  },
  {
    step: '٠٣',
    title: 'بنك أسئلة الكيمياء الشامل',
    description: 'آلاف الأسئلة المفسرة ونماذج امتحانات مطابقة لأحدث مواصفات الثانوية العامة ونظام نواتج التعلم.',
    icon: 'clipboard',
  },
  {
    step: '٠٤',
    title: 'متابعة دورية وتقارير مستمرة',
    description: 'تحليل تفصيلي لمستواك ونقاط القوة والضعف في كل باب ومتابعة مستمرة مع ولي الأمر خطوة بخطوة.',
    icon: 'chart',
  },
]

export type Stat = {
  value: number
  suffix: string
  label: string
}

export const stats: Stat[] = [
  { value: 25, suffix: '+', label: 'سنة خبرة في تدريس الكيمياء للثانوية العامة' },
  { value: 48000, suffix: '+', label: 'طالب وطالبة حققوا الدرجة النهائية' },
  { value: 1200, suffix: '+', label: 'فيديو شرح وتجارب معملية وبنك أسئلة' },
  { value: 98, suffix: '%', label: 'نسبة تفوق ورضا الطلاب' },
]

export type Testimonial = {
  name: string
  grade: string
  subject: string
  quote: string
  before: number
  after: number
  // monthly grade progression (%) — plotted as a rising chemistry mastery curve
  journey: { month: string; score: number }[]
}

export const testimonials: Testimonial[] = [
  {
    name: 'مريم أحمد',
    grade: 'الصف الثالث الثانوي',
    subject: 'الكيمياء العضوية والكهربية',
    quote:
      'كنت بتعقد من ميكانيزمات العضوية ومعادلات تفاعلات الحديد، مع مستر سليمان عارف بقيت بشوف التفاعل متخيل كل خطوة. قفلت الكيمياء 60/60 وجبت طب بشري!',
    before: 42,
    after: 98,
    journey: [
      { month: 'سبتمبر', score: 42 },
      { month: 'أكتوبر', score: 51 },
      { month: 'نوفمبر', score: 60 },
      { month: 'ديسمبر', score: 68 },
      { month: 'يناير', score: 79 },
      { month: 'فبراير', score: 88 },
      { month: 'مارس', score: 93 },
      { month: 'الامتحان', score: 98 },
    ],
  },
  {
    name: 'يوسف خالد',
    grade: 'الصف الثالث الثانوي',
    subject: 'الاتزان والتحليل الكيميائي',
    quote:
      'مسائل المعايرة والتطاير وثابت الاتزان وقاعدة لوشاتيليه بقت أسهل جزء في الامتحان بفضل طريقة الربط والشرح المنظم وحل أفكار المستويات العليا.',
    before: 55,
    after: 96,
    journey: [
      { month: 'سبتمبر', score: 55 },
      { month: 'أكتوبر', score: 58 },
      { month: 'نوفمبر', score: 66 },
      { month: 'ديسمبر', score: 72 },
      { month: 'يناير', score: 81 },
      { month: 'فبراير', score: 87 },
      { month: 'مارس', score: 91 },
      { month: 'الامتحان', score: 96 },
    ],
  },
  {
    name: 'حبيبة محمود',
    grade: 'الصف الثاني الثانوي',
    subject: 'بنية الذرة والجدول الدوري',
    quote:
      'أول مرة أحس إن الكيمياء ممتعة ومش حفظ، فهم أعداد الكم والروابط والتدرج خلاني أطلع الأولى على المدرسة.',
    before: 48,
    after: 97,
    journey: [
      { month: 'سبتمبر', score: 48 },
      { month: 'أكتوبر', score: 54 },
      { month: 'نوفمبر', score: 63 },
      { month: 'ديسمبر', score: 71 },
      { month: 'يناير', score: 80 },
      { month: 'فبراير', score: 86 },
      { month: 'مارس', score: 92 },
      { month: 'الامتحان', score: 97 },
    ],
  },
]

// Equations used in the background marquee + decorative layers.
export const equations: string[] = [
  '2H₂ + O₂ ⟶ 2H₂O  (ΔH = -286 kJ/mol)',
  'N₂ + 3H₂ ⇌ 2NH₃  (ΔH = -92 kJ/mol)',
  'pH = -log[H⁺]  |  pOH = -log[OH⁻]',
  'PV = nRT  |  n = m / M',
  'Kc = [C]^c [D]^d / ([A]^a [B]^b)',
  'E°cell = E°cathode - E°anode',
  'Ka · Kb = Kw = 1.0 × 10⁻¹⁴',
  'ΔG° = -n F E°cell',
  'CH₄ + 2O₂ ⟶ CO₂ + 2H₂O',
  'Fe₂O₃ + 3CO ⟶ 2Fe + 3CO₂',
]
