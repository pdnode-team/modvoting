import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import type { InertiaProps } from '~/types'

type CandidateRow = {
  id: number
  month: string | null
  name: string
  months: number | null
  opinions: Record<string, number>
  createdAt: string
}

export default function AdminCandidates(props: InertiaProps<{ candidates: CandidateRow[] }>) {
  const { candidates } = props
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 48px' }}>
      <Head title="Candidate Applications" />
      <h1>Candidate Applications</h1>
      <p className="muted">
        Questionnaire answers submitted by candidates (visible to admins only).
      </p>
      <p>
        <Link route="admin.objections.index" className="button" style={{ marginBottom: 16 }}>
          ← Objections
        </Link>
      </p>
      {candidates.length === 0 ? (
        <p className="muted">No applications yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--gray-4)' }}
              >
                Candidate
              </th>
              <th
                style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--gray-4)' }}
              >
                Round
              </th>
              <th
                style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--gray-4)' }}
              >
                Member since (months)
              </th>
              <th
                style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--gray-4)' }}
              >
                Opinions on previous moderators
              </th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: 8, borderBottom: '1px solid var(--gray-4)' }}>
                  <strong>{c.name}</strong>
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--gray-4)' }}>
                  {c.month ?? '—'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--gray-4)' }}>
                  {c.months ?? '—'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--gray-4)' }}>
                  {Object.keys(c.opinions).length === 0 ? (
                    '—'
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {Object.entries(c.opinions).map(([name, score]) => (
                        <li key={name}>
                          {name}: <span style={{ color: '#f5a623' }}>{stars(score)}</span>{' '}
                          <span className="muted">({score}/5)</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
