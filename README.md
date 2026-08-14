# Pdnode ModVoting — 版主投票网站

AdonisJS v7 + Inertia React + Plus（Persona / Permissions / Flow）实现的 Pdnode 版主月度选举网站。

## 选举规则

- **每月一轮**，总 48h，结束时刻 = 太平洋时区（America/Los_Angeles）每月 1 号 00:00（DST 安全，luxon 计算）
- 三阶段各 16h：**竞选 → 投票一 → 投票二**
- 身份：邮箱免登录验证（一次性链接，16h 有效）
- 资格：投票需 **Silver+**（level ≥ 11）；竞选需 **Titanium+**（level ≥ 26），等级实时取自 Level Bot
- 竞选：Titanium+ 自动批准，需回答问卷（成员时长 + 对每位上届版主评价），竞选池上限 10 人
- 投票一：每人必投满 **3 票**（不同候选人，不可投自己）→ 票数 Top5 进二轮
- 投票二：每人必投满 **2 票** → 前 3 名当选
- **平票**：crypto 随机，记录到 `tie_breaks`（可审计）
- **≤3 名竞选人**：免投票直接当选 → 32h 公示期，开放异议接口（成功提交后 2h 冷却，10 分钟限 5 次尝试），异议邮件通知 admin
- 结果确定后邮件通知：当选者 / 落选者 / 投票者

## 技术栈

- Node ≥ 24（本机用 nvm：`nvm use 24`）
- AdonisJS v7 / Lucid / Inertia + React / Vite 8
- Plus：`@adonisplus/persona`（用户管理）、`@adonisplus/permissions`（RBAC）、`@adonisplus/flow`（AI harness，`.flow/docs/` cookbook）
- SQLite（开发）/ 可换 Postgres

## 快速开始

```bash
nvm use 24
pnpm install          # 需先配置 Plus registry（见下）
cp .env.example .env  # 填入 LEVEL_BOT_* 与 SMTP_*
pnpm dev              # http://localhost:3333
```

> 包管理器：**pnpm 11+**（`pnpm-workspace.yaml` 存放 settings：`onlyBuiltDependencies`、`overrides`；pnpm 11 起不再读 package.json 的 `pnpm` 字段）。

### Plus 私有 registry

```bash
# 项目 .npmrc 已含：@adonisplus:registry=https://plus.adonisjs.com/registry/
# 本地 token（一次性，每台机器一次；pnpm 与 npm 共用 ~/.npmrc）：
npm config set "//plus.adonisjs.com/registry/:_authToken" <token>
```

### 环境变量（.env）

| 变量 | 说明 |
|---|---|
| `LEVEL_BOT_URL` / `LEVEL_BOT_API_KEY` | Pdnode 用户目录（Level Bot） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | 发信（mail.pdnode.com:465） |
| `MAIL_FROM_ADDRESS` / `MAIL_FROM_NAME` | 发件人 |

## 常用命令

```bash
pnpm test          # Japa 单测（66 个，含 DST 矩阵/并发/平票）
pnpm run typecheck # tsc
pnpm run lint      # eslint
node ace migration:run / rollback --batch=0
node ace flow:install --agent=opencode --stack=react --package="*" --skill="*"   # 重新装 Flow
```

## 特殊轮（一次性例外）

`RoundScheduler.createSpecialRound(month, startsAt)` 手动创建（如 2026-09 轮提前至 8/25 开启），
`special=true` 标记，不参与常规预生成。生产中用 `node ace repl` 或一次性脚本调用。

## 目录速览

```
app/services/         业务逻辑（纯函数优先，全部有单测）
  round_window.ts     DST 安全的三阶段时间边界
  round_scheduler.ts  轮次预生成（幂等）+ 特殊轮
  round_lifecycle.ts  状态机（campaigning→voting1→voting2→closed / objection）
  vote_service.ts     投票（必投满/防自己/并发）
  campaign_service.ts 报名 + 问卷
  objection_service.ts 异议（冷却/限速）
  result_service.ts   结果聚合（平票以 tie_breaks 为准）
  tie_break_utils.ts  平票随机（crypto + 审计 seed）
  level_guard_service.ts 等级守卫（实时 + 5min 缓存）
  directory/          Level Bot provider 抽象
  mail_service.ts     SMTP 通知（验证/结果/异议）
config/elections.ts   上届版主名单等选举配置
start/elections.ts    启动引导（预生成 + 5min 状态刷新）
```

## 已知待办

- admin 权限：`start/permissions.ts` 定义 `admin.manage_objections`，手动执行
  `UPDATE users SET permissions='["admin.manage_objections"]' WHERE email='...'` 授予（`withPermissions` 读取该 JSON 列）。
- 邮箱→Zulip 绑定已接通：验证流程用 Level Bot `GET /user?email=` 校验并绑定 zulipUserId。
