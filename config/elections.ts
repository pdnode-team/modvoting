/**
 * 选举配置：上届版主名单（问卷 Q2 动态生成的基础）。
 * 每届结果产生后应更新此名单（或改为从 DB 读取上届当选者）。
 */
export const electionConfig = {
  previousModerators: [
    { name: 'MSCRWT', zulipId: 14 },
    { name: '小狗 2.0', zulipId: 16 },
  ],
  maxCandidates: 10,
} as const
