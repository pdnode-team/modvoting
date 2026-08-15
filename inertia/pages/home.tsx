import { Form } from '@adonisjs/inertia/react'
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

const STATUS_LABEL: Record<string, string> = {
  campaigning: 'Campaigning open',
  voting1: 'Round 1 voting',
  voting2: 'Round 2 voting',
  objection: 'Objection window',
  closed: 'Closed',
}

const MODE_LABEL: Record<string, string> = {
  election: 'Two-round election',
  acclamation: 'Acclamation (no vote needed)',
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

export default function Home(
  props: InertiaProps<{
    round: Round | null
    campaignRound: Round | null
    candidates: Candidate[]
    previousModerators: string[]
  }>
) {
  const { round, campaignRound, candidates, previousModerators, user } = props
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
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px 48px' }}>
      {!round ? (
        <div className="empty-state">
          <h2>No election in progress</h2>
          <p>The next election opens on the last days of each month.</p>
        </div>
      ) : (
        <>
          <h1>Moderator Election</h1>
          <section className="section-card">
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {round.month} Election
                {round.special && <span className="badge">Special round</span>}
              </h2>
              <span className="status-pill">
                {STATUS_LABEL[round.status] ?? round.status}
                {round.mode !== 'undecided' && MODE_LABEL[round.mode]
                  ? ` · ${MODE_LABEL[round.mode]}`
                  : ''}
              </span>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Starts {fmt(round.startsAt)} · Ends {fmt(round.endsAt)}
            </p>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3>Candidates ({candidates.length})</h3>
            {candidates.length === 0 ? (
              <p className="muted">No candidates yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {candidates.map((c) => (
                  <div key={c.id} className="candidate-row">
                    <div>
                      <strong>{c.name}</strong>
                      {c.statement && <p className="statement">{c.statement}</p>}
                    </div>
                    {(round.status === 'voting1' || round.status === 'voting2') && (
                      <label>
                        <input
                          type="checkbox"
                          checked={selected.includes(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                        Select
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {requiredVotes > 0 && (
            <section className="section-card">
              <Form
                route="votes.store"
                routeParams={{ id: round.id }}
                onSuccess={() => setSelected([])}
              >
                {({ errors, processing }) => (
                  <>
                    <input type="hidden" name="candidateIds" value={JSON.stringify(selected)} />
                    <p style={{ marginTop: 0 }}>
                      You must pick exactly <strong>{requiredVotes}</strong> candidates (
                      {selected.length} selected)
                    </p>
                    {errors.candidateIds && <div>{errors.candidateIds}</div>}
                    <button
                      type="submit"
                      className="button"
                      disabled={processing || selected.length !== requiredVotes}
                    >
                      {processing ? 'Submitting…' : 'Cast votes'}
                    </button>
                  </>
                )}
              </Form>
            </section>
          )}

          {round.status === 'objection' && user && (
            <section className="section-card">
              <h3>Object to a result?</h3>
              <Form route="objections.store" routeParams={{ id: round.id }}>
                {({ errors }) => (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div>
                      <label>Target</label>
                      <select name="targetCandidateId" defaultValue="">
                        <option value="" disabled>
                          Choose a candidate
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
                      <label>Reason</label>
                      <textarea name="reason" rows={3} style={{ width: '100%' }} />
                      {errors.reason && <div>{errors.reason}</div>}
                    </div>
                    <div>
                      <button type="submit" className="button">
                        Submit objection
                      </button>
                    </div>
                  </div>
                )}
              </Form>
            </section>
          )}
        </>
      )}

      {campaignRound && user && (
        <section className="section-card">
          <h3>
            Run for moderator — next election: {campaignRound.month}
            {campaignRound.special ? ' (special round)' : ''}
          </h3>
          <p className="muted">
            Applications are open anytime until voting starts on {fmt(campaignRound.campaignEndsAt)}
            .
          </p>
          <Form route="campaigns.store" routeParams={{ id: campaignRound.id }}>
            {({ errors }) => (
              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <label>Campaign statement (optional)</label>
                  <textarea name="statement" rows={3} style={{ width: '100%' }} />
                </div>
                <div>
                  <label>
                    How long have you been an active member of the Pdnode Team Chat on Zulip?
                    (months)
                  </label>
                  <input type="number" name="months" min={1} step={1} />
                  {errors.months && <div>{errors.months}</div>}
                </div>
                {previousModerators.map((name) => (
                  <div key={name}>
                    <label>How do you think {name} is doing as a moderator?</label>
                    <textarea name={`opinions[${name}]`} rows={2} style={{ width: '100%' }} />
                  </div>
                ))}
                <div>
                  <button type="submit" className="button">
                    Submit application
                  </button>
                </div>
              </div>
            )}
          </Form>
        </section>
      )}
    </div>
  )
}
