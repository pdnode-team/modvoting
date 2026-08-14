import vine from '@vinejs/vine'

export const verifyRequestValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail({ all_lowercase: true }),
  })
)
