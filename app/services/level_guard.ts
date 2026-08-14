import { directory } from './directory/index.js'
import { LevelGuardService } from './level_guard_service.js'

/** 应用级单例：等级守卫（带 5 分钟缓存） */
export const levelGuard = new LevelGuardService(directory)
