import { useMemo, useState } from 'react'
import { getAlertAgeLabel } from '../data/alerts.js'
import type { DemoDataset, OperationalAlert } from '../data/model.js'

type AlertStatusFilter = 'all' | OperationalAlert['status']

interface AlertsWorkspaceProps {
  dataset: DemoDataset
  onUpdateAlert: (alert: OperationalAlert) => void
  onOpenJob: (jobNo: string) => void
  onNavigate: (page: 'billing' | 'customs' | 'documents' | 'haulage' | 'warehouse') => void
}

const severityOrder: Record<OperationalAlert['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function alertTypeLabel(type: OperationalAlert['type']): string {
  return type.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function dateLabel(date: string | null): string {
  if (!date) return 'No due date'
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`))
}

function AlertsWorkspace({ dataset, onUpdateAlert, onOpenJob, onNavigate }: AlertsWorkspaceProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<OperationalAlert['severity'] | 'all'>('all')
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const owners = [...new Set([...dataset.alerts.map((alert) => alert.owner), 'Operations desk', 'Finance', 'Customs desk', 'Fleet desk'])]
  const visibleAlerts = useMemo(() => {
    const search = query.trim().toLowerCase()
    return [...dataset.alerts]
      .filter((alert) => statusFilter === 'all' || alert.status === statusFilter)
      .filter((alert) => severityFilter === 'all' || alert.severity === severityFilter)
      .filter((alert) => {
        const job = dataset.jobs.find((record) => record.jobNo === alert.jobNo)
        const customer = job && dataset.customers.find((record) => record.id === job.customerId)
        return !search || [
          alert.id,
          alert.title,
          alert.type,
          alert.owner,
          alert.jobNo,
          alert.containerNo,
          alert.invoiceId,
          alert.truckId,
          customer?.name,
          alert.nextAction,
          ...(alert.notes ?? []),
        ].filter(Boolean).join(' ').toLowerCase().includes(search)
      })
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'))
  }, [dataset, query, severityFilter, statusFilter])

  function update(alert: OperationalAlert, changes: Partial<OperationalAlert>) {
    onUpdateAlert({ ...alert, ...changes })
  }

  function linkedRecord(alert: OperationalAlert) {
    if (alert.truckId) {
      return <button type="button" onClick={() => onNavigate('haulage')}>Truck {alert.truckId}</button>
    }
    if (alert.invoiceId) {
      return <button type="button" onClick={() => onNavigate('billing')}>Invoice {alert.invoiceId}</button>
    }
    if (alert.jobNo) {
      return <button type="button" onClick={() => onOpenJob(alert.jobNo!)}>Job {alert.jobNo}</button>
    }
    return <span>No linked record</span>
  }

  function secondaryDestination(alert: OperationalAlert) {
    if (alert.type === 'edo_pending' || alert.type === 'free_time_expiry') return 'customs'
    if (alert.type === 'missing_document') return 'documents'
    if (alert.type === 'long_stay_cargo') return 'warehouse'
    if (alert.type === 'overdue_payment') return 'billing'
    if (alert.type === 'vehicle_compliance') return 'haulage'
    return null
  }

  return (
    <div className="logistics-workspace alerts-workspace">
      {/* <div className="logistics-intro">
        <div>
          <span className="section-eyebrow">EXCEPTION MANAGEMENT</span>
          <h2>Alerts &amp; reminders</h2>
          <p>Review operational exceptions, assign owners and record demo follow-up actions.</p>
        </div>
        <span className="status-badge status-badge--blue">{dataset.metadata.label}</span>
      </div> */}

      <div className="alerts-demo-note" role="note">
        Alerts and actions are local demo state. No notifications, customer contact, or external escalation is sent.
      </div>

      <section className="alerts-summary" aria-label="Alert counts">
        {(['open', 'acknowledged', 'resolved'] as const).map((status) => (
          <div className="alerts-summary-card" key={status}>
            <span>{status === 'open' ? 'Open' : status === 'acknowledged' ? 'Acknowledged' : 'Resolved'}</span>
            <strong>{dataset.alerts.filter((alert) => alert.status === status).length}</strong>
          </div>
        ))}
        <div className="alerts-summary-card alerts-summary-card--critical">
          <span>Critical / high</span>
          <strong>{dataset.alerts.filter((alert) => alert.status !== 'resolved' && ['critical', 'high'].includes(alert.severity)).length}</strong>
        </div>
      </section>

      <section className="alerts-filter-card" aria-label="Filter alerts">
        <label><span>Search alerts</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job, customer, container, invoice, truck…" /></label>
        <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AlertStatusFilter)}><option value="all">All statuses</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select></label>
        <label><span>Severity</span><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
      </section>

      <section className="alerts-list" aria-label="Alert register">
        {visibleAlerts.length ? visibleAlerts.map((alert) => {
          const age = getAlertAgeLabel(alert, dataset.metadata.asOfDate)
          const customerJob = dataset.jobs.find((job) => job.jobNo === alert.jobNo)
          const customer = customerJob && dataset.customers.find((record) => record.id === customerJob.customerId)
          const destination = secondaryDestination(alert)
          return (
            <article className={`alert-card alert-card--${alert.severity} alert-card--${alert.status}`} key={alert.id}>
              <div className="alert-card-main">
                <div className="alert-card-title-row">
                  <span className={`alert-severity alert-severity--${alert.severity}`}>{alert.severity}</span>
                  <span className="alert-type">{alertTypeLabel(alert.type)}</span>
                  <span className={`alert-state alert-state--${alert.status}`}>{alert.status.replace('_', ' ')}</span>
                </div>
                <h3>{alert.title}</h3>
                <p className="alert-linked-records">
                  {linkedRecord(alert)}
                  {alert.containerNo && <span>Container {alert.containerNo}</span>}
                  {customer && <span>{customer.name}</span>}
                </p>
                <div className="alert-due-row"><span>Due: <strong>{dateLabel(alert.dueDate)}</strong></span><span>{age}</span><span>Created {dateLabel(alert.createdAt)}</span></div>
                {alert.acknowledgedAt && <div className="alert-audit-line">Acknowledged by {alert.acknowledgedBy ?? 'Demo workspace user'} · {dateLabel(alert.acknowledgedAt)}</div>}
                {alert.resolvedAt && <div className="alert-audit-line">Resolved · {dateLabel(alert.resolvedAt)}</div>}
              </div>
              <div className="alert-card-controls">
                <div className="alert-control-fields">
                  <label><span>Owner / assignee</span><select value={alert.owner} onChange={(event) => update(alert, { owner: event.target.value })}>{!owners.includes(alert.owner) && <option value={alert.owner}>{alert.owner}</option>}{owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select></label>
                  <label><span>Next action</span><input value={alert.nextAction} onChange={(event) => update(alert, { nextAction: event.target.value })} /></label>
                </div>
                <div className="alert-next-action"><strong>Follow-up:</strong> {alert.nextAction || 'Add a next action.'}</div>
                {alert.notes && alert.notes.length > 0 && <ul className="alert-notes">{alert.notes.map((note, index) => <li key={`${alert.id}-note-${index}`}>{note}</li>)}</ul>}
                <div className="alert-note-entry"><label><span>Add note</span><input value={noteDrafts[alert.id] ?? ''} onChange={(event) => setNoteDrafts((current) => ({ ...current, [alert.id]: event.target.value }))} placeholder="Record a follow-up note" /></label><button type="button" disabled={!noteDrafts[alert.id]?.trim()} onClick={() => { const note = noteDrafts[alert.id]?.trim(); if (!note) return; update(alert, { notes: [...(alert.notes ?? []), `${dataset.metadata.asOfDate} · ${note}`] }); setNoteDrafts((current) => ({ ...current, [alert.id]: '' })) }}>Add note</button></div>
                <div className="alert-actions">
                  {alert.status === 'open' && <button type="button" onClick={() => update(alert, { status: 'acknowledged', acknowledgedAt: dataset.metadata.asOfDate, acknowledgedBy: 'Demo workspace user' })}>Acknowledge</button>}
                  {alert.status !== 'resolved' && <button type="button" onClick={() => update(alert, { escalationCount: alert.escalationCount + 1 })}>Escalate ({alert.escalationCount})</button>}
                  {alert.status !== 'resolved' && <button className="alert-resolve-button" type="button" onClick={() => update(alert, { status: 'resolved', resolvedAt: dataset.metadata.asOfDate })}>Resolve</button>}
                  {alert.status === 'resolved' && <span className="alert-escalation-count">Resolved · {alert.escalationCount} escalation{alert.escalationCount === 1 ? '' : 's'}</span>}
                  {destination && <button type="button" onClick={() => onNavigate(destination)}>Open {destination === 'documents' ? 'documents' : destination}</button>}
                </div>
              </div>
            </article>
          )
        }) : <div className="alerts-empty"><strong>No alerts match these filters.</strong><span>Change the search, severity, or status filter to review other records.</span></div>}
      </section>
    </div>
  )
}

export default AlertsWorkspace
