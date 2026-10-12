import { useState, useEffect, useCallback, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { zonesApi, binsApi, bulkApi } from '../../api'
import type { Zone, ZoneCreate, ZoneUpdate, BinRead, BulkImportResult } from '../../types'
import {
  Btn, Input, Modal, PageLoader, Empty, ConfirmDialog,
} from '../../components/ui'
import BulkImportModal, { type FieldDef } from '../../components/ui/BulkImportModal'
import { fmtDate } from '../../utils'

export default function ZoneManagementPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [bins, setBins] = useState<BinRead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editZone, setEditZone] = useState<Zone | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Zone | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  // Form fields — matches ZoneCreate: name, description
  const [form, setForm] = useState<ZoneCreate>({ name: '', description: '' })

  const fetchData = useCallback(async () => {
    try {
      const [zonesRes, binsRes] = await Promise.all([
        zonesApi.getAll(),
        binsApi.getAll(),
      ])
      setZones(zonesRes.data)
      setBins(binsRes.data)
    } catch {
      toast.error('Failed to load zones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Count bins per zone
  const binCountForZone = (zoneId: string) =>
    bins.filter(b => b.zone_id === zoneId).length

  // Filter
  const filtered = zones.filter(z => {
    if (!search) return true
    const q = search.toLowerCase()
    return z.name.toLowerCase().includes(q) ||
      (z.description ?? '').toLowerCase().includes(q)
  })

  // ── Modal helpers ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditZone(null)
    setFormError(null)
    setForm({ name: '', description: '' })
    setModalOpen(true)
  }

  const openEdit = (zone: Zone) => {
    setEditZone(zone)
    setFormError(null)
    setForm({ name: zone.name, description: zone.description ?? '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editZone) {
        const update: ZoneUpdate = {
          name: form.name,
          description: form.description || undefined,
        }
        await zonesApi.update(editZone.id, update)
        toast.success('Zone updated successfully')
      } else {
        await zonesApi.create(form)
        toast.success('Zone created successfully')
      }
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail
        if (typeof detail === 'string') {
          setFormError(detail)
        } else {
          toast.error(editZone ? 'Failed to update zone' : 'Failed to create zone')
        }
      } else {
        toast.error(editZone ? 'Failed to update zone' : 'Failed to create zone')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await zonesApi.remove(confirmDelete.id)
      toast.success('Zone deleted successfully')
      setConfirmDelete(null)
      fetchData()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail
        if (typeof detail === 'string') {
          toast.error(detail)
        } else {
          toast.error('Failed to delete zone')
        }
      } else {
        toast.error('Failed to delete zone')
      }
    }
  }

  // ── Bulk import config ───────────────────────────────────────────────────

  const bulkFields: FieldDef[] = [
    { key: 'name', label: 'Name', required: true, placeholder: 'Zone A' },
    { key: 'description', label: 'Description', placeholder: 'Optional description' },
  ]

  const handleBulkSubmit = async (rows: Record<string, unknown>[]): Promise<BulkImportResult> => {
    const res = await bulkApi.zones(rows)
    return res.data
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-6 fade-in w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zone Management</h1>
          <p className="text-sm text-gray-500">{zones.length} zones registered</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" onClick={() => setBulkOpen(true)}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </Btn>
          <Btn onClick={openCreate}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Zone
          </Btn>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Search by name or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none
                     placeholder-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Empty
          title="No zones found"
          description="Create a zone to start organising your bins by area."
          icon={
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          action={<Btn onClick={openCreate}>Add first zone</Btn>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Bins</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Created</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(zone => (
                  <tr key={zone.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-gray-900">{zone.name}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {zone.description || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                        {binCountForZone(zone.id)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(zone.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(zone)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmDelete(zone)}
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
            {filtered.map(zone => (
              <div key={zone.id} className="mobile-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">{zone.name}</p>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                    {binCountForZone(zone.id)} bin{binCountForZone(zone.id) !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Description</span>
                    <span className="mobile-card-value">{zone.description || '—'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Created</span>
                    <span className="mobile-card-value text-gray-500">{fmtDate(zone.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(zone)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">Edit</button>
                  <button onClick={() => setConfirmDelete(zone)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-red-50 transition-colors">Delete</button>
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
        title={editZone ? 'Edit Zone' : 'Add New Zone'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          )}
          <Input
            label="Zone Name"
            required
            value={form.name}
            onChange={e => { setFormError(null); setForm(f => ({ ...f, name: e.target.value })) }}
            placeholder="North Campus"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description for this zone"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900
                         placeholder-gray-400 shadow-sm outline-none
                         focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Btn variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn type="submit" loading={saving}>
              {editZone ? 'Save Changes' : 'Create Zone'}
            </Btn>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Zone"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? ${
          confirmDelete && binCountForZone(confirmDelete.id) > 0
            ? `This zone has ${binCountForZone(confirmDelete.id)} bin(s) assigned.`
            : 'This action cannot be undone.'
        }`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Bulk Import */}
      <BulkImportModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk Import Zones"
        entityName="zone"
        fields={bulkFields}
        onSubmit={handleBulkSubmit}
        onImportComplete={fetchData}
      />
    </div>
  )
}
