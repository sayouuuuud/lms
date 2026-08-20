'use server'

import { revalidatePath } from 'next/cache'
import {
  runRescueScan,
  getRescueCases,
  updateRescueCaseStatus,
  evaluateStudentRisk,
  getRescueStats,
  type RescueFilters,
  type RescueStatus,
  type RescuePriority,
  type RescueTriggerType,
} from '@/lib/rescue'
import {
  dispatchRescueWhatsApp,
  checkStudentCooldown,
  generateRescueMessage,
} from '@/lib/rescue-notifier'

/**
 * Triggers a full batch scan across all students to detect and create rescue cases.
 */
export async function runRescueScanAction() {
  const result = await runRescueScan()
  revalidatePath('/admin/rescue')
  return result
}

/**
 * Retrieves rescue cases list with filters, pagination, and calculated anti-spam cooldown state.
 */
export async function getRescueCasesAction(filters?: RescueFilters) {
  return await getRescueCases(filters)
}

/**
 * Retrieves aggregated statistics for rescue dashboard cards.
 */
export async function getRescueStatsAction() {
  return await getRescueStats()
}

/**
 * Updates status, notes, or assignment for a specific rescue case.
 */
export async function updateRescueCaseStatusAction(
  caseId: string,
  status: RescueStatus,
  notes?: string,
  assignedTo?: string
) {
  const result = await updateRescueCaseStatus(caseId, status, notes, assignedTo)
  revalidatePath('/admin/rescue')
  return result
}

/**
 * Dispatches a WhatsApp message to a student for a rescue case.
 */
export async function sendRescueWhatsAppAction(
  caseId: string,
  customText?: string,
  options?: { force?: boolean; sandbox?: boolean }
) {
  const result = await dispatchRescueWhatsApp(caseId, {
    customText,
    ...options,
  })
  revalidatePath('/admin/rescue')
  return result
}

/**
 * Checks WhatsApp cooldown status for a specific student before admin action.
 */
export async function checkStudentCooldownAction(studentId: string) {
  return await checkStudentCooldown(studentId)
}

/**
 * Previews the personalized Arabic motivational message template for a case.
 */
export async function previewRescueMessageAction(
  triggerType: RescueTriggerType,
  data: {
    studentName: string
    courseTitle?: string
    daysInactive?: number
    examTitle?: string
    [key: string]: any
  }
) {
  return generateRescueMessage(triggerType, data)
}
