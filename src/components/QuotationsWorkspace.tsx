import { useMemo, useState } from 'react'
import type { DemoDataset, Quotation, QuotationLine, Department } from '../data/model.js'
import { LogisticsAnimation } from './LogisticsAnimation.js'

type QuotationTab = 'quotations' | 'tariffs'

interface QuotationsWorkspaceProps {
  dataset: DemoDataset
  onCreateQuotation: (quotation: Quotation) => void
  onUpdateQuotation: (quotation: Quotation) => void
}

const currency = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function quotationTotal(quotation: Quotation): number {
  return quotation.lines.reduce((total, line) => total + line.quantity * line.rateRM, 0)
}

function QuotationsWorkspace({ dataset, onCreateQuotation, onUpdateQuotation }: QuotationsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<QuotationTab>('quotations')
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const customers = new Map(dataset.customers.map((customer) => [customer.id, customer]))
  const quotationRows = useMemo(
    () => [...dataset.quotations].sort((a, b) => b.issuedDate.localeCompare(a.issuedDate)),
    [dataset.quotations],
  )
  const quotedTotal = quotationRows.reduce((total, quotation) => total + quotationTotal(quotation), 0)
  const openCount = quotationRows.filter((quotation) => quotation.status === 'draft' || quotation.status === 'sent').length
  const acceptedCount = quotationRows.filter((quotation) => quotation.status === 'accepted').length

  function handleSaveQuotation(q: Quotation) {
    if (editingQuotation) onUpdateQuotation(q)
    else onCreateQuotation(q)
    setIsCreateOpen(false)
    setEditingQuotation(null)
  }

  return (
    <div className="logistics-workspace quotations-workspace">
      <section className="quotation-workspace-intro">
        <div>
          <span className="section-eyebrow">COMMERCIAL MANAGEMENT · DEMO DATA</span>
          <h2>Manage customer quotations and supplier tariffs</h2>
          <p>Review illustrative customer rates and validity. Tariff records are not configured in this prototype.</p>
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={() => { setEditingQuotation(null); setIsCreateOpen(true); }}
        >
          Create Quotation
        </button>
      </section>

      <div className="quotation-tabs" role="tablist" aria-label="Quotation workspace">
        <button
          id="quotation-tab"
          className={`quotation-tab${activeTab === 'quotations' ? ' quotation-tab--active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'quotations'}
          aria-controls="quotation-panel"
          onClick={() => setActiveTab('quotations')}
        >
          Quotations <span>{quotationRows.length}</span>
        </button>
        <button
          id="tariff-tab"
          className={`quotation-tab${activeTab === 'tariffs' ? ' quotation-tab--active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'tariffs'}
          aria-controls="tariff-panel"
          onClick={() => setActiveTab('tariffs')}
        >
          Tariffs <span>0</span>
        </button>
      </div>

      {activeTab === 'quotations' ? (
        <section id="quotation-panel" className="quotation-panel" role="tabpanel" aria-labelledby="quotation-tab">
          <div className="quotation-toolbar">
            <label>
              <span>Search quotations</span>
              <input type="search" placeholder="Quotation, customer, service…" disabled aria-label="Search quotations (layout preview)" />
            </label>
            <label>
              <span>Status</span>
              <select disabled aria-label="Quotation status filter (layout preview)"><option>All statuses</option></select>
            </label>
            <label>
              <span>Issued date range</span>
              <div className="quotation-date-range">
                <input type="date" disabled aria-label="From date (layout preview)" />
                <span>to</span>
                <input type="date" disabled aria-label="To date (layout preview)" />
              </div>
            </label>
            <span className="quotation-toolbar-note">Search and filters are reserved for the next implementation step.</span>
          </div>

          <section className="quotation-summary-grid" aria-label="Quotation summary">
            <article className="quotation-summary-card">
              <span>Total quotations</span>
              <strong>{quotationRows.length}</strong>
              <small>Shared illustrative records</small>
            </article>
            <article className="quotation-summary-card">
              <span>Draft / sent</span>
              <strong>{openCount}</strong>
              <small>Not yet linked as accepted</small>
            </article>
            <article className="quotation-summary-card">
              <span>Accepted</span>
              <strong>{acceptedCount}</strong>
              <small>Linked or ready for job review</small>
            </article>
            <article className="quotation-summary-card quotation-summary-card--amount">
              <span>Illustrative quoted value</span>
              <strong>{currency.format(quotedTotal)}</strong>
              <small>Sum of displayed quotation lines</small>
            </article>
          </section>

          <section className="quotation-table-card" aria-labelledby="quotation-table-heading">
            <div className="quotation-section-heading">
              <div><span className="section-eyebrow">CUSTOMER RATES</span><h3 id="quotation-table-heading">Quotation register</h3></div>
              <span className="quotation-result-count">{quotationRows.length} records</span>
            </div>
            {quotationRows.length ? (
              <div className="quotation-table-scroll">
                <table className="quotation-table">
                  <thead>
                    <tr>
                      <th>Quotation No.</th>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Route</th>
                      <th>Validity</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotationRows.map((quotation) => (
                      <tr key={quotation.id}>
                        <td><strong>{quotation.id}</strong>{quotation.linkedJobNo && <small>Job {quotation.linkedJobNo}</small>}</td>
                        <td>{customers.get(quotation.customerId)?.name ?? 'Unknown customer'}</td>
                        <td>{[...new Set(quotation.lines.map((line) => label(line.department)))].join(', ') || 'Not recorded'}<small>{quotation.lines.length} rate line{quotation.lines.length === 1 ? '' : 's'}</small></td>
                        <td>Not recorded</td>
                        <td>{formatDate(quotation.issuedDate)}<small>Valid until {formatDate(quotation.validUntil)}</small></td>
                        <td><strong>{currency.format(quotationTotal(quotation))}</strong><small>{quotation.currency} · illustrative</small></td>
                        <td><span className={`quotation-status quotation-status--${quotation.status}`}>{label(quotation.status)}</span></td>
                        <td><button className="quotation-view-button" type="button" onClick={() => setSelectedQuotation(quotation)}>View</button>
                        {quotation.status === 'draft' && (
                          <button
                            className="quotation-view-button button--secondary"
                            type="button"
                            onClick={() => { setEditingQuotation(quotation); setIsCreateOpen(true); }}
                          >
                            Edit
                          </button>
                        )}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="quotation-empty"><LogisticsAnimation name="emptyState" width={76} height={56} /><strong>No quotations yet</strong><span>Customer quotations will appear here when available.</span></div>
            )}
          </section>
        </section>
      ) : (
        <section id="tariff-panel" className="quotation-panel" role="tabpanel" aria-labelledby="tariff-tab">
          <div className="quotation-toolbar quotation-toolbar--tariffs">
            <label><span>Search tariffs</span><input type="search" placeholder="Tariff, provider, service…" disabled aria-label="Search tariffs (layout preview)" /></label>
            <label><span>Service</span><select disabled aria-label="Tariff service filter (layout preview)"><option>All services</option></select></label>
            <label><span>Effective date</span><input type="date" disabled aria-label="Effective date filter (layout preview)" /></label>
            <span className="quotation-toolbar-note">Tariff filters are reserved for the next implementation step.</span>
          </div>
          <section className="quotation-table-card" aria-labelledby="tariff-table-heading">
            <div className="quotation-section-heading">
              <div><span className="section-eyebrow">SUPPLIER / CARRIER RATES</span><h3 id="tariff-table-heading">Tariff register</h3></div>
              <span className="quotation-result-count">0 records</span>
            </div>
            <div className="quotation-table-scroll">
              <table className="quotation-table quotation-tariff-table">
                <thead><tr><th>Tariff ID</th><th>Provider</th><th>Service</th><th>Route</th><th>Rate basis</th><th>Currency</th><th>Effective dates</th><th>Status</th></tr></thead>
                <tbody><tr><td className="quotation-empty-cell" colSpan={8}><div className="quotation-empty"><strong>No tariff records configured</strong><span>Supplier and carrier records exist, but no tariff/rate schedule is defined yet. Example rates and effective dates are not invented here.</span><small>Rate basis, currency, effective dates and tariff status remain pending tariff data.</small></div></td></tr></tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {selectedQuotation && (
        <div className="quotation-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedQuotation(null) }}>
          <section className="quotation-detail-modal" role="dialog" aria-modal="true" aria-labelledby="quotation-detail-title">
            <div className="quotation-section-heading">
              <div><span className="section-eyebrow">ILLUSTRATIVE QUOTATION</span><h3 id="quotation-detail-title">{selectedQuotation.id}</h3></div>
              <button className="quotation-view-button" type="button" onClick={() => setSelectedQuotation(null)}>Close</button>
            </div>
            <p className="quotation-detail-customer">{customers.get(selectedQuotation.customerId)?.name ?? 'Unknown customer'} · {label(selectedQuotation.status)} · valid until {formatDate(selectedQuotation.validUntil)}</p>
            <div className="quotation-detail-lines">
              {selectedQuotation.lines.map((line) => (
                <div className="quotation-detail-line" key={line.id}>
                  <div><strong>{line.description}</strong><span>{label(line.department)} · {line.quantity} {line.unit} · {currency.format(line.rateRM)} / {line.unit}</span></div>
                  <strong>{currency.format(line.quantity * line.rateRM)}</strong>
                </div>
              ))}
            </div>
            <div className="quotation-detail-total" style={{ textAlign: 'right', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
              <span style={{ marginRight: '1rem' }}>Total Amount:</span>
              <strong style={{ fontSize: '1.2rem' }}>{currency.format(quotationTotal(selectedQuotation))}</strong>
            </div>
            <p className="quotation-demo-note">Illustrative rates only. Job creation and acceptance remain in the existing Jobs / Dockets workflow.</p>
          </section>
        </div>
      )}

      {isCreateOpen && (
        <QuotationForm
          dataset={dataset}
          initialData={editingQuotation}
          onSave={handleSaveQuotation}
          onCancel={() => { setIsCreateOpen(false); setEditingQuotation(null); }}
        />
      )}
    </div>
  )
}

// --- Create/Edit Quotation Modal Component ---

function QuotationForm({ dataset, initialData, onSave, onCancel }: {
  dataset: DemoDataset;
  initialData: Quotation | null;
  onSave: (q: Quotation) => void;
  onCancel: () => void;
}) {
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? '')
  const [status, setStatus] = useState<Quotation['status']>(initialData?.status ?? 'draft')
  const [issuedDate, setIssuedDate] = useState(initialData?.issuedDate ?? new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState(initialData?.validUntil ?? '')
  const [lines, setLines] = useState<QuotationLine[]>(initialData?.lines ?? [])
  const [errors, setErrors] = useState<string[]>([])

  const calculateTotal = () => lines.reduce((sum, line) => sum + (line.quantity * line.rateRM), 0)

  function addLine() {
    const newLine: QuotationLine = {
      id: `QTL-NEW-${crypto.randomUUID().slice(0, 8)}`,
      department: 'forwarding',
      description: '',
      quantity: 1,
      unit: 'job',
      rateRM: 0,
    }
    setLines([...lines, newLine])
  }

  function updateLine(id: string, fields: Partial<QuotationLine>) {
    setLines(lines.map(line => line.id === id ? { ...line, ...fields } : line))
  }

  function removeLine(id: string) {
    setLines(lines.filter(line => line.id !== id))
  }

  function validate() {
    const errs: string[] = []
    if (!customerId) errs.push('Customer is required')
    if (!validUntil) errs.push('Validity date is required')
    if (lines.length === 0) errs.push('At least one service line item is required')
    lines.forEach((line, index) => {
      if (!line.description) errs.push(`Line ${index + 1}: Description is required`)
      if (line.quantity <= 0) errs.push(`Line ${index + 1}: Quantity must be positive`)
      if (line.rateRM < 0) errs.push(`Line ${index + 1}: Rate cannot be negative`)
    })
    setErrors(errs)
    return errs.length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const quotation: Quotation = {
      id: initialData?.id ?? `QT-${new Date().getFullYear().toString().slice(2)}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${Math.floor(Math.random() * 1000)}`,
      customerId,
      status,
      issuedDate,
      validUntil,
      currency: 'MYR',
      lines,
      illustrative: true,
    }
    onSave(quotation)
  }

  return (
    <div className="job-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <section className="job-create-modal quotation-create-modal" role="dialog" aria-modal="true">
        <div className="job-create-heading">
          <div>
            <span className="section-eyebrow">{initialData ? 'EDIT QUOTATION' : 'NEW QUOTATION'}</span>
            <h2>{initialData ? `Update ${initialData.id}` : 'Create customer quotation'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onCancel}><span style={{ fontSize: '20px' }}>&times;</span></button>
        </div>

        <form className="quotation-create-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} noValidate>
          <div className="quotation-form-body">
          <section className="quotation-details-panel" aria-labelledby="quotation-details-heading">
            <div className="quotation-form-section-heading">
              <span className="section-eyebrow">QUOTATION DETAILS</span>
              <h3 id="quotation-details-heading">Customer and validity</h3>
            </div>
            <div className="quotation-details-fields">
            <label>
              <span>Customer</span>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Select customer</option>
                {dataset.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as Quotation['status'])} required>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="expired">Expired</option>
              </select>
            </label>
            <label>
              <span>Issued Date</span>
              <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} required />
            </label>
            <label>
              <span>Valid Until</span>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
            </label>
            </div>
          </section>

          <section className="quotation-lines-editor" aria-labelledby="quotation-lines-heading">
            <div className="quotation-form-section-heading quotation-lines-heading">
              <div>
                <span className="section-eyebrow">SERVICES</span>
                <h3 id="quotation-lines-heading">Service Line Items</h3>
              </div>
              <button type="button" className="button button--secondary quotation-add-line" onClick={addLine}>+ Add Line</button>
            </div>

            <div className="quotation-lines-scroll">
            <div className="quotation-lines-grid quotation-lines-grid--header">
              <span>Department</span>
              <span>Description</span>
              <span>Quantity</span>
              <span>Unit</span>
              <span>Rate (RM)</span>
              <span>Subtotal</span>
              <span></span>
            </div>

            {lines.map((line, index) => (
              <div key={line.id} className="quotation-line-row">
                <select value={line.department} onChange={(e) => updateLine(line.id, { department: e.target.value as Department })}>
                  {(['forwarding', 'customs', 'haulage', 'warehouse'] as Department[]).map(d => <option key={d} value={d}>{label(d)}</option>)}
                </select>
                <input value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} placeholder="Service description" />
                <input type="number" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} />
                <input value={line.unit} onChange={(e) => updateLine(line.id, { unit: e.target.value })} />
                <input type="number" value={line.rateRM} onChange={(e) => updateLine(line.id, { rateRM: parseFloat(e.target.value) || 0 })} />
                <div className="quotation-line-subtotal">{currency.format(line.quantity * line.rateRM)}</div>
                <button type="button" className="icon-button quotation-remove-line" onClick={() => removeLine(line.id)} aria-label={`Remove line ${index + 1}`}>&times;</button>
              </div>
            ))}
            {!lines.length && <div className="quotation-lines-empty">No service lines yet. Add a line to start building this quotation.</div>}
            </div>
          </section>
          </div>

          {errors.length > 0 && (
            <ul className="job-form-errors quotation-form-errors" role="alert">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}

          <div className="quotation-form-footer">
            <div className="quotation-total-display">
              <span>Total Quotation Value</span>
              <strong>{currency.format(calculateTotal())}</strong>
            </div>
            <div className="job-create-actions">
              <button type="button" className="button button--secondary" onClick={onCancel}>Cancel</button>
              <button type="submit" className="button button--primary">Save Quotation</button>
            </div>
          </div>

        </form>
      </section>
    </div>
  )
}

export default QuotationsWorkspace
