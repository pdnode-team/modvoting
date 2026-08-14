import { Link } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'

type Entry = { name: string; votes: number }
type Round = { id: number; month: string; status: string; mode: string }

export default function Results(
  props: InertiaProps<{
    round: Round | null
    results: { winners: Entry[]; phase1: Entry[]; phase2: Entry[] } | null
  }>
) {
  const { round, results } = props

  return (
    <div className="form-container">
      <h1>选举结果</h1>
      <p>
        <Link route="home">← 返回首页</Link>
      </p>

      {!round || !results ? (
        <p>暂无结果。</p>
      ) : (
        <>
          <h2>
            {round.month} 月选举（{round.mode === 'acclamation' ? '免投票' : '两轮投票'}）
          </h2>

          {results.winners.length > 0 && (
            <section>
              <h3>当选版主</h3>
              <ul>
                {results.winners.map((w, i) => (
                  <li key={i}>
                    {w.name}（{w.votes} 票）
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.phase1.length > 0 && (
            <section>
              <h3>第一轮票数</h3>
              <ul>
                {results.phase1.map((e, i) => (
                  <li key={i}>
                    {e.name}：{e.votes} 票
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.phase2.length > 0 && (
            <section>
              <h3>第二轮票数</h3>
              <ul>
                {results.phase2.map((e, i) => (
                  <li key={i}>
                    {e.name}：{e.votes} 票
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
