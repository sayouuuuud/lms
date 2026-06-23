'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
  initialEvents,
  type CalendarEvent,
  type CalendarEventType,
} from '@/lib/calendar-data'

export type EventFormValues = {
  title: string
  date: string
  time: string
  type: CalendarEventType
  course?: string
  description?: string
}

type CalendarContextValue = {
  events: CalendarEvent[]
  /** الشهر المعروض حاليًا */
  current: Date
  goToMonth: (offset: number) => void
  goToToday: () => void
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void
  openCreate: (date?: string) => void
  openEdit: (event: CalendarEvent) => void
  requestDelete: (event: CalendarEvent) => void
  formOpen: boolean
  editing: CalendarEvent | null
  presetDate: string | null
  closeForm: () => void
  submitForm: (values: EventFormValues) => void
  deleting: CalendarEvent | null
  closeDelete: () => void
  confirmDelete: () => void
}

const CalendarContext = createContext<CalendarContextValue | null>(null)

export function useCalendar() {
  const ctx = useContext(CalendarContext)
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider')
  return ctx
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [current, setCurrent] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [presetDate, setPresetDate] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null)

  const value = useMemo<CalendarContextValue>(
    () => ({
      events,
      current,
      goToMonth: (offset) =>
        setCurrent((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1)),
      goToToday: () => {
        const d = new Date()
        setCurrent(new Date(d.getFullYear(), d.getMonth(), 1))
      },
      selectedDate,
      setSelectedDate,
      openCreate: (date) => {
        setEditing(null)
        setPresetDate(date ?? null)
        setFormOpen(true)
      },
      openEdit: (event) => {
        setEditing(event)
        setPresetDate(null)
        setFormOpen(true)
      },
      requestDelete: (event) => setDeleting(event),
      formOpen,
      editing,
      presetDate,
      closeForm: () => {
        setFormOpen(false)
        setEditing(null)
        setPresetDate(null)
      },
      submitForm: (values) => {
        if (editing) {
          setEvents((prev) =>
            prev.map((e) => (e.id === editing.id ? { ...e, ...values } : e)),
          )
          toast.success('تم تحديث الحدث بنجاح')
        } else {
          const newEvent: CalendarEvent = {
            id: `EVT-${String(events.length + 1).padStart(2, '0')}-${Date.now()
              .toString()
              .slice(-4)}`,
            custom: true,
            ...values,
          }
          setEvents((prev) => [...prev, newEvent])
          toast.success('تمت إضافة الحدث إلى التقويم')
        }
        setFormOpen(false)
        setEditing(null)
        setPresetDate(null)
      },
      deleting,
      closeDelete: () => setDeleting(null),
      confirmDelete: () => {
        if (deleting) {
          setEvents((prev) => prev.filter((e) => e.id !== deleting.id))
          toast.success('تم حذف الحدث')
        }
        setDeleting(null)
      },
    }),
    [events, current, selectedDate, formOpen, editing, presetDate, deleting],
  )

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}
