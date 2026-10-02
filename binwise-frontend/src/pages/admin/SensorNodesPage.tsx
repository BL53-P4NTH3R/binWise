import { useState, useEffect, useCallback, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { sensorNodesApi, binsApi } from '../../api'
import type { SensorNode, SensorNodeCreate, SensorNodeUpdate, BinRead } from '../../types'
import {
  Btn, Input, Select, Modal, PageLoader, Empty, ConfirmDialog,
} from '../../components/ui'
import { fmtRelative } from '../../utils'

export default function SensorNodesPage() {
  const [nodes, setNodes] = useState<SensorNode[]>([])
  const [bins, setBins] = useState<BinRead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editNode, setEditNode] = useState<SensorNode | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SensorNode | null>(null)

  // Form fields
  const [form, setForm] = useState<SensorNodeCreate>({
    node_id: '', bin_id: null, firmware_v: null, gsm_number: null, is_active: true,
  })

  const fetchData = useCallback(async () => {
    try {
      const [nodesRes, binsRes] = await Promise.all([
        sensorNodesApi.getAll(),
        binsApi.getAll(),
      ])
      setNodes(nodesRes.data)
      setBins(binsRes.data)
    } catch {
      toast.error('Failed to load sensor nodes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = nodes.filter(n => {
    const matchSearch = !search ||
      n.node_id.toLowerCase().includes(search.toLowerCase()) ||
      (n.bin_code ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (n.gsm_number ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter ||
      (statusFilter === 'active' && n.is_active) ||
      (statusFilter === 'inactive' && !n.is_active)
    return matchSearch && matchStatus
  })

  const openCreate = () => {
    setEditNode(null)
    setFormError(null)
    setForm({ node_id: '', bin_id: null, firmware_v: null, gsm_number: null, is_active: true })
    setModalOpen(true)
  }

  const openEdit = (node: SensorNode) => {
    setEditNode(node)
    setFormError(null)
    setForm({
      node_id: node.node_id,
      bin_id: node.bin_id,
      firmware_v: node.firmware_v,
      gsm_number: node.gsm_number,
      is_active: node.is_active,
    })
    setModalOpen(true)
  }

  // Get the bin label for a given bin_id
  const getBinLabel = (binId: string | null): string => {
    if (!binId) return 'Unassigned'
    const bin = bins.find(b => b.id === binId)
    return bin ? `${bin.bin_code} — ${bin.location_name}` : 'Unknown Bin'
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editNode) {
        const update: SensorNodeUpdate = {
          node_id: form.node_id,
          bin_id: form.bin_id || null,
          firmware_v: form.firmware_v || null,
          gsm_number: form.gsm_number || null,
          is_active: form.is_active,
        }
        await sensorNodesApi.update(editNode.id, update)
        toast.success('Sensor node updated successfully')
      } else {
        await sensorNodesApi.create({
          ...form,
          bin_id: form.bin_id || null,
          firmware_v: form.firmware_v || null,
          gsm_number: form.gsm_number || null,
        })
        toast.success('Sensor node created successfully')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      // Surface specific API error messages (409 conflict, 404 not found)
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail
        if ((status === 409 || status === 404) && typeof detail === 'string') {
          setFormError(detail)
        } else if (typeof detail === 'string') {
          setFormError(detail)
        } else {
          toast.error(editNode ? 'Failed to update sensor node' : 'Failed to create sensor node')
        }
      } else {
        toast.error(editNode ? 'Failed to update sensor node' : 'Failed to create sensor node')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await sensorNodesApi.remove(confirmDelete.id)
      toast.success('Sensor node deleted')
      setConfirmDelete(null)
      fetchData()
    } catch {
      toast.error('Failed to delete sensor node')
    }
  }

  if (loading) return <PageLoader />

  const binOpts = [
    { value: '', label: 'Unassigned' },
    ...bins.map(b => ({ value: b.id, label: `${b.bin_code} — ${b.location_name}` })),
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sensor Nodes</h1>
          <p className="text-sm text-gray-500">{nodes.length} nodes registered</p>
        </div>
        <Btn onClick={openCreate}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add node
        </Btn>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by node ID, bin code, or GSM number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none
                       placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Empty
          title="No sensor nodes found"
          description="Add a sensor node to start monitoring bins."
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          }
          action={<Btn onClick={openCreate}>Add first node</Btn>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Node ID</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Linked Bin</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Firmware</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">GSM Number</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Last Seen</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(node => (
                  <tr key={node.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-900">{node.node_id}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {node.bin_id ? (
                        <span>{node.bin_code ?? getBinLabel(node.bin_id)}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                      {node.location_name && (
                        <p className="text-xs text-gray-400">{node.location_name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{node.firmware_v ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{node.gsm_number ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        node.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${node.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {node.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtRelative(node.last_seen ?? undefined)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(node)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(node)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-danger"
                          title="Delete"
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
            {filtered.map(node => (
              <div key={node.id} className="mobile-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-900">{node.node_id}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    node.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {node.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Linked Bin</span>
                    <span className="mobile-card-value">
                      {node.bin_id ? (node.bin_code ?? getBinLabel(node.bin_id)) : <span className="text-gray-400 italic">Unassigned</span>}
                    </span>
                  </div>
                  {node.location_name && (
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Location</span>
                      <span className="mobile-card-value text-gray-500">{node.location_name}</span>
                    </div>
                  )}
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Firmware</span>
                    <span className="mobile-card-value">{node.firmware_v ?? '—'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">GSM</span>
                    <span className="mobile-card-value">{node.gsm_number ?? '—'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Last Seen</span>
                    <span className="mobile-card-value text-gray-500">{fmtRelative(node.last_seen ?? undefined)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(node)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(node)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
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
        title={editNode ? 'Edit Sensor Node' : 'Add Sensor Node'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inline form error for API conflicts */}
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Node ID"
              required
              value={form.node_id}
              onChange={e => { setFormError(null); setForm(f => ({ ...f, node_id: e.target.value })) }}
              placeholder="US-Node-402"
            />
            <Select
              label="Linked Bin"
              value={form.bin_id ?? ''}
              onChange={e => { setFormError(null); setForm(f => ({ ...f, bin_id: e.target.value || null })) }}
              options={binOpts}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Firmware Version"
              value={form.firmware_v ?? ''}
              onChange={e => setForm(f => ({ ...f, firmware_v: e.target.value || null }))}
              placeholder="v2.1.3"
            />
            <Input
              label="GSM Number"
              value={form.gsm_number ?? ''}
              onChange={e => setForm(f => ({ ...f, gsm_number: e.target.value || null }))}
              placeholder="+234..."
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Active</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" loading={saving}>
              {editNode ? 'Save Changes' : 'Create Node'}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Sensor Node"
        message={`Are you sure you want to delete ${confirmDelete?.node_id}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
