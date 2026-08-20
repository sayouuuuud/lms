import { prisma } from './prisma.ts'
import { logError } from './logger.ts'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface SkillNode {
  id: string
  topicId: string
  parentSkillId: string | null
  code: string
  title: string
  description: string
  importanceWeight: number
  difficultyLevel: DifficultyLevel
  sortOrder: number
  lessonsCount?: number
  questionsCount?: number
  subSkills?: SkillNode[]
}

export interface TopicNode {
  id: string
  domainId: string
  code: string
  title: string
  description: string
  sortOrder: number
  skillsCount?: number
  skills: SkillNode[]
}

export interface DomainNode {
  id: string
  branchId: string
  code: string
  title: string
  description: string
  sortOrder: number
  icon: string | null
  topicsCount?: number
  skillsCount?: number
  topics: TopicNode[]
}

export interface SaveDomainInput {
  id?: string
  branchId: string
  code?: string
  title: string
  description?: string
  sortOrder?: number
  icon?: string | null
}

export interface SaveTopicInput {
  id?: string
  domainId: string
  code?: string
  title: string
  description?: string
  sortOrder?: number
}

export interface SaveSkillInput {
  id?: string
  topicId: string
  parentSkillId?: string | null
  code?: string
  title: string
  description?: string
  importanceWeight?: number
  difficultyLevel?: DifficultyLevel | string
  sortOrder?: number
}

export interface SkillWeightInput {
  skillId: string
  weight: number
}

/**
 * Generate a unique code if none is provided.
 */
