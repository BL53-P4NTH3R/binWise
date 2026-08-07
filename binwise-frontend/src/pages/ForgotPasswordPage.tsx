import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '../api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      toast.error('Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      toast.success('Reset link resent!')
    } catch {
      toast.error('Failed to resend. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/50 fade-in">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 mb-6">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to login
        </Link>

        {!sent ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email and we&apos;ll send you a password reset link.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.name@abu.edu.ng"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none
                             placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white
                           shadow-lg shadow-primary/25 transition-all hover:bg-primary-600
                           disabled:bg-primary-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Send reset link
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-5">
              <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Check your inbox</h2>
            <p className="mt-2 text-sm text-gray-500">
              We&apos;ve sent a password reset link to <strong className="text-gray-700">{email}</strong>
            </p>
            <button
              onClick={handleResend}
              disabled={loading}
              className="mt-6 text-sm font-medium text-primary hover:text-primary-600 disabled:opacity-50"
            >
              {loading ? 'Resending...' : 'Resend link'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
