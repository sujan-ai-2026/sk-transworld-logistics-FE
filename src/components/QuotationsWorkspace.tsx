import { useMemo, useState } from 'react'
import type { DemoDataset, Quotation } from '../data/model.js'
import { LogisticsAnimation } from './LogisticsAnimation.js'

type QuotationTab = 'quotations' | 'tariffs'

interface QuotationsWorkspaceProps {
  dataset: DemoDataset
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

function QuotationsWorkspace({ dataset }: QuotationsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<QuotationTab>('quotations')
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const customers = new Map(dataset.customers.map((customer) => [customer.id, customer]))
  const quotationRows = useMemo(
    () => [...dataset.quotations].sort((a, b) => b.issuedDate.localeCompare(a.issuedDate)),
    [dataset.quotations],
  )
  const quotedTotal = quotationRows.reduce((total, quotation) => total + quotationTotal(quotation), 0)
  const openCount = quotationRows.filter((quotation) => quotation.status === 'draft' || quotation.status === 'sent').length
  const acceptedCount = quotationRows.filter((quotation) => quotation.status === 'accepted').length

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
          disabled
          title="Quotation creation is outside this visual-layout step."
        >
          Create Quotation
        </button>
      </section>

      <div className="quotation-demo-note" role="note">
        Rates and amounts are illustrative. This layout does not create, edit, send, accept or expire quotations.
      </div>

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
                        <td><button className="quotation-view-button" type="button" onClick={() => setSelectedQuotation(quotation)}>View</button></td>
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
            <p className="quotation-demo-note">Illustrative rates only. Job creation and acceptance remain in the existing Jobs / Dockets workflow.</p>
          </section>
        </div>
      )}
    </div>
  )
}

export default QuotationsWorkspace