function generateCode(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Get the full 3-tier taxonomy tree for a given branch:
 * Domains -> Topics -> Skills (with sub-skills and metadata counts).
 */
export async function getBranchTaxonomyTree(branchId: string): Promise<DomainNode[]> {
  try {
    const domains = await prisma.taxonomy_domains.findMany({
      where: { branch_id: branchId },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: {
        topics: {
          orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
          include: {
            skills: {
              where: { parent_skill_id: null },
              orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
              include: {
                sub_skills: {
                  orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
                  include: {
                    _count: {
                      select: {
                        lesson_skills: true,
                        exam_question_skills: true,
                        qb_question_skills: true,
                      },
                    },
                  },
                },
                _count: {
                  select: {
                    lesson_skills: true,
                    exam_question_skills: true,
                    qb_question_skills: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return domains.map((domain) => {
      let domainSkillsCount = 0

      const topics: TopicNode[] = domain.topics.map((topic) => {
        let topicSkillsCount = 0

        const skills: SkillNode[] = topic.skills.map((skill) => {
          topicSkillsCount += 1
          const subSkills: SkillNode[] = (skill.sub_skills || []).map((sub) => {
            topicSkillsCount += 1
            const lessonsCount = sub._count?.lesson_skills ?? 0
            const questionsCount = (sub._count?.exam_question_skills ?? 0) + (sub._count?.qb_question_skills ?? 0)
            return {
              id: sub.id,
              topicId: sub.topic_id,
              parentSkillId: sub.parent_skill_id,
              code: sub.code,
              title: sub.title,
              description: sub.description,
              importanceWeight: sub.importance_weight,
              difficultyLevel: (sub.difficulty_level as DifficultyLevel) || 'medium',
              sortOrder: sub.sort_order,
              lessonsCount,
              questionsCount,
            }
          })

          const lessonsCount = skill._count?.lesson_skills ?? 0
          const questionsCount = (skill._count?.exam_question_skills ?? 0) + (skill._count?.qb_question_skills ?? 0)

          return {
            id: skill.id,
            topicId: skill.topic_id,
            parentSkillId: skill.parent_skill_id,
            code: skill.code,
            title: skill.title,
            description: skill.description,
            importanceWeight: skill.importance_weight,
            difficultyLevel: (skill.difficulty_level as DifficultyLevel) || 'medium',
            sortOrder: skill.sort_order,
            lessonsCount,
            questionsCount,
            subSkills,
          }
        })

        domainSkillsCount += topicSkillsCount

        return {
          id: topic.id,
          domainId: topic.domain_id,
          code: topic.code,
          title: topic.title,
          description: topic.description,
          sortOrder: topic.sort_order,
          skillsCount: topicSkillsCount,
          skills,
        }
      })

      return {
        id: domain.id,
        branchId: domain.branch_id,
        code: domain.code,
        title: domain.title,
        description: domain.description,
        sortOrder: domain.sort_order,
        icon: domain.icon,
        topicsCount: topics.length,
        skillsCount: domainSkillsCount,
        topics,
      }
    })
  } catch (error) {
    logError('getBranchTaxonomyTree', error)
    return []
  }
}

/**
 * Create or update a taxonomy domain.
 */
export async function saveDomain(input: SaveDomainInput): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const code = input.code?.trim() || generateCode('DOM')
    const title = input.title.trim()
    const description = input.description?.trim() ?? ''
    const sortOrder = input.sortOrder ?? 0
    const icon = input.icon ?? null

    if (input.id) {
      const updated = await prisma.taxonomy_domains.update({
        where: { id: input.id },
        data: {
          title,
          description,
          sort_order: sortOrder,
          icon,
          ...(input.code ? { code } : {}),
          updated_at: new Date(),
        },
        select: { id: true },
      })
      return { success: true, id: updated.id }
    }

    const created = await prisma.taxonomy_domains.create({
      data: {
        branch_id: input.branchId,
        code,
        title,
        description,
        sort_order: sortOrder,
        icon,
      },
      select: { id: true },
    })
    return { success: true, id: created.id }
  } catch (error: any) {
    logError('saveDomain', error)
    return { success: false, error: error.message || 'Failed to save domain' }
  }
}

/**
 * Delete a taxonomy domain (cascades to topics and skills).
 */
export async function deleteDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.taxonomy_domains.delete({
      where: { id: domainId },
    })
    return { success: true }
  } catch (error: any) {
    logError('deleteDomain', error)
    return { success: false, error: error.message || 'Failed to delete domain' }
  }
}

/**
 * Create or update a taxonomy topic.
 */
export async function saveTopic(input: SaveTopicInput): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const code = input.code?.trim() || generateCode('TOP')
    const title = input.title.trim()
    const description = input.description?.trim() ?? ''
    const sortOrder = input.sortOrder ?? 0

    if (input.id) {
      const updated = await prisma.taxonomy_topics.update({
        where: { id: input.id },
        data: {
          title,
          description,
          sort_order: sortOrder,
          ...(input.code ? { code } : {}),
          updated_at: new Date(),
        },
        select: { id: true },
      })
      return { success: true, id: updated.id }
    }

    const created = await prisma.taxonomy_topics.create({
      data: {
        domain_id: input.domainId,
        code,
        title,
        description,
        sort_order: sortOrder,
      },
      select: { id: true },
    })
    return { success: true, id: created.id }
  } catch (error: any) {
    logError('saveTopic', error)
    return { success: false, error: error.message || 'Failed to save topic' }
  }
}

/**
 * Delete a taxonomy topic (cascades to skills).
 */
export async function deleteTopic(topicId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.taxonomy_topics.delete({
      where: { id: topicId },
    })
    return { success: true }
  } catch (error: any) {
    logError('deleteTopic', error)
    return { success: false, error: error.message || 'Failed to delete topic' }
  }
}

/**
 * Create or update a taxonomy skill.
 */
export async function saveSkill(input: SaveSkillInput): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const code = input.code?.trim() || generateCode('SKL')
    const title = input.title.trim()
    const description = input.description?.trim() ?? ''
    const importanceWeight = typeof input.importanceWeight === 'number' ? input.importanceWeight : 1.0
    const difficultyLevel = input.difficultyLevel || 'medium'
    const sortOrder = input.sortOrder ?? 0
    const parentSkillId = input.parentSkillId || null

    if (input.id) {
      const updated = await prisma.taxonomy_skills.update({
        where: { id: input.id },
        data: {
          title,
          description,
          importance_weight: importanceWeight,
          difficulty_level: difficultyLevel,
          sort_order: sortOrder,
          parent_skill_id: parentSkillId,
          ...(input.code ? { code } : {}),
          updated_at: new Date(),
        },
        select: { id: true },
      })
      return { success: true, id: updated.id }
    }

    const created = await prisma.taxonomy_skills.create({
      data: {
        topic_id: input.topicId,
        parent_skill_id: parentSkillId,
        code,
        title,
        description,
        importance_weight: importanceWeight,
        difficulty_level: difficultyLevel,
        sort_order: sortOrder,
      },
      select: { id: true },
    })
    return { success: true, id: created.id }
  } catch (error: any) {
    logError('saveSkill', error)
    return { success: false, error: error.message || 'Failed to save skill' }
  }
}

/**
 * Delete a taxonomy skill.
 */
export async function deleteSkill(skillId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.taxonomy_skills.delete({
      where: { id: skillId },
    })
    return { success: true }
  } catch (error: any) {
    logError('deleteSkill', error)
    return { success: false, error: error.message || 'Failed to delete skill' }
  }
}

/**
 * Link a lesson to a set of skills with primary designation.
 */
