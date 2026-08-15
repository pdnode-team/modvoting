import { Head } from '@inertiajs/react'
import { Form } from '@adonisjs/inertia/react'

export default function VerifyRequest() {
  return (
    <div className="form-container">
      <Head title="Email Verification" />
      <div>
        <h1> Email verification </h1>
        <p>
          Enter your email and we will send you a one-time verification link (valid for 16 hours).
          No password needed.
        </p>
      </div>

      <div>
        <Form route="verify.request">
          {({ errors, processing }) => (
            <>
              <div>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  data-invalid={errors.email ? 'true' : undefined}
                />
                {errors.email && <div>{errors.email}</div>}
              </div>

              <div>
                <button type="submit" className="button" disabled={processing}>
                  {processing ? 'Sending…' : 'Send verification link'}
                </button>
              </div>
            </>
          )}
        </Form>
      </div>
    </div>
  )
}
