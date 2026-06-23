'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { exportToCsv } from '@/lib/export-csv'
import {
  studentRecords,
  type StudentRecord,
  type StudentStatus,
} from '@/lib/students-data'

export type StudentFormValues = {
  name: string
  email: string
  phone: string
  status: StudentStatus
}

type StudentsContextValue = {
  students: StudentRecord[]
  openCreate: () => void
  requestDelete: (student: StudentRecord) => void
  exportData: () => void
  formOpen: boolean
  closeForm: () => void
  submitForm: (values: StudentFormValues) => void
  deleting: StudentRecord | null
  closeDelete: () => void
  confirmDelete: () => void
}

const StudentsContext = createContext<StudentsContextValue | null>(null)

export function useStudents() {
  const ctx = useContext(StudentsContext)
  if (!ctx) throw new Error('useStudents must be used within StudentsProvider')
  return ctx
}

export function StudentsProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<StudentRecord[]>(studentRecords)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<StudentRecord | null>(null)

  const value = useMemo<StudentsContextValue>(
    () => ({
      students,
      openCreate: () => setFormOpen(true),
      requestDelete: (student) => setDeleting(student),
      exportData: () => {
        exportToCsv(
          'students.csv',
          students.map((s) => ({
            'رقم الطالب': s.id,
            الاسم: s.name,
            'البريد الإلكتروني': s.email,
            الهاتف: s.phone,
            الكورسات: s.courses,
            'نسبة التقدم': `${s.progress}%`,
            الإنفاق: s.spent,
            الحالة: s.status,
            'تاريخ الانضمام': s.joinedAt,
          })),
        )
        toast.success('تم تصدير بيانات الطلاب')
      },
      formOpen,
      closeForm: () => setFormOpen(false),
      submitForm: (values) => {
        const nextNum = 1043
        const newStudent: StudentRecord = {
          id: `STD-${nextNum + students.length}`,
          name: values.name,
          email: values.email,
          phone: values.phone,
          status: values.status,
          courses: 0,
          progress: 0,
          spent: '0 ج.م',
          joinedAt: new Date().toLocaleDateString('ar-EG', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        }
        setStudents((prev) => [newStudent, ...prev])
        toast.success('تم إضافة الطالب بنجاح')
        setFormOpen(false)
      },
      deleting,
      closeDelete: () => setDeleting(null),
      confirmDelete: () => {
        if (deleting) {
          setStudents((prev) => prev.filter((s) => s.id !== deleting.id))
          toast.success('تم حذف الطالب')
        }
        setDeleting(null)
      },
    }),
    [students, formOpen, deleting],
  )

  return (
    <StudentsContext.Provider value={value}>{children}</StudentsContext.Provider>
  )
}
