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
      <h1>Objections</h1>
      <p>
        <Link route="home">← Back to home</Link>
      </p>

      {objections.length === 0 ? (
        <p>No objections.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Target</th>
              <th style={{ textAlign: 'left' }}>Submitted by</th>
              <th style={{ textAlign: 'left' }}>Reason</th>
              <th style={{ textAlign: 'left' }}>When</th>
            </tr>
          </thead>
          <tbody>
            {objections.map((o) => (
              <tr key={o.id} style={{ borderTop: '1px solid #ddd' }}>
                <td>{o.target ?? '—'}</td>
                <td>{o.objector ?? '—'}</td>
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
