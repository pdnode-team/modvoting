import db from '@adonisjs/lucid/services/db'

/**
 * 按外键依赖顺序清空选举相关表（共享 SQLite fixture 的隔离方式）。
 * 顺序：objections → votes → candidates → tie_breaks → rounds → users
 */
export async function cleanElectionTables(): Promise<void> {
  await db.rawQuery('DELETE FROM objections')
  await db.rawQuery('DELETE FROM votes')
  await db.rawQuery('DELETE FROM candidates')
  await db.rawQuery('DELETE FROM tie_breaks')
  await db.rawQuery('DELETE FROM rounds')
  await db.rawQuery('DELETE FROM users')
}
