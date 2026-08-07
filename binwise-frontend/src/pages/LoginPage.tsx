import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (email && password) login(email, password)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — teal branding */}
      <div className="hidden lg:flex lg:w-[60%] flex-col justify-between bg-gradient-to-br from-primary-700 via-primary to-primary-400 p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/3 h-80 w-80 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">BinWise</span>
          </div>
          <p className="text-lg font-light text-white/80 mt-4 max-w-md leading-relaxed">
            Intelligent Waste Management for Samaru Campus
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-bold leading-tight max-w-lg">
            Smarter waste collection starts here
          </h2>
          <p className="text-white/70 max-w-md text-base leading-relaxed">
            Monitor fill levels in real-time, optimise collection routes with AI, and
            keep Samaru Campus clean and sustainable.
          </p>
          <div className="flex flex-wrap gap-3">
            {['Real-time IoT monitoring', 'AI route optimisation', 'Live campus dashboard'].map(
              pill => (
                <span
                  key={pill}
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm"
                >
                  {pill}
                </span>
              )
            )}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © 2025 BinWise · Ahmadu Bello University, Zaria
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-white lg:w-[40%]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">BinWise</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.name@abu.edu.ng"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none
                           placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-sm outline-none
                             placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white
                         shadow-lg shadow-primary/25 transition-all
                         hover:bg-primary-600 disabled:bg-primary-300 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-600">
              Forgot password?
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-gray-400">
            BinWise v1.0 · ABU Zaria
          </p>
        </div>
      </div>
    </div>
  )
}
