import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const COLLAPSED_KEY = 'bw_sidebar_collapsed'

export default function AdminLayout() {
  // Desktop collapse state — persisted in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  const closeMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  const openMobile = useCallback(() => {
    setMobileOpen(true)
  }, [])

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) closeMobile()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileOpen, closeMobile])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <div className="admin-layout">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />
      <div className={`admin-main transition-all duration-300 ${
        collapsed ? 'lg:ml-16' : 'lg:ml-60'
      }`}>
        <header className="admin-header flex items-center justify-between gap-2 px-4 sm:px-6 py-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — visible only below lg */}
            <button
              onClick={openMobile}
              className="lg:hidden flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Open navigation menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-sm font-medium text-gray-500 truncate">Samaru Campus, ABU Zaria</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" title="System online" />
            <span className="text-xs text-gray-400 hidden sm:inline">System Online</span>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
