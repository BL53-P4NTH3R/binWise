import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()
  const heroRef = useRef<HTMLDivElement>(null)

  // If already authenticated, redirect to dashboard/driver
  useEffect(() => {
    const token = localStorage.getItem('bw_token')
    const userRaw = localStorage.getItem('bw_user')
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as { role: string }
        navigate(user.role === 'admin' ? '/dashboard' : '/driver', { replace: true })
      } catch {
        // invalid JSON — stay on landing
      }
    }
  }, [navigate])

  // Stagger-in animation on load
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const items = el.querySelectorAll<HTMLElement>('[data-animate]')
    items.forEach((item, i) => {
      item.style.opacity = '0'
      item.style.transform = 'translateY(20px)'
      item.style.transition = `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms`
      requestAnimationFrame(() => {
        item.style.opacity = '1'
        item.style.transform = 'translateY(0)'
      })
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-700 via-primary to-primary-400 text-white relative overflow-hidden">

      {/* Decorative circles — varied sizes/opacities for depth */}
      <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-white/[0.06] blur-[1px]" />
      <div className="absolute top-1/4 -right-24 h-72 w-72 rounded-full bg-white/[0.04]" />
      <div className="absolute bottom-10 right-16 h-48 w-48 rounded-full bg-white/[0.07]" />
      <div className="absolute bottom-1/3 -left-16 h-64 w-64 rounded-full bg-white/[0.03]" />
      <div className="absolute top-2/3 left-1/2 h-32 w-32 rounded-full bg-white/[0.05]" />

      {/* Top nav bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-10 lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg shadow-black/10">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight sm:text-2xl">BinWise</span>
        </div>
        <Link
          to="/login"
          className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm shadow-md shadow-black/10 transition-all hover:bg-white/20 hover:border-white/50"
        >
          Sign In
        </Link>
      </header>

      {/* Hero section */}
      <main ref={heroRef} className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10 text-center">

        {/* Badge */}
        <p
          data-animate
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm shadow-md shadow-black/10 sm:text-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
          Intelligent Waste Management · Samaru Campus
        </p>

        {/* Headline */}
        <h1
          data-animate
          className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl max-w-3xl"
        >
          Smarter waste collection<br className="hidden sm:block" /> starts here
        </h1>

        {/* Subtext */}
        <p
          data-animate
          className="mt-4 max-w-lg text-sm leading-relaxed text-white/70 sm:text-lg sm:max-w-xl"
        >
          Real-time fill monitoring powered by IoT sensors, combined with AI-optimised
          collection routes for a cleaner, more sustainable campus.
        </p>

        {/* Feature pills */}
        <div data-animate className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {[
            { label: 'Real-time IoT monitoring', icon: '📡' },
            { label: 'AI route optimisation',   icon: '🤖' },
            { label: 'Live campus dashboard',    icon: '📊' },
          ].map(pill => (
            <span
              key={pill.label}
              className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur-sm sm:px-5 sm:text-sm"
            >
              <span className="mr-1.5">{pill.icon}</span>{pill.label}
            </span>
          ))}
        </div>

        {/* CTA */}
        <Link
          data-animate
          to="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-primary shadow-2xl shadow-black/20 ring-2 ring-white/20 transition-all hover:bg-gray-50 hover:scale-[1.03] hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:px-8 sm:py-4 sm:text-base"
        >
          Get Started
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>

        {/* Product preview card — solid white so it pops off the green background */}
        <div data-animate className="mt-10 w-full max-w-lg sm:max-w-2xl">
          <div className="rounded-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden ring-1 ring-black/5">
            {/* Mini browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="ml-3 flex-1 h-5 rounded bg-gray-200 text-[10px] font-mono text-gray-400 flex items-center px-2">
                binwise.abu.edu.ng/dashboard
              </span>
            </div>
            {/* Dashboard mockup content */}
            <div className="p-4 sm:p-5 bg-gray-50">
              {/* Stat cards row */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Total Bins',  val: '24', bg: 'bg-blue-50',   text: 'text-blue-700',  sub: 'text-blue-500'  },
                  { label: 'Overflowing', val: '3',  bg: 'bg-red-50',    text: 'text-red-700',   sub: 'text-red-400'   },
                  { label: 'Collected',   val: '11', bg: 'bg-green-50',  text: 'text-green-700', sub: 'text-green-500' },
                  { label: 'Offline',     val: '1',  bg: 'bg-amber-50',  text: 'text-amber-700', sub: 'text-amber-500' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
                    <p className={`text-base font-extrabold sm:text-xl ${s.text}`}>{s.val}</p>
                    <p className={`text-[9px] font-medium leading-tight sm:text-[10px] ${s.sub}`}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Bin list mockup */}
              <div className="space-y-1.5">
                {[
                  { code: 'BIN-A01', loc: 'Faculty of Engineering', pct: 92, status: 'overflow' },
                  { code: 'BIN-B03', loc: 'Student Union Building', pct: 61, status: 'warning'  },
                  { code: 'BIN-C07', loc: 'Main Library',           pct: 28, status: 'normal'   },
                ].map(b => (
                  <div key={b.code} className="flex items-center gap-3 rounded-lg bg-white border border-gray-100 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{b.code}</p>
                      <p className="text-[10px] text-gray-400 truncate hidden sm:block">{b.loc}</p>
                    </div>
                    {/* Fill bar */}
                    <div className="w-16 sm:w-24 flex-shrink-0">
                      <div className="h-1.5 rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full ${
                            b.status === 'overflow' ? 'bg-red-500' :
                            b.status === 'warning'  ? 'bg-amber-400' : 'bg-green-500'
                          }`}
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold w-8 text-right flex-shrink-0 ${
                      b.status === 'overflow' ? 'text-red-600' :
                      b.status === 'warning'  ? 'text-amber-600' : 'text-green-600'
                    }`}>{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stat callouts */}
        <div data-animate className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {[
            { val: '24',  label: 'Smart Bins'        },
            { val: '98%', label: 'Uptime'            },
            { val: '30%', label: 'Fuel Saved'        },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{s.val}</p>
              <p className="text-xs text-white/60 font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-5 py-5 text-center text-xs text-white/40 sm:px-10">
        © 2025 BinWise · Ahmadu Bello University, Zaria
      </footer>
    </div>
  )
}
