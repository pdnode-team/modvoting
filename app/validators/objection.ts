import vine from '@vinejs/vine'

export const objectionValidator = vine.compile(
  vine.object({
    targetCandidateId: vine.number(),
    reason: vine.string().trim().minLength(1).maxLength(2000),
  })
)
