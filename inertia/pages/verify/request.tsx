import { Form } from '@adonisjs/inertia/react'

export default function VerifyRequest() {
  return (
    <div className="form-container">
      <div>
        <h1> 邮箱验证 </h1>
        <p>输入你的邮箱，我们会发送一个一次性验证链接（16 小时内有效）。无需密码。</p>
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
                  {processing ? '发送中…' : '发送验证链接'}
                </button>
              </div>
            </>
          )}
        </Form>
      </div>
    </div>
  )
}
