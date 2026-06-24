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

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'lesson',
    title: 'درس جديد متاح',
    text: 'تم رفع درس "الخطافات المتقدمة" في كورس تطوير واجهات React.',
    time: 'منذ 10 دقائق',
    read: false,
  },
  {
    id: 'n2',
    type: 'assignment',
    title: 'تذكير بموعد تسليم',
    text: 'باقي يومان على تسليم مشروع التصميم النهائي في كورس UI/UX.',
    time: 'منذ ساعة',
    read: false,
  },
  {
    id: 'n3',
    type: 'grade',
    title: 'تم تصحيح اختبارك',
    text: 'حصلتِ على 47 من 50 في اختبار الوحدة الثانية - تطوير واجهات React.',
    time: 'منذ 3 ساعات',
    read: false,
  },
  {
    id: 'n4',
    type: 'message',
    title: 'رسالة جديدة',
    text: 'أرسل لكِ م. أحمد سمير رسالة بخصوص مشروع الـ Dashboard.',
    time: 'منذ 5 ساعات',
    read: false,
  },
  {
    id: 'n5',
    type: 'exam',
    title: 'اختبار قادم',
    text: 'اختبار الوحدة الثالثة في علوم البيانات يوم الأربعاء الساعة 5 مساءً.',
    time: 'أمس',
    read: true,
  },
  {
    id: 'n6',
    type: 'certificate',
    title: 'تهانينا! شهادة جديدة',
    text: 'حصلتِ على شهادة إتمام كورس مقدمة في JavaScript.',
    time: 'أمس',
    read: true,
  },
  {
    id: 'n7',
    type: 'lesson',
    title: 'تعديل موعد محاضرة',
    text: 'تم تأجيل المحاضرة المباشرة لكورس علوم البيانات إلى الساعة 6 مساءً.',
    time: 'منذ يومين',
    read: true,
  },
  {
    id: 'n8',
    type: 'system',
    title: 'تحديث المنصة',
    text: 'أضفنا ميزة تحميل الدروس لمشاهدتها بدون اتصال بالإنترنت.',
    time: 'منذ 3 أيام',
    read: true,
  },
  {
    id: 'n9',
    type: 'grade',
    title: 'تم تصحيح واجبك',
    text: 'حصلتِ على 38 من 40 في واجب تصميم لوحة تحكم - UI/UX.',
    time: 'منذ 4 أيام',
    read: true,
  },
]
