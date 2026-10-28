import { useMemo, useState } from 'react'
import type { DemoDataset } from '../data/model.js'
import { LogisticsAnimation } from './LogisticsAnimation.js'
import './MasterDataWorkspace.css'

type MasterSectionId =
  | 'customers'
  | 'suppliers'
  | 'carriers'
  | 'services'
  | 'tariffs'
  | 'fleet'
  | 'drivers'
  | 'warehouses'
  | 'users'
  | 'settings'

type WorkspacePage = 'quotations' | 'haulage' | 'forwarding' | 'warehouse' | 'billing'
type StatusTone = 'neutral' | 'positive' | 'warning' | 'info'

interface MasterSection {
  id: MasterSectionId
  label: string
  addLabel: string
  description: string
  destination?: WorkspacePage
}

interface MasterDataEntry {
  id: string
  title: string
  reference: string
  details: string
  status: string
  tone: StatusTone
  relatedWorkspace: string
  destination: WorkspacePage | null
  searchText: string
}

const sections: MasterSection[] = [
  { id: 'customers', label: 'Customers', addLabel: 'Add Customer', description: 'Customer organisations referenced by quotations, jobs and finance.' },
  { id: 'suppliers', label: 'Suppliers', addLabel: 'Add Supplier', description: 'Service providers referenced by operational and supplier-cost records.' },
  { id: 'carriers', label: 'Carriers', addLabel: 'Add Carrier', description: 'Carrier records are represented by suppliers with the carrier service type.' },
  { id: 'services', label: 'Services & Units', addLabel: 'Add Service', description: 'Service and unit references derived from existing illustrative quotation lines.' },
  { id: 'tariffs', label: 'Tariffs & Rate References', addLabel: 'Add Tariff', description: 'Tariff schedules are not configured; review the existing quotation workspace.' , destination: 'quotations' },
  { id: 'fleet', label: 'Trucks & Trailers', addLabel: 'Add Vehicle', description: 'Fleet operations and existing vehicle records are available in the haulage workspace.', destination: 'haulage' },
  { id: 'drivers', label: 'Drivers', addLabel: 'Add Driver', description: 'Drivers referenced by shared trip assignments.' },
  { id: 'warehouses', label: 'Warehouses & Locations', addLabel: 'Add Warehouse', description: 'Locations below are derived from warehouse receipts, not warehouse master records.' },
  { id: 'users', label: 'Users & Roles', addLabel: 'Add User', description: 'User and role records are not configured; the portal role switch is a frontend-only preview.' },
  { id: 'settings', label: 'General Settings', addLabel: 'Add Setting', description: 'No general settings records or editable configuration are defined in this prototype.' },
]

function getEntries(dataset: DemoDataset, section: MasterSectionId): MasterDataEntry[] {
  switch (section) {
    case 'customers':
      return dataset.customers.map((customer) => ({
        id: customer.id,
        title: customer.name,
        reference: customer.code,
        details: `${customer.city}, ${customer.country}`,
        status: 'Listed',
        tone: 'neutral',
        relatedWorkspace: 'Quotations',
        destination: 'quotations',
        searchText: `${customer.name} ${customer.code} ${customer.city}`,
      }))
    case 'suppliers':
      return dataset.suppliers.map((supplier) => ({
        id: supplier.id,
        title: supplier.name,
        reference: supplier.code,
        details: supplier.service.replaceAll('_', ' '),
        status: 'Listed',
        tone: 'neutral',
        relatedWorkspace: 'Finance',
        destination: 'billing',
        searchText: `${supplier.name} ${supplier.code} ${supplier.service}`,
      }))
    case 'carriers':
      return dataset.suppliers
        .filter((supplier) => supplier.service === 'carrier')
        .map((carrier) => ({
          id: carrier.id,
          title: carrier.name,
          reference: carrier.code,
          details: 'Carrier supplier record',
          status: 'Listed',
          tone: 'neutral',
          relatedWorkspace: 'Forwarding',
          destination: 'forwarding',
          searchText: `${carrier.name} ${carrier.code}`,
        }))
    case 'services': {
      const lines = dataset.quotations.flatMap((quotation) =>
        quotation.lines.map((line) => ({
          quotationId: quotation.id,
          line,
        })),
      )
      return lines.map(({ quotationId, line }) => ({
        id: line.id,
        title: line.description,
        reference: quotationId,
        details: `${line.department} · ${line.quantity} ${line.unit} · MYR ${line.rateRM.toLocaleString('en-MY')}`,
        status: 'Illustrative',
        tone: 'warning',
        relatedWorkspace: 'Quotations',
        destination: 'quotations',
        searchText: `${line.description} ${line.department} ${line.unit} ${quotationId}`,
      }))
    }
    case 'drivers':
      return dataset.drivers.map((driver) => ({
        id: driver.id,
        title: driver.name,
        reference: driver.id,
        details: `${driver.licenceClass} licence · ${driver.phone}`,
        status: driver.status.replaceAll('_', ' '),
        tone: driver.status === 'available' ? 'positive' : driver.status === 'on_trip' ? 'info' : 'neutral',
        relatedWorkspace: 'Haulage / Fleet',
        destination: 'haulage',
        searchText: `${driver.name} ${driver.id} ${driver.phone} ${driver.licenceClass} ${driver.status}`,
      }))
    case 'warehouses': {
      const locations = new Map<string, number>()
      dataset.warehouseReceipts.forEach((receipt) => {
        locations.set(receipt.location, (locations.get(receipt.location) ?? 0) + 1)
      })
      return [...locations].map(([location, receiptCount]) => ({
        id: location,
        title: location,
        reference: 'Receipt location',
        details: `${receiptCount} warehouse ${receiptCount === 1 ? 'receipt' : 'receipts'}`,
        status: 'Derived',
        tone: 'info',
        relatedWorkspace: 'Warehouse',
        destination: 'warehouse',
        searchText: `${location} warehouse receipt ${receiptCount}`,
      }))
    }
    case 'tariffs':
    case 'fleet':
    case 'users':
    case 'settings':
      return []
  }
}

