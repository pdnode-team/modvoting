import { Link } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'

type ObjectionRow = {
  id: number
  reason: string
  createdAt: string
  objector: string | null
  target: string | null
}

export default function AdminObjections(props: InertiaProps<{ objections: ObjectionRow[] }>) {
  const { objections } = props

  return (
    <div className="form-container">
      <h1>异议管理</h1>
      <p>
        <Link route="home">← 返回首页</Link>
      </p>

      {objections.length === 0 ? (
        <p>暂无异议。</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>对象</th>
              <th style={{ textAlign: 'left' }}>提交人</th>
              <th style={{ textAlign: 'left' }}>原因</th>
              <th style={{ textAlign: 'left' }}>时间</th>
            </tr>
          </thead>
          <tbody>
            {objections.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>{o.target ?? '-'}</td>
                <td>{o.objector ?? '-'}</td>
                <td>{o.reason}</td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
