import vine from '@vinejs/vine'

export const campaignValidator = vine.compile(
  vine.object({
    statement: vine.string().trim().maxLength(2000).optional(),
    months: vine.number().positive(),
    opinions: vine.record(vine.number().min(1).max(5)),
  })
)