function MasterDataWorkspace({
  dataset,
  onNavigate,
}: {
  dataset: DemoDataset
  onNavigate: (page: WorkspacePage) => void
}) {
  const [activeSection, setActiveSection] = useState<MasterSectionId>('customers')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const section = sections.find((item) => item.id === activeSection) ?? sections[0]
  const entries = useMemo(() => getEntries(dataset, activeSection), [dataset, activeSection])
  const statuses = [...new Set(entries.map((entry) => entry.status))]
  const visibleEntries = entries.filter((entry) => {
    const matchesSearch = `${entry.title} ${entry.reference} ${entry.details} ${entry.searchText}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
    return matchesSearch && (statusFilter === 'all' || entry.status === statusFilter)
  })
  const locationCount = new Set(dataset.warehouseReceipts.map((receipt) => receipt.location)).size
  const quotationLineCount = dataset.quotations.reduce((total, quotation) => total + quotation.lines.length, 0)
  const activeFleetCount = dataset.trucks.filter((truck) => truck.status !== 'maintenance').length
  const carrierCount = dataset.suppliers.filter((supplier) => supplier.service === 'carrier').length

  function chooseSection(id: MasterSectionId) {
    setActiveSection(id)
    setQuery('')
    setStatusFilter('all')
  }

  return (
    <div className="master-data-workspace">
      <section className="master-data-intro">
        <div>
          <span className="section-eyebrow">SHARED REFERENCE DATA</span>
          <p>{section.description}</p>
        </div>
        <button
          className="button button--primary master-data-add"
          type="button"
          disabled
          title="Record creation is planned for the next implementation step."
        >
          <span aria-hidden="true">+</span> {section.addLabel}
        </button>
      </section>

      <section className="master-data-summary" aria-label="Master data overview">
        <article className="master-summary-card">
          <span className="master-summary-label">Total customers</span>
          <strong>{dataset.customers.length}</strong>
          <small>Shared customer records</small>
        </article>
        <article className="master-summary-card">
          <span className="master-summary-label">Suppliers &amp; carriers</span>
          <strong>{dataset.suppliers.length}</strong>
          <small>{carrierCount} carrier {carrierCount === 1 ? 'record' : 'records'} included</small>
        </article>
        <article className="master-summary-card">
          <span className="master-summary-label">Active fleet vehicles</span>
          <strong>{activeFleetCount}</strong>
          <small>Available or assigned to a trip</small>
        </article>
        <article className="master-summary-card">
          <span className="master-summary-label">Warehouse locations</span>
          <strong>{locationCount}</strong>
          <small>Distinct receipt locations · not a master register</small>
        </article>
        <article className="master-summary-card master-summary-card--accent">
          <span className="master-summary-label">Service / rate references</span>
          <strong>{quotationLineCount}</strong>
          <small>Illustrative quote lines · tariffs not configured</small>
        </article>
      </section>

      <nav className="master-data-nav" aria-label="Master data sections">
        {sections.map((item) => (
          <button
            aria-current={activeSection === item.id ? 'page' : undefined}
            className={`master-data-nav-item${activeSection === item.id ? ' master-data-nav-item--active' : ''}`}
            key={item.id}
            onClick={() => chooseSection(item.id)}
            type="button"
          >
            {item.label}
            {item.id === 'tariffs' && <span className="master-data-nav-count">0</span>}
          </button>
        ))}
      </nav>

      <section className="master-data-panel" aria-labelledby="master-data-section-title">
        <div className="master-data-panel-heading">
          <div>
            <span className="section-eyebrow">REFERENCE REGISTER</span>
            <h2 id="master-data-section-title">{section.label}</h2>
          </div>
          <span className="master-data-result-count">
            {section.destination && (activeSection === 'tariffs' || activeSection === 'fleet')
              ? 'Existing workspace'
              : `${visibleEntries.length} ${visibleEntries.length === 1 ? 'record' : 'records'}`}
          </span>
        </div>

        {section.destination && (activeSection === 'tariffs' || activeSection === 'fleet') ? (
          <div className="master-data-linked-workspace">
            <div className="master-linked-icon" aria-hidden="true">{activeSection === 'fleet' ? 'TR' : 'RM'}</div>
            <div>
              <strong>{activeSection === 'fleet' ? 'Fleet records are managed alongside haulage operations' : 'Tariff schedules are not configured'}</strong>
              <p>
                {activeSection === 'fleet'
                  ? 'Open the existing Haulage / Fleet workspace to review vehicles, trips, trailers and their Job No. links.'
                  : 'The Quotations & Tariffs workspace contains the existing tariff register. It currently has no configured rate schedules.'}
              </p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => onNavigate(section.destination!)}>
              {activeSection === 'fleet' ? 'Open Haulage / Fleet' : 'Open Quotations & Tariffs'}
            </button>
          </div>
        ) : (
          <>
            <div className="master-data-toolbar">
              <label className="master-data-search">
                <span>Search {section.label.toLowerCase()}</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, reference or details"
                />
              </label>
              <label className="master-data-status-filter">
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <button
                className="master-data-clear"
                type="button"
                onClick={() => {
                  setQuery('')
                  setStatusFilter('all')
                }}
              >
                Clear filters
              </button>
            </div>

            {visibleEntries.length > 0 ? (
              <div className="master-data-table-scroll">
                <table className="master-data-table">
                  <thead>
                    <tr>
                      <th scope="col">Name / record</th>
                      <th scope="col">Reference</th>
                      <th scope="col">Details</th>
                      <th scope="col">Status</th>
                      <th scope="col">Related workspace</th>
                      <th scope="col"><span className="visually-hidden">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td><strong>{entry.title}</strong><small>{entry.id}</small></td>
                        <td>{entry.reference}</td>
                        <td className="master-data-details">{entry.details}</td>
                        <td><span className={`master-data-status master-data-status--${entry.tone}`}>{entry.status}</span></td>
                        <td>{entry.relatedWorkspace}</td>
                        <td>
                          {entry.destination && (
                            <button
                              className="master-data-row-action"
                              type="button"
                              onClick={() => onNavigate(entry.destination!)}
                            >
                              Open <span aria-hidden="true">→</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="master-data-empty">
                <LogisticsAnimation name="emptyState" width={78} height={58} />
                <strong>
                  {entries.length === 0
                    ? activeSection === 'users'
                      ? 'No user or role records configured'
                      : activeSection === 'settings'
                        ? 'No general settings are configured'
                        : activeSection === 'warehouses'
                          ? 'No warehouse receipt locations available'
                          : 'No service references available'
                    : 'No records match these filters'}
                </strong>
                <p>
                  {entries.length === 0
                    ? activeSection === 'users'
                      ? 'Authentication, user administration and role-based access are not implemented in this frontend prototype.'
                      : activeSection === 'settings'
                        ? 'Unconfirmed business rules remain Pending Business Clarification; no editable settings are implied here.'
                        : section.description
                    : 'Try a different search term or clear the selected status filter.'}
                </p>
              </div>
            )}
          </>
        )}
      </section>

      {/* <p className="master-data-demo-note" role="note">
        <span className="status-dot status-dot--amber" />
        Demo Data · Values are drawn from shared illustrative records. Add and edit actions are reserved for a later step.
      </p> */}
    </div>
  )
}

export default MasterDataWorkspace
