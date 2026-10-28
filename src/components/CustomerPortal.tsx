import { useMemo, useState } from 'react'
import { getCustomerPortalData } from '../data/customerPortal.js'
import type { DemoDataset } from '../data/model.js'

interface CustomerPortalProps {
  dataset: DemoDataset
  onExitToStaffWorkspace: () => void
}

function titleCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(date: string | null): string {
  if (!date) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`))
}

function trackingSourceLabel(source: 'manual' | 'imported' | 'integration_verified'): string {
  if (source === 'integration_verified') return 'Integration-verified · demo/unconfigured'
  return source === 'manual' ? 'Manual update' : 'Imported · demo'
}

function CustomerPortal({ dataset, onExitToStaffWorkspace }: CustomerPortalProps) {
  const [role, setRole] = useState<'customer' | 'staff'>('customer')
  const [customerId, setCustomerId] = useState(dataset.customers[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const portal = useMemo(() => getCustomerPortalData(dataset, customerId), [customerId, dataset])
  const customer = dataset.customers.find((record) => record.id === customerId)
  const jobs = useMemo(() => {
    const search = query.trim().toLowerCase()
    return portal.jobs.filter((job) => {
      if (!search) return true
      const containers = dataset.containers.filter((container) => container.jobNo === job.jobNo)
      const shipments = dataset.shipments.filter((shipment) => shipment.jobNo === job.jobNo)
      return [
        job.jobNo,
        job.description,
        job.operationalStatus,
        ...containers.map((container) => container.containerNo),
        ...shipments.map((shipment) => shipment.houseBillNo),
      ].filter(Boolean).join(' ').toLowerCase().includes(search)
    })
  }, [dataset.containers, dataset.shipments, portal.jobs, query])

  if (role === 'staff') {
    return (
      <div className="customer-portal-workspace">
        <div className="portal-demo-banner">
          <strong>Demo role switch · Internal staff preview</strong>
          <span>This selector only changes the frontend view. It is not authentication or server-side access control.</span>
        </div>
        <section className="portal-role-gateway">
          <span className="section-eyebrow">STAFF WORKSPACE</span>
          <h2>Customer-only content is hidden in this role view.</h2>
          <p>Use the internal workspace to access operational records. This frontend demo does not enforce permissions.</p>
          <button className="button button--primary" type="button" onClick={onExitToStaffWorkspace}>Open internal dashboard</button>
        </section>
      </div>
    )
  }

  const documentsByJob = new Map<string, typeof portal.documents>()
  for (const document of portal.documents) {
    const records = documentsByJob.get(document.jobNo) ?? []
    records.push(document)
    documentsByJob.set(document.jobNo, records)
  }

  return (
    <div className="customer-portal-workspace">
      <div className="portal-demo-banner" role="note">
        <strong>Customer portal · demo mode</strong>
        <span>Frontend-only role preview; this selector is not authentication or server-side security.</span>
      </div>

      <section className="portal-header-card">
        <div className="portal-brand">
          <span className="portal-brand-mark">SK</span>
          <div><span className="section-eyebrow">SK TRANSWORLD LOGISTICS</span><h2>Customer shipment portal</h2><p>Shipment status and documents approved for customer sharing.</p></div>
        </div>
        <div className="portal-controls">
          <label><span>Demo role</span><select value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="customer">Customer user · read only</option><option value="staff">Internal staff preview</option></select></label>
          <label><span>Selected demo customer</span><select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setQuery('') }}>{dataset.customers.map((record) => <option key={record.id} value={record.id}>{record.name}</option>)}</select></label>
        </div>
      </section>

      <div className="portal-scope-note">
        Showing only {customer?.name ?? 'the selected customer'} records. Supplier costs, internal notes, audit activity, and internal profitability are not included in this view.
      </div>

      <section className="portal-summary" aria-label="Customer portal summary">
        <div><span>Active jobs</span><strong>{portal.jobs.filter((job) => job.operationalStatus !== 'delivered').length}</strong></div>
        <div><span>Shipments</span><strong>{new Set(dataset.shipments.filter((shipment) => portal.jobs.some((job) => job.jobNo === shipment.jobNo)).map((shipment) => shipment.id)).size}</strong></div>
        <div><span>Approved documents</span><strong>{portal.documents.length}</strong></div>
        <div><span>Customer charge lines</span><strong>{portal.charges.length}</strong></div>
      </section>

      <section className="portal-jobs-section">
        <div className="portal-section-heading"><div><span className="section-eyebrow">SHIPMENT VISIBILITY</span><h3>Your jobs &amp; shipments</h3></div><label><span>Search your records</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job No., container, HBL, status…" /></label></div>
        {jobs.length ? <div className="portal-job-list">{jobs.map((job) => {
          const shipments = dataset.shipments.filter((shipment) => shipment.jobNo === job.jobNo)
          const containers = dataset.containers.filter((container) => container.jobNo === job.jobNo)
          const documents = documentsByJob.get(job.jobNo) ?? []
          const charges = portal.charges.filter((charge) => charge.jobNo === job.jobNo)
          return (
            <article className="portal-job-card" key={job.jobNo}>
              <div className="portal-job-heading"><div><span className="section-eyebrow">JOB NUMBER</span><h4>{job.jobNo}</h4><p>{job.description}</p></div><span className={`portal-status portal-status--${job.operationalStatus}`}>{titleCase(job.operationalStatus)}</span></div>
              <div className="portal-job-facts">
                <div><span>Customer reference</span><strong>{customer?.name ?? 'Selected customer'}</strong></div>
                <div><span>Current ETA</span><strong>{formatDate(shipments.map((shipment) => shipment.eta).filter(Boolean).sort().at(-1) ?? job.eta)}</strong></div>
                <div><span>Service</span><strong>{job.serviceDepartments.map(titleCase).join(', ')}</strong></div>
              </div>
              {shipments.length > 0 && <div className="portal-shipment-list">{shipments.map((shipment) => <div className="portal-shipment-row" key={shipment.id}><span>{shipment.mode} · {titleCase(shipment.movement)}</span><strong>{shipment.houseBillNo ?? 'Bill reference not recorded'}</strong><span>ETA {formatDate(shipment.eta)}</span><span className={`portal-tracking-source portal-tracking-source--${shipment.trackingSource}`}>{trackingSourceLabel(shipment.trackingSource)}</span></div>)}</div>}
              <div className="portal-containers">{containers.length ? containers.map((container) => <div className="portal-container-chip" key={container.id}><span>Container</span><strong>{container.containerNo}</strong><small>{titleCase(container.status)} · ETA {formatDate(container.eta)}</small></div>) : <p>No container reference is recorded.</p>}</div>
              <div className="portal-job-related">
                <section><h5>Approved customer documents</h5>{documents.length ? <ul>{documents.map((document) => <li key={document.id}><span>{titleCase(document.type)}</span><strong>{document.fileName ?? 'File name not recorded'}</strong><small>v{document.version} · {formatDate(document.uploadedAt)}</small></li>)}</ul> : <p>No documents have been approved for customer sharing.</p>}</section>
                <section><h5>Customer charge categories</h5>{charges.length ? <ul>{charges.map((charge) => <li key={charge.id}><span>{titleCase(charge.category)} · {charge.description}</span><strong>RM {charge.amountRM.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>{charge.invoiceId} · {titleCase(charge.invoiceStatus)}</small></li>)}</ul> : <p>No invoiced customer charges are available.</p>}</section>
              </div>
            </article>
          )
        })}</div> : <div className="portal-empty"><strong>{query ? 'No customer records match your search.' : 'No jobs are currently available for this customer.'}</strong><span>Only this selected demo customer’s shared shipment records are shown.</span></div>}
      </section>
      <footer className="portal-footer">Demo data · Status and document visibility are examples, not a live carrier or customs feed.</footer>
    </div>
  )
}

export default CustomerPortal
