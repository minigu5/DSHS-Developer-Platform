import { z } from 'zod'

const MAX_STEPS = 50
const MAX_BODY_CHARS = 20_000
const MAX_STEPS_BYTES = 200 * 1024
const MAX_TITLE_CHARS = 120
const MAX_SUMMARY_CHARS = 100

const keySchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,99}$/, '문서 주소가 올바르지 않아요.')

const stepSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{1,16}$/, '단계 번호표가 올바르지 않아요.'),
  body: z
    .string()
    .max(MAX_BODY_CHARS, `단계 내용은 ${MAX_BODY_CHARS.toLocaleString('en-US')}자까지 쓸 수 있어요.`)
    .refine((b) => b.trim() !== '', '비어 있는 단계가 있어요. 내용을 쓰거나 단계를 지워 주세요.'),
})

const stepsSchema = z
  .array(stepSchema)
  .min(1, '단계가 하나는 있어야 해요.')
  .max(MAX_STEPS, `단계는 ${MAX_STEPS}개까지 만들 수 있어요.`)
  .superRefine((steps, ctx) => {
    const seen = new Set<string>()
    for (const s of steps) {
      if (seen.has(s.id)) {
        ctx.addIssue({ code: 'custom', message: '같은 번호표를 쓰는 단계가 둘 이상 있어요.' })
        return
      }
      seen.add(s.id)
    }
    if (new TextEncoder().encode(JSON.stringify(steps)).length > MAX_STEPS_BYTES) {
      ctx.addIssue({ code: 'custom', message: '문서가 너무 커요. 내용을 줄여 주세요.' })
    }
  })

const baseRevSchema = z.number().int('버전 번호가 올바르지 않아요.').min(0, '버전 번호가 올바르지 않아요.')
const revSchema = z.number().int('버전 번호가 올바르지 않아요.').min(1, '버전 번호가 올바르지 않아요.')

const SUMMARY_MESSAGE = '무엇을 고쳤는지 한 줄로 적어 주세요.'

export const EditInputSchema = z.object({
  key: keySchema,
  baseRev: baseRevSchema,
  title: z
    .string()
    .trim()
    .min(1, '제목을 적어 주세요.')
    .max(MAX_TITLE_CHARS, `제목은 ${MAX_TITLE_CHARS}자까지 쓸 수 있어요.`),
  steps: stepsSchema,
  summary: z
    .string()
    .trim()
    .min(1, SUMMARY_MESSAGE)
    .max(MAX_SUMMARY_CHARS, `고친 내용은 ${MAX_SUMMARY_CHARS}자까지 적을 수 있어요.`),
})

export const RevertInputSchema = z.object({
  key: keySchema,
  targetRev: revSchema,
  baseRev: revSchema,
  reason: z
    .string()
    .trim()
    .min(1, '되돌리는 이유를 한 줄로 적어 주세요.')
    .max(MAX_SUMMARY_CHARS, `이유는 ${MAX_SUMMARY_CHARS}자까지 적을 수 있어요.`),
})

export const SyncInputSchema = z.object({
  key: keySchema,
  baseRev: revSchema,
})

export type EditInput = z.input<typeof EditInputSchema>
export type RevertInput = z.input<typeof RevertInputSchema>
export type SyncInput = z.input<typeof SyncInputSchema>
