export type ChatMessage = {
  id: string
  fromMe: boolean
  text: string
  time: string
}

export type Conversation = {
  id: string
  name: string
  course: string
  preview: string
  time: string
  unread: number
  online: boolean
  messages: ChatMessage[]
}

export const conversations: Conversation[] = [
  {
    id: 'c1',
    name: 'أحمد خالد',
    course: 'كورس Python للمبتدئين',
    preview: 'السلام عليكم، عندي استفسار بخصوص الواجب الأخير',
    time: 'منذ 5 دقائق',
    unread: 2,
    online: true,
    messages: [
      { id: 'm1', fromMe: false, text: 'السلام عليكم ورحمة الله', time: '10:30 ص' },
      {
        id: 'm2',
        fromMe: false,
        text: 'عندي استفسار بخصوص الواجب الأخير في الدرس الخامس',
        time: '10:31 ص',
      },
      {
        id: 'm3',
        fromMe: true,
        text: 'وعليكم السلام، تفضّل ما هو استفسارك؟',
        time: '10:35 ص',
      },
      {
        id: 'm4',
        fromMe: false,
        text: 'لم أفهم كيف أستخدم الـ loops بشكل صحيح',
        time: '10:36 ص',
      },
    ],
  },
  {
    id: 'c2',
    name: 'سارة محمد',
    course: 'تصميم واجهات UI/UX',
    preview: 'متى سيتم إضافة كورس جديد في التصميم؟',
    time: 'منذ 30 دقيقة',
    unread: 1,
    online: true,
    messages: [
      {
        id: 'm1',
        fromMe: false,
        text: 'مرحباً، متى سيتم إضافة كورس جديد في التصميم؟',
        time: '09:50 ص',
      },
      {
        id: 'm2',
        fromMe: true,
        text: 'أهلاً سارة، الكورس الجديد سيكون متاحاً الأسبوع القادم',
        time: '09:55 ص',
      },
    ],
  },
  {
    id: 'c3',
    name: 'محمود علي',
    course: 'التسويق الرقمي الشامل',
    preview: 'شكراً لكم على الدعم الرائع',
    time: 'منذ ساعة',
    unread: 0,
    online: false,
    messages: [
      { id: 'm1', fromMe: false, text: 'شكراً لكم على الدعم الرائع', time: '08:00 ص' },
      { id: 'm2', fromMe: true, text: 'العفو، نحن دائماً في خدمتك', time: '08:10 ص' },
    ],
  },
  {
    id: 'c4',
    name: 'نورهان السيد',
    course: 'تحليل البيانات Excel',
    preview: 'هل توجد شهادة معتمدة بعد إنهاء الكورس؟',
    time: 'منذ 3 ساعات',
    unread: 0,
    online: false,
    messages: [
      {
        id: 'm1',
        fromMe: false,
        text: 'هل توجد شهادة معتمدة بعد إنهاء الكورس؟',
        time: 'أمس',
      },
      {
        id: 'm2',
        fromMe: true,
        text: 'نعم، تحصل على شهادة إتمام معتمدة بعد اجتياز الاختبار النهائي',
        time: 'أمس',
      },
    ],
  },
  {
    id: 'c5',
    name: 'يوسف محمد',
    course: 'دليل احتراف الجافاسكريبت',
    preview: 'تم حل المشكلة، شكراً جزيلاً',
    time: 'أمس',
    unread: 0,
    online: false,
    messages: [
      { id: 'm1', fromMe: false, text: 'تم حل المشكلة، شكراً جزيلاً', time: 'أمس' },
    ],
  },
  {
    id: 'c6',
    name: 'فاطمة الزهراء',
    course: 'أساسيات الذكاء الاصطناعي',
    preview: 'هل يمكن تمديد فترة الاشتراك؟',
    time: 'أمس',
    unread: 0,
    online: false,
    messages: [
      { id: 'm1', fromMe: false, text: 'هل يمكن تمديد فترة الاشتراك؟', time: 'أمس' },
      {
        id: 'm2',
        fromMe: true,
        text: 'بالتأكيد، سنقوم بتمديد اشتراكك لمدة شهر إضافي',
        time: 'أمس',
      },
    ],
  },
]
