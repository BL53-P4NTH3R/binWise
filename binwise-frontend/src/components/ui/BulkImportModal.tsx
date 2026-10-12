/**
 * BulkImportModal — reusable component for bulk-importing entities.
 *
 * Supports two input modes (switchable tabs):
 *   1. Manual list entry — spreadsheet-like editable table
 *   2. File upload (CSV / XLSX) — with column mapping + preview
 *
 * After submission, shows a results summary with failed rows and the
 * ability to retry only the failed rows.
 */
import { useState, useRef, type ChangeEvent } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Modal, Btn } from '.'
import type { BulkImportResult } from '../../types'

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FieldDef {
  /** Internal key name sent to the API (must match backend schema) */
  key: string
  /** Human-readable label shown in the UI */
  label: string
  /** HTML input type — defaults to "text" */
  type?: 'text' | 'number' | 'email' | 'password' | 'select'
  /** Whether the field is required for every row */
  required?: boolean
  /** Pre-configured select options (only when type = "select") */
  options?: { value: string; label: string }[]
  /** Placeholder text */
  placeholder?: string
  /** Default value for new rows */
  defaultValue?: string
}

interface BulkImportModalProps {
  /** Whether the modal is visible */
  open: boolean
  /** Called when the user closes the modal */
  onClose: () => void
  /** Modal title e.g. "Bulk Import Zones" */
  title: string
  /** Entity name for labels e.g. "zone" */
  entityName: string
  /** Schema of each row */
  fields: FieldDef[]
  /** Called with the validated rows — must return the bulk result */
  onSubmit: (rows: Record<string, unknown>[]) => Promise<BulkImportResult>
  /** Called after a successful import so the parent page can refresh */
  onImportComplete: () => void
}

type Tab = 'manual' | 'file'
type Step = 'input' | 'mapping' | 'preview' | 'result'

// ─── Component ───────────────────────────────────────────────────────────────

