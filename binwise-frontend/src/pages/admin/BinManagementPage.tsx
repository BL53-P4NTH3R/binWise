import { useState, useEffect, useCallback, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { binsApi, zonesApi } from '../../api'
import type { BinRead, Zone, BinCreate, BinUpdate } from '../../types'
import {
  Btn, Input, Select, Modal, PageLoader, Empty, FillBadge, FillBar, ConfirmDialog,
} from '../../components/ui'
import { fmtRelative } from '../../utils'

export default function BinManagementPage() {
  const [bins, setBins] = useState<BinRead[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editBin, setEditBin] = useState<BinRead | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<BinRead | null>(null)

  // Form fields
  const [form, setForm] = useState<BinCreate>({
    bin_code: '', location_name: '', latitude: 0, longitude: 0,
    capacity_l: 240, height_cm: 100, zone_id: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const [binsRes, zonesRes] = await Promise.all([
        binsApi.getAll(),
        zonesApi.getAll(),
      ])
      setBins(binsRes.data)
      setZones(zonesRes.data)
    } catch {
      toast.error('Failed to load bins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = bins.filter(b => {
    const matchSearch = !search ||
      b.bin_code.toLowerCase().includes(search.toLowerCase()) ||
      b.location_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || b.fill_status === statusFilter || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const openCreate = () => {
    setEditBin(null)
    setForm({ bin_code: '', location_name: '', latitude: 0, longitude: 0, capacity_l: 240, height_cm: 100, zone_id: '' })
    setModalOpen(true)
  }

  const openEdit = (bin: BinRead) => {
    setEditBin(bin)
    setForm({
      bin_code: bin.bin_code,
      location_name: bin.location_name,
      latitude: bin.latitude,
      longitude: bin.longitude,
      capacity_l: bin.capacity_l,
      height_cm: bin.height_cm,
      zone_id: bin.zone_id,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editBin) {
        const update: BinUpdate = { ...form }
        await binsApi.update(editBin.id, update)
        toast.success('Bin updated successfully')
      } else {
        await binsApi.create(form)
        toast.success('Bin created successfully')
      }
      setModalOpen(false)
      fetchData()
    } catch {
      toast.error(editBin ? 'Failed to update bin' : 'Failed to create bin')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await binsApi.remove(confirmDelete.id)
      toast.success('Bin deactivated')
      setConfirmDelete(null)
      fetchData()
    } catch {
      toast.error('Failed to deactivate bin')
    }
  }

  if (loading) return <PageLoader />

  const zoneOpts = zones.map(z => ({ value: z.id, label: z.name }))

  return (
    <div className="space-y-6 fade-in w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bin Management</h1>
          <p className="text-sm text-gray-500">{bins.length} bins registered</p>
        </div>
        <Btn onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add bin
        </Btn>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Search by bin code or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none
                     placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary sm:w-auto"
        >
          <option value="">All statuses</option>
          <option value="normal">Normal</option>
          <option value="warning">Warning</option>
          <option value="overflow">Overflow</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Empty
          title="No bins registered yet"
          description="Start by adding a smart bin to the system."
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
          action={<Btn onClick={openCreate}>Add first bin</Btn>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Bin ID</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Location</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Fill %</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Last Reading</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(bin => (
                  <tr
                    key={bin.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      bin.fill_status === 'overflow' ? 'bg-red-50/40' : ''
                    }`}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-900">{bin.bin_code}</p>
                      {bin.zone_name && <p className="text-xs text-gray-400">{bin.zone_name}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{bin.location_name}</td>
                    <td className="px-5 py-3 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <FillBar pct={bin.fill_pct} status={bin.fill_status} />
                        </div>
                        <FillBadge status={bin.fill_status} pct={bin.fill_pct} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        bin.status === 'active' ? 'bg-green-100 text-green-700' :
                        bin.status === 'offline' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {bin.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtRelative(bin.last_reading)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(bin)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(bin)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-danger"
                          title="Deactivate"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {filtered.map(bin => (
              <div key={bin.id} className={`mobile-card ${bin.fill_status === 'overflow' ? 'border-red-200 bg-red-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{bin.bin_code}</p>
                    {bin.zone_name && <p className="text-xs text-gray-400">{bin.zone_name}</p>}
                  </div>
                  <FillBadge status={bin.fill_status} pct={bin.fill_pct} />
                </div>
                <div className="mb-2"><FillBar pct={bin.fill_pct} status={bin.fill_status} /></div>
                <div className="space-y-1">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Location</span>
                    <span className="mobile-card-value">{bin.location_name}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Status</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      bin.status === 'active' ? 'bg-green-100 text-green-700' :
                      bin.status === 'offline' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-700'
                    }`}>{bin.status}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Last Reading</span>
                    <span className="mobile-card-value text-gray-500">{fmtRelative(bin.last_reading)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(bin)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">Edit</button>
                  <button onClick={() => setConfirmDelete(bin)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50 transition-colors">Deactivate</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editBin ? 'Edit Bin' : 'Add New Bin'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bin Code"
              required
              value={form.bin_code}
              onChange={e => setForm(f => ({ ...f, bin_code: e.target.value }))}
              placeholder="BIN-001"
            />
            <Select
              label="Zone"
              required
              value={form.zone_id}
              onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}
              options={zoneOpts}
              placeholder="Select zone"
            />
          </div>
          <Input
            label="Location Name"
            required
            value={form.location_name}
            onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
            placeholder="Faculty of Engineering entrance"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude"
              required
              type="number"
              step="any"
              value={form.latitude || ''}
              onChange={e => setForm(f => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))}
              placeholder="11.1558"
            />
            <Input
              label="Longitude"
              required
              type="number"
              step="any"
              value={form.longitude || ''}
              onChange={e => setForm(f => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))}
              placeholder="7.6228"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Capacity (litres)"
              type="number"
              value={form.capacity_l || ''}
              onChange={e => setForm(f => ({ ...f, capacity_l: parseInt(e.target.value) || undefined }))}
              placeholder="240"
            />
            <Input
              label="Height (cm)"
              type="number"
              value={form.height_cm || ''}
              onChange={e => setForm(f => ({ ...f, height_cm: parseInt(e.target.value) || undefined }))}
              placeholder="100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" loading={saving}>
              {editBin ? 'Save Changes' : 'Create Bin'}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Deactivate Bin"
        message={`Are you sure you want to deactivate ${confirmDelete?.bin_code}? This will remove the bin from active monitoring.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
