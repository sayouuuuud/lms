"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getReleaseData() {
  const lectures = await prisma.lectures.findMany({ select: { id: true, title: true, is_published: true, release_date: true }})
  const lessons = await prisma.lessons.findMany({ select: { id: true, title: true, is_published: true, release_date: true }})
  const exams = await prisma.exams.findMany({ select: { id: true, title: true, is_published: true, release_date: true }})
  const monthlyCourses = await prisma.monthly_courses.findMany({ select: { id: true, title: true, is_published: true, release_date: true }})

  return { lectures, lessons, exams, monthlyCourses }
}

export async function updateReleases(type: string, ids: string[], is_published: boolean, release_date: Date | null) {
  if (type === 'lectures') {
    await prisma.lectures.updateMany({ where: { id: { in: ids } }, data: { is_published, release_date } })
  } else if (type === 'lessons') {
    await prisma.lessons.updateMany({ where: { id: { in: ids } }, data: { is_published, release_date } })
  } else if (type === 'exams') {
    await prisma.exams.updateMany({ where: { id: { in: ids } }, data: { is_published, release_date } })
  } else if (type === 'monthlyCourses') {
    await prisma.monthly_courses.updateMany({ where: { id: { in: ids } }, data: { is_published, release_date } })
  }
  revalidatePath('/admin/release-manager')
}
