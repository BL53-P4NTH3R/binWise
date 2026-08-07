import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <header className="admin-header flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-gray-500">Samaru Campus, ABU Zaria</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" title="System online" />
            <span className="text-xs text-gray-400">System Online</span>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
