export type ChatMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

export type Conversation = {
  id: string
  name: string
  role: string
  initials: string
  avatar?: string
  course: string
  online: boolean
  lastTime: string
  unread: number
  messages: ChatMessage[]
}

export const conversations: Conversation[] = [
  {
    id: 'm1',
    name: 'م. أحمد سمير',
    role: 'محاضر',
    initials: 'أ س',
    avatar: '/male-instructor.png',
    course: 'تطوير واجهات React',
    online: true,
    lastTime: '10:24 ص',
    unread: 2,
    messages: [
      { id: 'm1-1', fromMe: false, text: 'أهلاً مريم، شفتِ التعديلات على مشروع الـ Dashboard؟', time: '10:10 ص' },
      { id: 'm1-2', fromMe: true, text: 'أهلاً أستاذ أحمد، أيوه راجعتها وعدّلت إدارة الحالة باستخدام Context.', time: '10:15 ص' },
      { id: 'm1-3', fromMe: false, text: 'ممتاز! فاضل بس تحسّني أداء الـ re-render في القائمة.', time: '10:22 ص' },
      { id: 'm1-4', fromMe: false, text: 'ابعتيلي النسخة النهائية قبل محاضرة بكرة.', time: '10:24 ص' },
    ],
  },
  {
    id: 'm2',
    name: 'أ. سارة منير',
    role: 'محاضرة',
    initials: 'س م',
    avatar: '/female-instructor.png',
    course: 'أساسيات UI/UX',
    online: true,
    lastTime: '9:48 ص',
    unread: 0,
    messages: [
      { id: 'm2-1', fromMe: true, text: 'صباح الخير أستاذة سارة، عندي سؤال في نظرية الألوان.', time: '9:30 ص' },
      { id: 'm2-2', fromMe: false, text: 'صباح النور، اتفضلي اسألي.', time: '9:40 ص' },
      { id: 'm2-3', fromMe: true, text: 'إزاي أختار لوحة ألوان متناسقة لمشروع التخرج؟', time: '9:45 ص' },
      { id: 'm2-4', fromMe: false, text: 'هنشرحها بالتفصيل في درس النهارده، وابعتلك مصادر كمان.', time: '9:48 ص' },
    ],
  },
  {
    id: 'm3',
    name: 'مجموعة علوم البيانات',
    role: 'مجموعة الكورس',
    initials: 'ع ب',
    course: 'علوم البيانات وPython',
    online: false,
    lastTime: 'أمس',
    unread: 5,
    messages: [
      { id: 'm3-1', fromMe: false, text: 'حد فهم الـ Pandas groupby؟', time: 'أمس 8:00 م' },
      { id: 'm3-2', fromMe: true, text: 'أيوه، تقدر تجمّع البيانات حسب عمود وتطبّق دالة تجميع.', time: 'أمس 8:15 م' },
      { id: 'm3-3', fromMe: false, text: 'تمام شكراً! والاختبار إمتى بالظبط؟', time: 'أمس 8:30 م' },
    ],
  },
  {
    id: 'm4',
    name: 'د. كريم فؤاد',
    role: 'محاضر',
    initials: 'ك ف',
    course: 'علوم البيانات وPython',
    online: false,
    lastTime: 'الإثنين',
    unread: 0,
    messages: [
      { id: 'm4-1', fromMe: false, text: 'تذكير: اختبار الوحدة الثالثة الأربعاء الساعة 5 مساءً.', time: 'الإثنين 2:00 م' },
      { id: 'm4-2', fromMe: true, text: 'تمام دكتور، جاهزين إن شاء الله.', time: 'الإثنين 2:20 م' },
    ],
  },
  {
    id: 'm5',
    name: 'الدعم الفني',
    role: 'فريق المنصة',
    initials: 'د ف',
    course: 'الدعم',
    online: true,
    lastTime: 'الأحد',
    unread: 0,
    messages: [
      { id: 'm5-1', fromMe: true, text: 'الفيديو مش بيشتغل في كورس التسويق.', time: 'الأحد 1:00 م' },
      { id: 'm5-2', fromMe: false, text: 'تم حل المشكلة، جرّبي تاني من فضلك وأكدّيلنا.', time: 'الأحد 3:30 م' },
    ],
  },
]
