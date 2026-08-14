import env from '#start/env'
import { LevelBotProvider } from './level_bot_provider.js'

/** 应用级单例：Pdnode 用户目录（Level Bot） */
export const directory: LevelBotProvider = new LevelBotProvider(
  env.get('LEVEL_BOT_URL'),
  env.get('LEVEL_BOT_API_KEY')
)
