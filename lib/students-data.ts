export type StudentStatus = 'نشط' | 'غير نشط' | 'موقوف'

export type StudentRecord = {
  id: string
  name: string
  email: string
  phone: string
  courses: number
  progress: number
  spent: string
  status: StudentStatus
  joinedAt: string
}

export const studentRecords: StudentRecord[] = [
  {
    id: 'STD-1042',
    name: 'محمد إبراهيم',
    email: 'mohamed.ibrahim@email.com',
    phone: '0100 123 4567',
    courses: 5,
    progress: 82,
    spent: '2,450 ج.م',
    status: 'نشط',
    joinedAt: '12 يونيو 2024',
  },
  {
    id: 'STD-1041',
    name: 'فاطمة الزهراء',
    email: 'fatma.az@gmail.com',
    phone: '0111 987 6543',
    courses: 3,
    progress: 64,
    spent: '1,350 ج.م',
    status: 'نشط',
    joinedAt: '11 يونيو 2024',
  },
  {
    id: 'STD-1040',
    name: 'يوسف محمد',
    email: 'youssef.mohamed@email.com',
    phone: '0122 456 7890',
    courses: 2,
    progress: 38,
    spent: '900 ج.م',
    status: 'غير نشط',
    joinedAt: '9 يونيو 2024',
  },
  {
    id: 'STD-1039',
    name: 'سارة محمود',
    email: 'sara.mahmoud@email.com',
    phone: '0109 321 6547',
    courses: 7,
    progress: 91,
    spent: '3,800 ج.م',
    status: 'نشط',
    joinedAt: '6 يونيو 2024',
  },
  {
    id: 'STD-1038',
    name: 'أحمد خالد',
    email: 'ahmed.khaled@email.com',
    phone: '0115 654 3210',
    courses: 1,
    progress: 12,
    spent: '450 ج.م',
    status: 'موقوف',
    joinedAt: '3 يونيو 2024',
  },
  {
    id: 'STD-1037',
    name: 'نورهان السيد',
    email: 'nourhan.elsayed@email.com',
    phone: '0128 741 9630',
    courses: 4,
    progress: 73,
    spent: '1,980 ج.م',
    status: 'نشط',
    joinedAt: '1 يونيو 2024',
  },
  {
    id: 'STD-1036',
    name: 'محمود علي',
    email: 'mahmoud.ali@email.com',
    phone: '0106 852 7413',
    courses: 2,
    progress: 45,
    spent: '750 ج.م',
    status: 'غير نشط',
    joinedAt: '28 مايو 2024',
  },
  {
    id: 'STD-1035',
    name: 'مريم حسن',
    email: 'mariam.hassan@email.com',
    phone: '0114 369 2580',
    courses: 6,
    progress: 88,
    spent: '3,100 ج.م',
    status: 'نشط',
    joinedAt: '25 مايو 2024',
  },
  {
    id: 'STD-1034',
    name: 'عمر فاروق',
    email: 'omar.farouk@email.com',
    phone: '0127 159 7530',
    courses: 3,
    progress: 57,
    spent: '1,200 ج.م',
    status: 'نشط',
    joinedAt: '22 مايو 2024',
  },
  {
    id: 'STD-1033',
    name: 'ليلى عبد الله',
    email: 'laila.abdullah@email.com',
    phone: '0102 753 8520',
    courses: 1,
    progress: 8,
    spent: '300 ج.م',
    status: 'موقوف',
    joinedAt: '19 مايو 2024',
  },
]

export const statusFilters: Array<{ label: string; value: StudentStatus | 'الكل' }> = [
  { label: 'الكل', value: 'الكل' },
  { label: 'نشط', value: 'نشط' },
  { label: 'غير نشط', value: 'غير نشط' },
  { label: 'موقوف', value: 'موقوف' },
]
