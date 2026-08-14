import { Form, Link } from '@adonisjs/inertia/react'
import { useState } from 'react'
import type { InertiaProps } from '~/types'

type Round = {
  id: number
  month: string
  status: string
  mode: string
  startsAt: string
  campaignEndsAt: string
  voting1EndsAt: string | null
  voting2EndsAt: string | null
  endsAt: string
  special: boolean
}

type Candidate = { id: number; name: string; statement: string | null }

const STATUS_LABEL: Record<Round['status'], string> = {
  campaigning: '竞选报名中',
  voting1: '第一轮投票',
  voting2: '第二轮投票',
  objection: '公示期（可异议）',
  closed: '已结束',
}

export default function Home(
  props: InertiaProps<{
    round: Round | null
    candidates: Candidate[]
    previousModerators: string[]
  }>
) {
  const { round, candidates, previousModerators, user } = props
  const [selected, setSelected] = useState<number[]>([])

  const requiredVotes = round?.status === 'voting1' ? 3 : round?.status === 'voting2' ? 2 : 0

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < requiredVotes
          ? [...prev, id]
          : prev
    )
  }

  return (
    <div className="form-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Pdnode 版主选举</h1>
        <nav>
          <Link route="results.show">历史结果</Link>
          {user ? (
            <span style={{ marginLeft: 12 }}>
              {user.email}{' '}
              <Form route="session.destroy" style={{ display: 'inline' }}>
                <button type="submit">退出</button>
              </Form>
            </span>
          ) : (
            <Link route="verify.show" style={{ marginLeft: 12 }}>
              邮箱验证登录
            </Link>
          )}
        </nav>
      </header>

      {!round ? (
        <p>当前没有进行中的选举。</p>
      ) : (
        <>
          <section>
            <h2>
              {round.month} 月选举 <span className="badge">{round.special ? '特殊轮次' : ''}</span>
            </h2>
            <p>
              状态：{STATUS_LABEL[round.status]}（模式：{round.mode}）
            </p>
            <p>
              开始 {new Date(round.startsAt).toLocaleString()} / 结束{' '}
              {new Date(round.endsAt).toLocaleString()}
            </p>
          </section>

          <section>
            <h3>候选人（{candidates.length}）</h3>
            {candidates.length === 0 && <p>暂无候选人。</p>}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {candidates.map((c) => (
                <li
                  key={c.id}
                  style={{ padding: 8, border: '1px solid #ddd', marginBottom: 8, borderRadius: 6 }}
                >
                  <strong>{c.name}</strong>
                  {c.statement && <p style={{ margin: '4px 0' }}>{c.statement}</p>}
                  {(round.status === 'voting1' || round.status === 'voting2') && (
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      选择
                    </label>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {requiredVotes > 0 && (
            <section>
              <Form
                route="votes.store"
                routeParams={{ id: round.id }}
                onSuccess={() => setSelected([])}
              >
                {({ errors, processing }) => (
                  <>
                    <input type="hidden" name="candidateIds" value={JSON.stringify(selected)} />
                    <p>
                      本轮需投满 <strong>{requiredVotes}</strong> 票（已选 {selected.length}）
                    </p>
                    {errors.candidateIds && <div>{errors.candidateIds}</div>}
                    <button
                      type="submit"
                      className="button"
                      disabled={processing || selected.length !== requiredVotes}
                    >
                      提交投票
                    </button>
                  </>
                )}
              </Form>
            </section>
          )}

          {round.status === 'campaigning' && user && (
            <section>
              <h3>报名竞选（需 Titanium 等级）</h3>
              <Form route="campaigns.store" routeParams={{ id: round.id }}>
                {({ errors }) => (
                  <>
                    <div>
                      <label>竞选宣言（可选）</label>
                      <textarea name="statement" rows={3} />
                    </div>
                    <div>
                      <label>你是 Pdnode Team Chat (Zulip) 的活跃成员多久了？</label>
                      <input type="number" name="months" min={1} step={1} />
                      {errors.months && <div>{errors.months}</div>}
                    </div>
                    {previousModerators.map((name) => (
                      <div key={name}>
                        <label>你觉得 {name} 作为版主表现如何？</label>
                        <textarea name={`opinions[${name}]`} rows={2} />
                      </div>
                    ))}
                    <button type="submit" className="button">
                      提交报名
                    </button>
                  </>
                )}
              </Form>
            </section>
          )}

          {round.status === 'objection' && user && (
            <section>
              <h3>对当选结果有异议？</h3>
              <Form route="objections.store" routeParams={{ id: round.id }}>
                {({ errors }) => (
                  <>
                    <div>
                      <label>异议对象</label>
                      <select name="targetCandidateId" defaultValue="">
                        <option value="" disabled>
                          选择候选人
                        </option>
                        {candidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.targetCandidateId && <div>{errors.targetCandidateId}</div>}
                    </div>
                    <div>
                      <label>原因</label>
                      <textarea name="reason" rows={3} />
                      {errors.reason && <div>{errors.reason}</div>}
                    </div>
                    <button type="submit" className="button">
                      提交异议
                    </button>
                  </>
                )}
              </Form>
            </section>
          )}
        </>
      )}
    </div>
  )
}
