import { useState, useEffect, useCallback, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { usersApi } from '../../api'
import type { User, UserCreate } from '../../types'
import { Btn, Modal, Input, Select, PageLoader, Empty, ConfirmDialog } from '../../components/ui'
import { fmtDate, getInitials } from '../../utils'

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null)

  const [form, setForm] = useState<UserCreate>({
    full_name: '', email: '', password: '', role: 'driver',
  })

  const fetchData = useCallback(async () => {
    try {
      const { data } = await usersApi.getAll()
      setUsers(data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const adminCount = users.filter(u => u.role === 'admin').length
  const driverCount = users.filter(u => u.role === 'driver').length

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await usersApi.create(form)
      toast.success('User invited successfully')
      setModalOpen(false)
      setForm({ full_name: '', email: '', password: '', role: 'driver' })
      fetchData()
    } catch {
      toast.error('Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await usersApi.update(userId, { role })
      toast.success('Role updated')
      fetchData()
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleToggleActive = async () => {
    if (!confirmToggle) return
    try {
      await usersApi.update(confirmToggle.id, { is_active: !confirmToggle.is_active })
      toast.success(confirmToggle.is_active ? 'User deactivated' : 'User reactivated')
      setConfirmToggle(null)
      fetchData()
    } catch {
      toast.error('Failed to update user')
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">
            {users.length} users · {adminCount} admin{adminCount !== 1 && 's'} · {driverCount} driver{driverCount !== 1 && 's'}
          </p>
        </div>
        <Btn onClick={() => setModalOpen(true)}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite User
        </Btn>
      </div>

      {/* User table */}
      {users.length === 0 ? (
        <Empty
          title="No users registered yet"
          description="Invite team members to start using BinWise."
          action={<Btn onClick={() => setModalOpen(true)}>Invite first user</Btn>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Last Login</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                        user.role === 'admin' ? 'bg-primary' : 'bg-info'
                      }`}>
                        {getInitials(user.full_name)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="admin">Admin</option>
                      <option value="driver">Driver</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(user.last_login)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setConfirmToggle(user)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        user.is_active
                          ? 'text-danger hover:bg-red-50'
                          : 'text-primary hover:bg-green-50'
                      }`}
                    >
                      {user.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invite User" size="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            placeholder="Umar Ibrahim"
          />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="umar.ibrahim@abu.edu.ng"
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Set a temporary password"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'driver' }))}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'driver', label: 'Driver' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" loading={saving}>Invite User</Btn>
          </div>
        </form>
      </Modal>

      {/* Confirm toggle */}
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.is_active ? 'Deactivate User' : 'Reactivate User'}
        message={`Are you sure you want to ${confirmToggle?.is_active ? 'deactivate' : 'reactivate'} ${confirmToggle?.full_name}?`}
        confirmLabel={confirmToggle?.is_active ? 'Deactivate' : 'Reactivate'}
        variant={confirmToggle?.is_active ? 'danger' : 'warning'}
        onConfirm={handleToggleActive}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  )
}