export async function linkLessonSkills(
  lessonId: string,
  skillIds: string[],
  primarySkillId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete existing links for this lesson
    await prisma.lesson_skills.deleteMany({
      where: { lesson_id: lessonId },
    })

    if (skillIds.length === 0) {
      return { success: true }
    }

    const primaryTarget = primarySkillId && skillIds.includes(primarySkillId) ? primarySkillId : skillIds[0]

    const entries = skillIds.map((skillId) => ({
      lesson_id: lessonId,
      skill_id: skillId,
      is_primary: skillId === primaryTarget,
    }))

    await prisma.lesson_skills.createMany({
      data: entries,
      skipDuplicates: true,
    })

    return { success: true }
  } catch (error: any) {
    logError('linkLessonSkills', error)
    return { success: false, error: error.message || 'Failed to link lesson skills' }
  }
}

/**
 * Link a question (from question bank or exam) to weighted skills.
 */
export async function linkQuestionSkills(
  questionId: string,
  skillWeights: SkillWeightInput[],
  source: 'bank' | 'exam'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (source === 'bank') {
      await prisma.question_bank_question_skills.deleteMany({
        where: { question_id: questionId },
      })

      if (skillWeights.length > 0) {
        await prisma.question_bank_question_skills.createMany({
          data: skillWeights.map((sw) => ({
            question_id: questionId,
            skill_id: sw.skillId,
            weight: typeof sw.weight === 'number' ? sw.weight : 1.0,
          })),
          skipDuplicates: true,
        })
      }
    } else {
      await prisma.exam_question_skills.deleteMany({
        where: { question_id: questionId },
      })

      if (skillWeights.length > 0) {
        await prisma.exam_question_skills.createMany({
          data: skillWeights.map((sw) => ({
            question_id: questionId,
            skill_id: sw.skillId,
            weight: typeof sw.weight === 'number' ? sw.weight : 1.0,
          })),
          skipDuplicates: true,
        })
      }
    }

    return { success: true }
  } catch (error: any) {
    logError('linkQuestionSkills', error)
    return { success: false, error: error.message || 'Failed to link question skills' }
  }
}

/**
 * Get all skills linked to a lesson.
 */
export async function getLessonSkills(lessonId: string) {
  try {
    const links = await prisma.lesson_skills.findMany({
      where: { lesson_id: lessonId },
      include: {
        skills: {
          include: {
            topic: {
              include: {
                domains: true,
              },
            },
          },
        },
      },
      orderBy: { is_primary: 'desc' },
    })

    return links.map((link) => ({
      skillId: link.skill_id,
      isPrimary: link.is_primary,
      title: link.skills.title,
      code: link.skills.code,
      difficultyLevel: link.skills.difficulty_level,
      importanceWeight: link.skills.importance_weight,
      topicId: link.skills.topic_id,
      topicTitle: link.skills.topic.title,
      domainId: link.skills.topic.domain_id,
      domainTitle: link.skills.topic.domains.title,
    }))
  } catch (error) {
    logError('getLessonSkills', error)
    return []
  }
}

/**
 * Get all skills linked to a question.
 */
export async function getQuestionSkills(questionId: string, source: 'bank' | 'exam') {
  try {
    if (source === 'bank') {
      const links = await prisma.question_bank_question_skills.findMany({
        where: { question_id: questionId },
        include: {
          skill: {
            include: {
              topic: {
                include: {
                  domains: true,
                },
              },
            },
          },
        },
      })

      return links.map((link) => ({
        skillId: link.skill_id,
        weight: link.weight,
        title: link.skill.title,
        code: link.skill.code,
        difficultyLevel: link.skill.difficulty_level,
        importanceWeight: link.skill.importance_weight,
        topicId: link.skill.topic_id,
        topicTitle: link.skill.topic.title,
        domainId: link.skill.topic.domain_id,
        domainTitle: link.skill.topic.domains.title,
      }))
    }

    const links = await prisma.exam_question_skills.findMany({
      where: { question_id: questionId },
      include: {
        skill: {
          include: {
            topic: {
              include: {
                domains: true,
              },
            },
          },
        },
      },
    })

    return links.map((link) => ({
      skillId: link.skill_id,
      weight: link.weight,
      title: link.skill.title,
      code: link.skill.code,
      difficultyLevel: link.skill.difficulty_level,
      importanceWeight: link.skill.importance_weight,
      topicId: link.skill.topic_id,
      topicTitle: link.skill.topic.title,
      domainId: link.skill.topic.domain_id,
      domainTitle: link.skill.topic.domains.title,
    }))
  } catch (error) {
    logError('getQuestionSkills', error)
    return []
  }
}
