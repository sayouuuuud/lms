export type NotificationType =
  | 'طالب'
  | 'دفع'
  | 'اختبار'
  | 'كورس'
  | 'رسالة'
  | 'نظام'

export type NotificationRecord = {
  id: string
  type: NotificationType
  title: string
  description: string
  time: string
  read: boolean
}

export const notificationTypeFilters: {
  value: NotificationType | 'الكل'
  label: string
}[] = [
  { value: 'الكل', label: 'الكل' },
  { value: 'طالب', label: 'الطلاب' },
  { value: 'دفع', label: 'المدفوعات' },
  { value: 'اختبار', label: 'الاختبارات' },
  { value: 'كورس', label: 'الكورسات' },
  { value: 'رسالة', label: 'الرسائل' },
  { value: 'نظام', label: 'النظام' },
]

export const notificationRecords: NotificationRecord[] = [
  {
    id: 'NOTI-2051',
    type: 'طالب',
    title: 'طالب جديد انضم للمنصة',
    description: 'محمد إبراهيم سجّل حسابًا جديدًا واشترك في كورس أساسيات البرمجة.',
    time: 'منذ 5 دقائق',
    read: false,
  },
  {
    id: 'NOTI-2050',
    type: 'دفع',
    title: 'تم استلام دفعة جديدة',
    description: 'دفعة بقيمة 1,200 ج.م من فاطمة الزهراء مقابل كورس تطوير الويب.',
    time: 'منذ 22 دقيقة',
    read: false,
  },
  {
    id: 'NOTI-2049',
    type: 'اختبار',
    title: 'تم إنهاء اختبار',
    description: 'أنهى 48 طالبًا اختبار "أساسيات JavaScript" بمتوسط درجات 76%.',
    time: 'منذ ساعة',
    read: false,
  },
  {
    id: 'NOTI-2048',
    type: 'رسالة',
    title: 'رسالة جديدة من طالب',
    description: 'أرسل أحمد سمير استفسارًا حول موعد بدء كورس قواعد البيانات.',
    time: 'منذ ساعتين',
    read: false,
  },
  {
    id: 'NOTI-2047',
    type: 'كورس',
    title: 'كورس وصل للحد الأقصى',
    description: 'كورس "تصميم واجهات المستخدم" وصل إلى 200 طالب مسجّل.',
    time: 'منذ 4 ساعات',
    read: true,
  },
  {
    id: 'NOTI-2046',
    type: 'دفع',
    title: 'فشل في عملية دفع',
    description: 'لم تكتمل عملية الدفع الخاصة بـ سارة محمود بسبب رفض البطاقة.',
    time: 'منذ 6 ساعات',
    read: true,
  },
  {
    id: 'NOTI-2045',
    type: 'نظام',
    title: 'تحديث للنظام',
    description: 'تم تحديث المنصة إلى الإصدار 2.4.0 مع تحسينات في الأداء.',
    time: 'أمس',
    read: true,
  },
  {
    id: 'NOTI-2044',
    type: 'طالب',
    title: 'طالب أكمل كورسًا',
    description: 'أكملت ليلى حسن كورس "مقدمة في الذكاء الاصطناعي" وحصلت على الشهادة.',
    time: 'أمس',
    read: true,
  },
  {
    id: 'NOTI-2043',
    type: 'اختبار',
    title: 'تم نشر اختبار جديد',
    description: 'تم نشر اختبار "هياكل البيانات المتقدمة" وأصبح متاحًا للطلاب.',
    time: 'منذ يومين',
    read: true,
  },
  {
    id: 'NOTI-2042',
    type: 'رسالة',
    title: 'رد على تذكرة دعم',
    description: 'تم الرد على تذكرة الدعم رقم #1284 الخاصة بمشكلة تسجيل الدخول.',
    time: 'منذ يومين',
    read: true,
  },
  {
    id: 'NOTI-2041',
    type: 'كورس',
    title: 'مراجعة جديدة على كورس',
    description: 'حصل كورس "تطوير تطبيقات الموبايل" على تقييم 5 نجوم من طالب.',
    time: 'منذ 3 أيام',
    read: true,
  },
  {
    id: 'NOTI-2040',
    type: 'نظام',
    title: 'نسخة احتياطية مكتملة',
    description: 'تم إنشاء نسخة احتياطية كاملة لبيانات المنصة بنجاح.',
    time: 'منذ 3 أيام',
    read: true,
  },
]
