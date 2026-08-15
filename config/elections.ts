/**
 * 选举配置：上届版主名单（问卷 Q2 动态生成的基础）。
 * 每届结果产生后应更新此名单（或改为从 DB 读取上届当选者）。
 *
 * specialRounds：非常规轮次（如提前开启的特殊轮）。键 = 轮次月（month），
 * 值 = 开启时刻（America/Los_Angeles 本地时间）。对应月不会生成常规轮。
 */
export const electionConfig = {
  previousModerators: [
    { name: 'MSCRWT', zulipId: 14 },
    { name: '小狗 2.0', zulipId: 16 },
  ],
  maxCandidates: 10,
  /** 当选人数（投票二 Top N / 免投票直接当选人数上限） */
  winnersCount: 2,
  /** 候选人 ≤ 此人数时免投票直接当选（公示期 + 异议） */
  acclamationCap: 2,
  /**
   * 投票等级要求（Silver+）。2026-08 测试期临时关闭（false），恢复投票资格限制时改回 true。
   */
  voteLevelRequired: false,
  /**
   * 2026-09 特殊轮：8/25 00:00 LA 开启投票一（竞选从轮次创建起开放，提前报名），
   * 投票一 24h + 投票二 24h，8/27 00:00 结束，结果覆盖 9 月（任期至 10/1）。9 月常规轮不开。
   */
  specialRounds: {
    '2026-09': '2026-08-25T00:00:00',
  },
} as const
