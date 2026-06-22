export const revenueData = [
  { month: 'يناير', revenue: 20000 },
  { month: 'فبراير', revenue: 32000 },
  { month: 'مارس', revenue: 41000 },
  { month: 'أبريل', revenue: 52430 },
  { month: 'مايو', revenue: 47000 },
  { month: 'يونيو', revenue: 63000 },
]

export const studentsData = [
  { month: 'يناير', students: 4200 },
  { month: 'فبراير', students: 6100 },
  { month: 'مارس', students: 8100 },
  { month: 'أبريل', students: 9400 },
  { month: 'مايو', students: 10800 },
  { month: 'يونيو', students: 12560 },
]

export const activityData = [
  { day: 'السبت', value: 320 },
  { day: 'الأحد', value: 530 },
  { day: 'الإثنين', value: 660 },
  { day: 'الثلاثاء', value: 560 },
  { day: 'الأربعاء', value: 740 },
  { day: 'الخميس', value: 350 },
  { day: 'الجمعة', value: 140 },
]

export const topCourses = [
  {
    title: 'البرمجة باستخدام Python',
    students: '1,250 طالب',
    revenue: '32,450 ج.م',
    image: '/courses/python.png',
  },
  {
    title: 'تصميم واجهات المستخدم UI/UX',
    students: '980 طالب',
    revenue: '24,300 ج.م',
    image: '/courses/uiux.png',
  },
  {
    title: 'التسويق الرقمي الشامل',
    students: '760 طالب',
    revenue: '18,600 ج.م',
    image: '/courses/marketing.png',
  },
  {
    title: 'تعلم اللغة الإنجليزية',
    students: '650 طالب',
    revenue: '15,200 ج.م',
    image: '/courses/english.png',
  },
  {
    title: 'تحليل البيانات باستخدام Excel',
    students: '540 طالب',
    revenue: '12,800 ج.م',
    image: '/courses/excel.png',
  },
]

export const messages = [
  {
    name: 'أحمد خالد',
    text: 'السلام عليكم، عندي استفسار بخصوص...',
    time: 'منذ 5 دقائق',
    unread: true,
  },
  {
    name: 'سارة محمد',
    text: 'متى سيتم إضافة كورس جديد في...',
    time: 'منذ 30 دقيقة',
    unread: true,
  },
  {
    name: 'محمود علي',
    text: 'شكراً لكم على الدعم الرائع',
    time: 'منذ ساعة',
    unread: false,
  },
]

export const payments = [
  {
    id: '#5487',
    name: 'أحمد خالد',
    course: 'كورس Python للمبتدئين',
    amount: '450 ج.م',
    status: 'ناجح' as const,
  },
  {
    id: '#5486',
    name: 'نورهان السيد',
    course: 'تصميم واجهات UI/UX',
    amount: '650 ج.م',
    status: 'ناجح' as const,
  },
  {
    id: '#5485',
    name: 'محمود علي',
    course: 'التسويق الرقمي الشامل',
    amount: '350 ج.م',
    status: 'معلّق' as const,
  },
]

export const students = [
  {
    name: 'محمد إبراهيم',
    email: 'mohamed.ibrahim@email.com',
    time: 'منذ 10 دقائق',
  },
  {
    name: 'فاطمة الزهراء',
    email: 'fatma.az@gmail.com',
    time: 'منذ 25 دقيقة',
  },
  {
    name: 'يوسف محمد',
    email: 'youssef.mohamed@email.com',
    time: 'منذ 40 دقيقة',
  },
]

export const categories = [
  {
    name: 'البرمجة والتطوير',
    description: 'تطوير الويب، تطبيقات الموبايل، وقواعد البيانات',
    icon: 'Code2',
    color: 'blue',
    courses: 48,
    students: '12,450',
    revenue: '142,300 ج.م',
  },
  {
    name: 'التصميم والإبداع',
    description: 'تصميم الجرافيك وواجهات المستخدم UI/UX',
    icon: 'Palette',
    color: 'pink',
    courses: 32,
    students: '8,920',
    revenue: '98,600 ج.م',
  },
  {
    name: 'التسويق الرقمي',
    description: 'التسويق عبر السوشيال ميديا وتحسين محركات البحث',
    icon: 'Megaphone',
    color: 'orange',
    courses: 27,
    students: '7,310',
    revenue: '76,400 ج.م',
  },
  {
    name: 'اللغات',
    description: 'الإنجليزية، الفرنسية، والألمانية لجميع المستويات',
    icon: 'Languages',
    color: 'green',
    courses: 21,
    students: '9,640',
    revenue: '64,200 ج.م',
  },
  {
    name: 'الأعمال وريادة الأعمال',
    description: 'إدارة المشاريع، المحاسبة، والقيادة',
    icon: 'Briefcase',
    color: 'indigo',
    courses: 19,
    students: '5,180',
    revenue: '58,900 ج.م',
  },
  {
    name: 'تطوير الذات',
    description: 'مهارات التواصل، الإنتاجية، وإدارة الوقت',
    icon: 'Sparkles',
    color: 'teal',
    courses: 16,
    students: '6,070',
    revenue: '41,500 ج.م',
  },
  {
    name: 'التصوير والمونتاج',
    description: 'التصوير الفوتوغرافي ومونتاج الفيديو',
    icon: 'Camera',
    color: 'rose',
    courses: 14,
    students: '3,250',
    revenue: '33,800 ج.م',
  },
  {
    name: 'العلوم والرياضيات',
    description: 'الرياضيات، الفيزياء، والإحصاء التطبيقي',
    icon: 'FlaskConical',
    color: 'amber',
    courses: 12,
    students: '4,410',
    revenue: '29,700 ج.م',
  },
]

export const recentCourses = [
  {
    title: 'دليل احتراف الجافاسكريبت',
    status: 'منشور' as const,
    time: 'منذ ساعة',
    image: '/courses/javascript.png',
  },
  {
    title: 'أساسيات الذكاء الاصطناعي',
    status: 'منشور' as const,
    time: 'منذ 3 ساعات',
    image: '/courses/ai.png',
  },
  {
    title: 'إدارة المشاريع الاحترافية',
    status: 'مسودة' as const,
    time: 'منذ 5 ساعات',
    image: '/courses/projects.png',
  },
]
