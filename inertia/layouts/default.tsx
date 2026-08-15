import { type Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { type ReactElement, useEffect } from 'react'
import { Form, Link } from '@adonisjs/inertia/react'

export default function Layout({ children }: { children: ReactElement<Data.SharedProps> }) {
  const { url, flash } = usePage()
  useEffect(() => {
    toast.dismiss()
  }, [url])

  useEffect(() => {
    if (flash.error) {
      toast.error(flash.error)
    }
    if (flash.success) {
      toast.success(flash.success)
    }
  })

  return (
    <>
      <header>
        <div>
          <div>
            <Link route="home" className="brand">
              Pdnode
            </Link>
          </div>
          <div>
            <nav>
              {children.props.user ? (
                <>
                  <span className="user-email">{children.props.user.email}</span>
                  <Form route="session.destroy">
                    <button type="submit"> Logout </button>
                  </Form>
                </>
              ) : (
                <Link route="verify.show">Email verify login</Link>
              )}
              <Link route="results.show">Results</Link>
            </nav>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <Toaster position="top-center" richColors />
    </>
  )
}
