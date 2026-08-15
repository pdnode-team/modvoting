import { Head } from '@inertiajs/react'
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
      <Head title="Election Results" />
      <h1>Election Results</h1>
      <p>
        <Link route="home">← Back to home</Link>
      </p>

      {!round || !results ? (
        <p>No results yet.</p>
      ) : (
        <>
          <h2>
            {round.month} Election (
            {round.mode === 'acclamation' ? 'Acclamation' : 'Two-round vote'})
          </h2>

          {results.winners.length > 0 && (
            <section>
              <h3>Elected moderators</h3>
              <ul>
                {results.winners.map((w, i) => (
                  <li key={i}>
                    {w.name} ({w.votes} votes)
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.phase1.length > 0 && (
            <section>
              <h3>Round 1 tallies</h3>
              <ul>
                {results.phase1.map((e, i) => (
                  <li key={i}>
                    {e.name}: {e.votes} votes
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.phase2.length > 0 && (
            <section>
              <h3>Round 2 tallies</h3>
              <ul>
                {results.phase2.map((e, i) => (
                  <li key={i}>
                    {e.name}: {e.votes} votes
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
