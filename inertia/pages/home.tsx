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
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '0 16px 48px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>Pdnode Moderator Election</h1>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link route="results.show">Results</Link>
          {user ? (
            <>
              <span style={{ color: '#6b7280', fontSize: 14 }}>{user.email}</span>
              <Form route="session.destroy">
                <button type="submit" className="button">
                  Logout
                </button>
              </Form>
            </>
          ) : (
            <Link route="verify.show">Email verify login</Link>
          )}
        </nav>
      </header>

      {!round ? (
        <div
          style={{
            marginTop: 48,
            padding: 32,
            textAlign: 'center',
            border: '1px dashed #d1d5db',
            borderRadius: 12,
            color: '#6b7280',
          }}
        >
          <h2 style={{ marginTop: 0 }}>No election in progress</h2>
          <p>The next election opens on the last days of each month.</p>
        </div>
      ) : (
        <>
          <section
            style={{
              marginTop: 24,
              padding: 20,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#fafafa',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {round.month} Election{' '}
                {round.special && (
                  <span
                    style={{
                      fontSize: 12,
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '2px 8px',
                      borderRadius: 999,
                      marginLeft: 8,
                    }}
                  >
                    Special round
                  </span>
                )}
              </h2>
              <span
                style={{
                  fontSize: 13,
                  background: '#eef2ff',
                  color: '#4338ca',
                  padding: '4px 10px',
                  borderRadius: 999,
                }}
              >
                {STATUS_LABEL[round.status] ?? round.status}
                {round.mode !== 'undecided' && MODE_LABEL[round.mode]
                  ? ` · ${MODE_LABEL[round.mode]}`
                  : ''}
              </span>
            </div>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 0 }}>
              Starts {fmt(round.startsAt)} · Ends {fmt(round.endsAt)}
            </p>
          </section>

          <section style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16 }}>Candidates ({candidates.length})</h3>
            {candidates.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No candidates yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {candidates.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: 12,
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong>{c.name}</strong>
                      {c.statement && (
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
                          {c.statement}
                        </p>
                      )}
                    </div>
                    {(round.status === 'voting1' || round.status === 'voting2') && (
                      <label
                        style={{
                          display: 'flex',
                          gap: 6,
                          alignItems: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
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
            <section
              style={{
                marginTop: 20,
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
              }}
            >
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
            <section
              style={{
                marginTop: 20,
                padding: 16,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
              }}
            >
              <h3 style={{ marginTop: 0 }}>Object to a result?</h3>
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
        <section
          style={{
            marginTop: 20,
            padding: 16,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Run for moderator — next election: {campaignRound.month}
            {campaignRound.special ? ' (special round)' : ''}
          </h3>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>
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
