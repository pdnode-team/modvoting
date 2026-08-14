import vine from '@vinejs/vine'

export const voteValidator = vine.compile(
  vine.object({
    candidateIds: vine.array(vine.number()).minLength(2).maxLength(3).distinct(),
  })
)