export default function BulkImportModal({
  open, onClose, title, entityName, fields, onSubmit, onImportComplete,
}: BulkImportModalProps) {

  // ── Shared state ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('manual')
  const [step, setStep] = useState<Step>('input')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<BulkImportResult | null>(null)

  // ── Manual entry state ───────────────────────────────────────────────────
  const emptyRow = () => {
    const row: Record<string, string> = {}
    fields.forEach(f => { row[f.key] = f.defaultValue ?? '' })
    return row
  }
  const [rows, setRows] = useState<Record<string, string>[]>([emptyRow()])

  // ── File upload state ────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([])
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  // ── Failed-row retry state ───────────────────────────────────────────────
  const [failedRows, setFailedRows] = useState<Record<string, string>[]>([])

  // ── Helpers ──────────────────────────────────────────────────────────────

  const resetState = () => {
    setTab('manual')
    setStep('input')
    setRows([emptyRow()])
    setParsedHeaders([])
    setParsedData([])
    setColumnMap({})
    setMappedRows([])
    setRowErrors({})
    setResult(null)
    setFailedRows([])
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  // Validate a single row — returns error string or null
  const validateRow = (row: Record<string, string>): string | null => {
    for (const f of fields) {
      if (f.required) {
        const val = (row[f.key] ?? '').toString().trim()
        if (!val) return `Missing required field "${f.label}"`
      }
      if (f.type === 'number' && row[f.key] !== undefined && row[f.key] !== '') {
        if (isNaN(Number(row[f.key]))) return `"${f.label}" must be a number`
      }
      if (f.type === 'email' && row[f.key]) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row[f.key])) return `"${f.label}" must be a valid email`
      }
    }
    return null
  }

  // Convert string-valued rows to the right types for the API
  const castRow = (row: Record<string, string>): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const f of fields) {
      const raw = (row[f.key] ?? '').trim()
      if (raw === '' && !f.required) {
        // omit optional empty fields so the backend uses defaults
        continue
      }
      if (f.type === 'number') {
        out[f.key] = Number(raw)
      } else {
        out[f.key] = raw
      }
    }
    return out
  }

  // ── Manual entry handlers ────────────────────────────────────────────────

  const updateManualCell = (rowIdx: number, key: string, value: string) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r))
  }

  const addManualRow = () => setRows(prev => [...prev, emptyRow()])

  const removeManualRow = (idx: number) => {
    setRows(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  }

  // ── File parsing ─────────────────────────────────────────────────────────

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          if (!res.meta.fields?.length) return
          setParsedHeaders(res.meta.fields)
          setParsedData(res.data)
          autoMapColumns(res.meta.fields)
          setStep('mapping')
        },
      })
    } else if (ext === 'xlsx') {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        if (!json.length) return
        const headers = Object.keys(json[0])
        setParsedHeaders(headers)
        setParsedData(json.map(row => {
          const r: Record<string, string> = {}
          headers.forEach(h => { r[h] = String(row[h] ?? '') })
          return r
        }))
        autoMapColumns(headers)
        setStep('mapping')
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const autoMapColumns = (fileHeaders: string[]) => {
    const map: Record<string, string> = {}
    for (const f of fields) {
      // Exact match (case-insensitive)
      const match = fileHeaders.find(h => h.toLowerCase() === f.key.toLowerCase())
        ?? fileHeaders.find(h => h.toLowerCase() === f.label.toLowerCase())
      if (match) map[f.key] = match
    }
    setColumnMap(map)
  }

  const applyMapping = () => {
    const mapped: Record<string, string>[] = parsedData.map(srcRow => {
      const row: Record<string, string> = {}
      fields.forEach(f => {
        const srcHeader = columnMap[f.key]
        row[f.key] = srcHeader ? String(srcRow[srcHeader] ?? '') : (f.defaultValue ?? '')
      })
      return row
    })
    setMappedRows(mapped)
    // Validate
    const errs: Record<number, string> = {}
    mapped.forEach((row, idx) => {
      const err = validateRow(row)
      if (err) errs[idx] = err
    })
    setRowErrors(errs)
    setStep('preview')
  }

  // ── Submission ───────────────────────────────────────────────────────────

  const handleSubmit = async (rowsToSubmit: Record<string, string>[]) => {
    setSubmitting(true)
    try {
      const payload = rowsToSubmit.map(castRow)
      const res = await onSubmit(payload)
      setResult(res)

      // Save failed rows so user can fix and resubmit
      if (res.errors.length > 0) {
        const failedIdxs = new Set(res.errors.map(e => e.row - 1))
        setFailedRows(rowsToSubmit.filter((_, i) => failedIdxs.has(i)))
      } else {
        setFailedRows([])
      }

      setStep('result')
      onImportComplete()
    } catch {
      // Network / unexpected error — don't lose the rows
      setResult({
        total_rows: rowsToSubmit.length,
        created: 0,
        failed: rowsToSubmit.length,
        created_records: [],
        errors: [{ row: 0, message: 'Network error — please try again' }],
      })
      setFailedRows(rowsToSubmit)
      setStep('result')
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualSubmit = () => {
    // Client-side validate
    const errs: Record<number, string> = {}
    rows.forEach((row, idx) => {
      const err = validateRow(row)
      if (err) errs[idx] = err
    })
    if (Object.keys(errs).length) {
      setRowErrors(errs)
      return
    }
    setRowErrors({})
    handleSubmit(rows)
  }

  const handlePreviewSubmit = () => {
    // Only submit rows without validation errors
    const valid = mappedRows.filter((_, i) => !rowErrors[i])
    if (!valid.length) return
    handleSubmit(valid)
  }

  const handleRetryFailed = () => {
    setRows(failedRows.length ? failedRows : [emptyRow()])
    setTab('manual')
    setStep('input')
    setResult(null)
  }

  // ── CSV template download ────────────────────────────────────────────────

  const downloadTemplate = () => {
    const headers = fields.map(f => f.key).join(',')
    const blob = new Blob([headers + '\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entityName}_template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!open) return null

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      {/* ────── Result step ────── */}
      {step === 'result' && result && (
        <div className="space-y-5">
          {/* Summary badges */}
          <div className="flex items-center gap-4">
            <div className="flex-1 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs font-medium text-green-600">Created</p>
            </div>
            <div className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-danger">{result.failed}</p>
              <p className="text-xs font-medium text-red-600">Failed</p>
            </div>
          </div>

          {/* Errors table */}
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Row</th>
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.errors.map((err, i) => (
                    <tr key={i} className="bg-red-50/30">
                      <td className="px-4 py-2 text-sm font-medium text-gray-700">{err.row}</td>
                      <td className="px-4 py-2 text-sm text-danger">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            {failedRows.length > 0 && (
              <Btn variant="secondary" onClick={handleRetryFailed}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Fix &amp; retry {failedRows.length} failed row{failedRows.length > 1 ? 's' : ''}
              </Btn>
            )}
            <Btn onClick={handleClose}>Done</Btn>
          </div>
        </div>
      )}

      {/* ────── Input / mapping / preview steps ────── */}
      {step !== 'result' && (
        <div className="space-y-5">
          {/* Tab bar — only on input step */}
          {step === 'input' && (
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setTab('manual')}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  tab === 'manual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setTab('file')}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                  tab === 'file'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                File Upload
              </button>
            </div>
          )}

          {/* ─── MANUAL ENTRY ─── */}
          {tab === 'manual' && step === 'input' && (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-3 py-2 text-xs font-semibold text-gray-500 w-10">#</th>
                      {fields.map(f => (
                        <th key={f.key} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {f.label}{f.required && <span className="text-danger ml-0.5">*</span>}
                        </th>
                      ))}
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, ri) => (
                      <tr key={ri} className={rowErrors[ri] ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-1.5 text-xs text-gray-400">{ri + 1}</td>
                        {fields.map(f => (
                          <td key={f.key} className="px-2 py-1">
                            {f.type === 'select' ? (
                              <select
                                value={row[f.key] ?? ''}
                                onChange={e => updateManualCell(ri, f.key, e.target.value)}
                                className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary"
                              >
                                <option value="">—</option>
                                {f.options?.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={f.type === 'password' ? 'password' : f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : 'text'}
                                value={row[f.key] ?? ''}
                                onChange={e => updateManualCell(ri, f.key, e.target.value)}
                                placeholder={f.placeholder}
                                step={f.type === 'number' ? 'any' : undefined}
                                className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary"
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-2 py-1">
                          <button
                            onClick={() => removeManualRow(ri)}
                            className="rounded p-1 text-gray-300 hover:text-danger hover:bg-red-50 transition-colors"
                            title="Remove row"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Row-level errors */}
              {Object.keys(rowErrors).length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
                  {Object.entries(rowErrors).map(([idx, msg]) => (
                    <p key={idx}>Row {Number(idx) + 1}: {msg}</p>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={addManualRow}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add row
                </button>
                <div className="flex gap-3">
                  <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
                  <Btn onClick={handleManualSubmit} loading={submitting}>
                    Import {rows.length} row{rows.length > 1 ? 's' : ''}
                  </Btn>
                </div>
              </div>
            </>
          )}

          {/* ─── FILE UPLOAD ─── */}
          {tab === 'file' && step === 'input' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Upload a CSV or XLSX file with one {entityName} per row.</p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download template
                </button>
              </div>

              <label
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Click to select file or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">Supports .csv and .xlsx (max 500 rows)</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              <div className="flex justify-end">
                <Btn variant="secondary" onClick={handleClose}>Cancel</Btn>
              </div>
            </div>
          )}

          {/* ─── COLUMN MAPPING ─── */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-semibold">Map your file columns</p>
                <p className="text-xs mt-1 text-blue-600">Match each field to a column from your file. Unmatched optional fields will be left blank.</p>
              </div>
              <div className="space-y-3">
                {fields.map(f => (
                  <div key={f.key} className="flex items-center gap-3">
                    <label className="w-40 text-sm font-medium text-gray-700 truncate">
                      {f.label}{f.required && <span className="text-danger ml-0.5">*</span>}
                    </label>
                    <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <select
                      value={columnMap[f.key] ?? ''}
                      onChange={e => setColumnMap(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="">— Skip —</option>
                      {parsedHeaders.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Btn variant="secondary" onClick={() => setStep('input')}>Back</Btn>
                <Btn onClick={applyMapping}>Preview rows</Btn>
              </div>
            </div>
          )}

          {/* ─── PREVIEW ─── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{mappedRows.length} rows parsed. Rows with errors are highlighted.</p>

              <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0">
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                      {fields.map(f => (
                        <th key={f.key} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{f.label}</th>
                      ))}
                      <th className="px-3 py-2 text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mappedRows.map((row, ri) => (
                      <tr key={ri} className={rowErrors[ri] ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-2 text-xs text-gray-400">{ri + 1}</td>
                        {fields.map(f => (
                          <td key={f.key} className="px-3 py-2 text-sm text-gray-700 max-w-[150px] truncate">
                            {row[f.key] || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {rowErrors[ri] ? (
                            <span className="text-xs text-danger" title={rowErrors[ri]}>⚠ {rowErrors[ri]}</span>
                          ) : (
                            <span className="text-xs text-green-600">✓ OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Object.keys(rowErrors).length > 0 && (
                <p className="text-xs text-gray-500">
                  {Object.keys(rowErrors).length} row(s) with errors will be skipped.{' '}
                  {mappedRows.length - Object.keys(rowErrors).length} valid row(s) will be imported.
                </p>
              )}

              <div className="flex justify-between pt-2">
                <Btn variant="secondary" onClick={() => setStep('mapping')}>Back</Btn>
                <Btn
                  onClick={handlePreviewSubmit}
                  loading={submitting}
                  disabled={mappedRows.length - Object.keys(rowErrors).length === 0}
                >
                  Import {mappedRows.length - Object.keys(rowErrors).length} row{mappedRows.length - Object.keys(rowErrors).length !== 1 ? 's' : ''}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
