export type PaymentMethod = 'انستاباي' | 'فودافون كاش'
export type PaymentStatus = 'قيد المراجعة' | 'مقبول' | 'مرفوض'

export type PaymentRecord = {
  id: string
  studentName: string
  studentEmail: string
  course: string
  amount: number
  method: PaymentMethod
  receiptUrl: string
  reference: string
  submittedAt: string
  status: PaymentStatus
}

export const paymentRecords: PaymentRecord[] = [
  {
    id: 'PAY-1001',
    studentName: 'كريم محمود',
    studentEmail: 'karim.mahmoud@example.com',
    course: 'أساسيات تطوير الويب',
    amount: 450,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842301',
    submittedAt: 'منذ 12 دقيقة',
    status: 'قيد المراجعة',
  },
  {
    id: 'PAY-1002',
    studentName: 'سارة عبد الله',
    studentEmail: 'sara.abdullah@example.com',
    course: 'تصميم واجهات المستخدم UI/UX',
    amount: 650,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552190',
    submittedAt: 'منذ 35 دقيقة',
    status: 'قيد المراجعة',
  },
  {
    id: 'PAY-1003',
    studentName: 'يوسف إبراهيم',
    studentEmail: 'youssef.ibrahim@example.com',
    course: 'البرمجة بلغة بايثون',
    amount: 500,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842355',
    submittedAt: 'منذ ساعة',
    status: 'قيد المراجعة',
  },
  {
    id: 'PAY-1004',
    studentName: 'منة الله حسن',
    studentEmail: 'menna.hassan@example.com',
    course: 'التسويق الرقمي',
    amount: 400,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552233',
    submittedAt: 'منذ 3 ساعات',
    status: 'مقبول',
  },
  {
    id: 'PAY-1005',
    studentName: 'عمر خالد',
    studentEmail: 'omar.khaled@example.com',
    course: 'تحليل البيانات',
    amount: 700,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842401',
    submittedAt: 'منذ 5 ساعات',
    status: 'مقبول',
  },
  {
    id: 'PAY-1006',
    studentName: 'ليلى أحمد',
    studentEmail: 'layla.ahmed@example.com',
    course: 'أساسيات تطوير الويب',
    amount: 450,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552288',
    submittedAt: 'أمس',
    status: 'مرفوض',
  },
  {
    id: 'PAY-1007',
    studentName: 'حسام الدين',
    studentEmail: 'hossam.eldin@example.com',
    course: 'تطوير تطبيقات الموبايل',
    amount: 800,
    method: 'انستاباي',
    receiptUrl: '/receipts/instapay-receipt.png',
    reference: 'IPN-8842460',
    submittedAt: 'أمس',
    status: 'مقبول',
  },
  {
    id: 'PAY-1008',
    studentName: 'نور محمد',
    studentEmail: 'nour.mohamed@example.com',
    course: 'تصميم واجهات المستخدم UI/UX',
    amount: 650,
    method: 'فودافون كاش',
    receiptUrl: '/receipts/vodafone-receipt.png',
    reference: 'VFC-552301',
    submittedAt: 'منذ يومين',
    status: 'قيد المراجعة',
  },
]

export const paymentStatusFilters: Array<{
  label: string
  value: PaymentStatus | 'الكل'
}> = [
  { label: 'الكل', value: 'الكل' },
  { label: 'قيد المراجعة', value: 'قيد المراجعة' },
  { label: 'مقبول', value: 'مقبول' },
  { label: 'مرفوض', value: 'مرفوض' },
]

export function getPaymentStats(records: PaymentRecord[]) {
  const pending = records.filter((r) => r.status === 'قيد المراجعة').length
  const approved = records.filter((r) => r.status === 'مقبول')
  const rejected = records.filter((r) => r.status === 'مرفوض').length
  const totalRevenue = approved.reduce((sum, r) => sum + r.amount, 0)

  return {
    pending,
    approvedCount: approved.length,
    rejected,
    totalRevenue,
  }
}
