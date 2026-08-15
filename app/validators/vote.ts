import vine from '@vinejs/vine'

/**
 * 前端以 JSON 字符串提交（hidden input 序列化数组），控制器解析为 number[]。
 * 数组内容（长度/重复/自投）由 VoteService 校验。
 */
export const voteValidator = vine.compile(
  vine.object({
    candidateIds: vine.string().trim(),
  })
)
