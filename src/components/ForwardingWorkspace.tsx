import { useMemo, useState } from 'react'
import { getContainerFreeTime, getForwardingRecords, type ForwardingFilters } from '../data/shipments.js'
import type { DemoDataset, OperationalMilestone } from '../data/model.js'

interface ForwardingWorkspaceProps {
  dataset: DemoDataset
  onOpenJob: (jobNo: string) => void
  onUpdateMilestone: (milestoneId: string, status: OperationalMilestone['status']) => void
}

type ForwardingTab = 'shipments' | 'containers'

const initialFilters: ForwardingFilters = {
  query: '',
  mode: 'all',
  movement: 'all',
  status: 'all',
  trackingSource: 'all',
}

function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function sourceLabel(source: OperationalMilestone['source']): string {
  if (source === 'integration_verified') return 'Integration-verified'
  return label(source)
}

export function ForwardingWorkspace({
  dataset,
  onOpenJob,
  onUpdateMilestone,
}: ForwardingWorkspaceProps) {
  const [tab, setTab] = useState<ForwardingTab>('shipments')
  const [filters, setFilters] = useState(initialFilters)
  const [selectedShipmentId, setSelectedShipmentId] = useState(dataset.shipments[0]?.id ?? '')
  const [selectedContainerNo, setSelectedContainerNo] = useState(dataset.containers[0]?.containerNo ?? '')
  const records = useMemo(() => getForwardingRecords(dataset, filters), [dataset, filters])
  const filteredContainers = records.flatMap(({ shipment, containers }) =>
    containers.map((container) => ({ shipment, container })),
  )
  const selectedRecord =
    records.find(({ shipment }) => shipment.id === selectedShipmentId) ?? records[0]
  const selectedContainerRecord =
    filteredContainers.find(({ container }) => container.containerNo === selectedContainerNo) ??
    filteredContainers[0]
  const activeJobNo = tab === 'shipments'
    ? selectedRecord?.shipment.jobNo
    : selectedContainerRecord?.container.jobNo
  const milestones = activeJobNo
    ? dataset.milestones
        .filter((milestone) =>
          milestone.jobNo === activeJobNo &&
          milestone.department === 'forwarding' &&
          (
            tab === 'shipments' ||
            !milestone.containerNo ||
            milestone.containerNo === selectedContainerRecord?.container.containerNo
          ),
        )
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    : []

  function setFilter<Key extends keyof ForwardingFilters>(key: Key, value: ForwardingFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="logistics-workspace">
      {/* <div className="logistics-intro">
        <div>
          <span className="section-eyebrow">OCEAN + CONTAINER OPERATIONS</span>
          <h2>Freight forwarding & container tracking</h2>
          <p>Shipment, container, milestone and free-time records joined by the shared Job No.</p>
        </div>
        <span className="status-badge status-badge--blue">{dataset.metadata.label}</span>
      </div> */}

      <div className="logistics-tabs" role="tablist" aria-label="Forwarding workspaces">
        <button aria-selected={tab === 'shipments'} className={tab === 'shipments' ? 'logistics-tab logistics-tab--active' : 'logistics-tab'} onClick={() => setTab('shipments')} role="tab" type="button">Freight forwarding <span>{records.length}</span></button>
        <button aria-selected={tab === 'containers'} className={tab === 'containers' ? 'logistics-tab logistics-tab--active' : 'logistics-tab'} onClick={() => setTab('containers')} role="tab" type="button">Container tracking <span>{filteredContainers.length}</span></button>
      </div>

      <section className="logistics-filter-card" aria-label="Shipment and container filters">
        <label className="logistics-search">
          <span>Search shipments, bills or containers</span>
          <input
            onChange={(event) => setFilter('query', event.target.value)}
            placeholder="Job No., customer, vessel, BL/HBL/MBL, container…"
            type="search"
            value={filters.query}
          />
        </label>
        <label><span>Mode</span><select onChange={(event) => setFilter('mode', event.target.value as ForwardingFilters['mode'])} value={filters.mode}><option value="all">All modes</option><option value="FCL">FCL</option><option value="LCL">LCL</option></select></label>
        <label><span>Movement</span><select onChange={(event) => setFilter('movement', event.target.value as ForwardingFilters['movement'])} value={filters.movement}><option value="all">All movements</option><option value="import">Import</option><option value="export">Export</option><option value="transshipment">Transshipment</option></select></label>
        <label><span>Container status</span><select onChange={(event) => setFilter('status', event.target.value as ForwardingFilters['status'])} value={filters.status}><option value="all">All statuses</option><option value="booked">Booked</option><option value="in_transit">In transit</option><option value="at_port">At port</option><option value="in_warehouse">In warehouse</option><option value="delivered">Delivered</option></select></label>
        <label><span>Tracking source</span><select onChange={(event) => setFilter('trackingSource', event.target.value as ForwardingFilters['trackingSource'])} value={filters.trackingSource}><option value="all">All sources</option><option value="manual">Manual</option><option value="imported">Imported</option><option value="integration_verified">Integration-verified</option></select></label>
        <button className="logistics-reset" onClick={() => setFilters(initialFilters)} type="button">Reset filters</button>
      </section>

      <div className="logistics-content-grid">
        <section className="logistics-record-card" aria-label={tab === 'shipments' ? 'Shipment register' : 'Container register'}>
          <div className="logistics-card-heading">
            <div><span className="section-eyebrow">{tab === 'shipments' ? 'SHIPMENT REGISTER' : 'CONTAINER REGISTER'}</span><h3>{tab === 'shipments' ? 'Shipments' : 'Containers'}</h3></div>
            <span>{tab === 'shipments' ? records.length : filteredContainers.length} records</span>
          </div>
          {tab === 'shipments' ? (
            records.length ? (
              <div className="logistics-list">
                {records.map(({ shipment, customerName, containers }) => (
                  <button
                    aria-pressed={selectedRecord?.shipment.id === shipment.id}
                    className={`logistics-record-option${selectedRecord?.shipment.id === shipment.id ? ' logistics-record-option--active' : ''}`}
                    key={shipment.id}
                    onClick={() => setSelectedShipmentId(shipment.id)}
                    type="button"
                  >
                    <span className="logistics-record-main">
                      <strong>{shipment.jobNo}</strong><small>{customerName}</small><small>{shipment.vessel} · {shipment.voyage}</small>
                    </span>
                    <span className="logistics-record-aside"><b>{containers.length} {containers.length === 1 ? 'container' : 'containers'}</b><small>{label(shipment.mode)} · {label(shipment.movement)}</small><small>ETA {formatDate(shipment.eta)}</small></span>
                  </button>
                ))}
              </div>
            ) : <p className="logistics-empty">No shipments match the search and filters.</p>
          ) : (
            filteredContainers.length ? (
              <div className="logistics-list">
                {filteredContainers.map(({ shipment, container }) => {
                  const freeTime = getContainerFreeTime(container.freeTimeExpiryDate, dataset.metadata.asOfDate)
                  return (
                    <button
                      aria-pressed={selectedContainerRecord?.container.containerNo === container.containerNo}
                      className={`logistics-record-option${selectedContainerRecord?.container.containerNo === container.containerNo ? ' logistics-record-option--active' : ''}`}
                      key={container.id}
                      onClick={() => setSelectedContainerNo(container.containerNo)}
                      type="button"
                    >
                      <span className="logistics-record-main"><strong>{container.containerNo}</strong><small>{container.jobNo} · {container.sizeType}</small><small>{shipment.vessel} · {shipment.voyage}</small></span>
                      <span className="logistics-record-aside"><b className={`logistics-status logistics-status--${container.status}`}>{label(container.status)}</b><small>{freeTime.remainingDays === null ? 'Free time not recorded' : freeTime.remainingDays < 0 ? `${Math.abs(freeTime.remainingDays)} days beyond free time` : `${freeTime.remainingDays} free days remaining`}</small><small>ETA {formatDate(container.eta)}</small></span>
                    </button>
                  )
                })}
              </div>
            ) : <p className="logistics-empty">No containers match the search and filters.</p>
          )}
        </section>

        <section className="logistics-detail-card" aria-label="Selected shipment details">
          {tab === 'shipments' && selectedRecord ? (
            <ShipmentDetail
              dataset={dataset}
              record={selectedRecord}
              milestones={milestones}
              onOpenJob={onOpenJob}
              onUpdateMilestone={onUpdateMilestone}
            />
          ) : tab === 'containers' && selectedContainerRecord ? (
            <ContainerDetail
              dataset={dataset}
              record={selectedContainerRecord}
              milestones={milestones}
              onOpenJob={onOpenJob}
              onUpdateMilestone={onUpdateMilestone}
            />
          ) : <p className="logistics-empty logistics-empty--detail">Select a record to see details and its milestone history.</p>}
        </section>
      </div>
      <p className="logistics-demo-note"><span className="status-dot status-dot--amber" />Demo snapshot · tracking source is displayed per shipment; no live carrier connection is configured.</p>
    </div>
  )
}

type ForwardingRecord = ReturnType<typeof getForwardingRecords>[number]

function ShipmentDetail({
  dataset,
  record,
  milestones,
  onOpenJob,
  onUpdateMilestone,
}: {
  dataset: DemoDataset
  record: ForwardingRecord
  milestones: OperationalMilestone[]
  onOpenJob: ForwardingWorkspaceProps['onOpenJob']
  onUpdateMilestone: ForwardingWorkspaceProps['onUpdateMilestone']
}) {
  const { shipment, job, carrierName, customerName, containers } = record
  const relatedDocuments = dataset.documents.filter((document) => document.jobNo === job.jobNo)

  return (
    <>
      <DetailHeading eyebrow="SHIPMENT DETAIL" title={shipment.id} status={label(shipment.trackingSource)} onOpenJob={() => onOpenJob(job.jobNo)} jobNo={job.jobNo} />
      <div className="logistics-detail-grid">
        <DetailFact label="Customer" value={customerName} />
        <DetailFact label="Carrier" value={carrierName} />
        <DetailFact label="Co-loader" value={shipment.coLoader ?? 'Not recorded'} />
        <DetailFact label="Vessel / voyage" value={`${shipment.vessel} · ${shipment.voyage}`} />
        <DetailFact label="ETD / ETA" value={`${formatDate(shipment.etd)} / ${formatDate(shipment.eta)}`} />
        <DetailFact label="Mode / movement" value={`${shipment.mode} · ${label(shipment.movement)}`} />
        <DetailFact label="MBL" value={shipment.masterBillNo ?? 'Not recorded'} />
        <DetailFact label="HBL" value={shipment.houseBillNo ?? 'Not recorded'} />
        <DetailFact label="Tracking source" value={label(shipment.trackingSource)} />
        <DetailFact label="Last updated" value={formatDate(shipment.lastUpdated)} />
      </div>
      <section className="logistics-subsection">
        <div className="logistics-subsection-heading"><h4>Linked containers</h4><span>{containers.length}</span></div>
        {containers.length ? <div className="logistics-container-chips">{containers.map((container) => {
          const freeTime = getContainerFreeTime(container.freeTimeExpiryDate, dataset.metadata.asOfDate)
          return <div className="logistics-container-chip" key={container.id}><strong>{container.containerNo}</strong><span>{container.sizeType} · {label(container.status)}</span><small>{container.freeDaysAllowed === null ? 'Free days not recorded' : `${container.freeDaysAllowed} free days allowed`}{freeTime.remainingDays !== null ? ` · ${freeTime.remainingDays} remaining` : ''}</small></div>
        })}</div> : <p className="logistics-empty">No container records are linked to this shipment.</p>}
      </section>
      <MilestoneHistory
        dataset={dataset}
        documents={relatedDocuments}
        job={job}
        milestones={milestones}
        onOpenJob={onOpenJob}
        onUpdateMilestone={onUpdateMilestone}
      />
    </>
  )
}

function ContainerDetail({
  dataset,
  record,
  milestones,
  onOpenJob,
  onUpdateMilestone,
}: {
  dataset: DemoDataset
  record: { shipment: ForwardingRecord['shipment']; container: DemoDataset['containers'][number] }
  milestones: OperationalMilestone[]
  onOpenJob: ForwardingWorkspaceProps['onOpenJob']
  onUpdateMilestone: ForwardingWorkspaceProps['onUpdateMilestone']
}) {
  const { shipment, container } = record
  const job = dataset.jobs.find((item) => item.jobNo === container.jobNo)
  if (!job) return <p className="logistics-empty logistics-empty--detail">The linked Job No. could not be found.</p>
  const carrier = dataset.suppliers.find((item) => item.id === shipment.carrierId)
  const freeTime = getContainerFreeTime(container.freeTimeExpiryDate, dataset.metadata.asOfDate)
  const relatedDocuments = dataset.documents.filter(
    (document) => document.jobNo === job.jobNo && (!document.containerNo || document.containerNo === container.containerNo),
  )

  return (
    <>
      <DetailHeading eyebrow="CONTAINER DETAIL" title={container.containerNo} status={label(container.status)} onOpenJob={() => onOpenJob(job.jobNo)} jobNo={job.jobNo} />
      <div className="logistics-detail-grid">
        <DetailFact label="Container / mode" value={`${container.sizeType} · ${shipment.mode}`} />
        <DetailFact label="Gross weight / volume" value={`${container.grossWeightKg.toLocaleString()} kg · ${container.volumeCBM} CBM`} />
        <DetailFact label="Movement" value={label(shipment.movement)} />
        <DetailFact label="Carrier / co-loader" value={`${carrier?.name ?? 'Unknown carrier'}${shipment.coLoader ? ` · ${shipment.coLoader}` : ''}`} />
        <DetailFact label="Vessel / voyage" value={`${shipment.vessel} · ${shipment.voyage}`} />
        <DetailFact label="MBL / HBL" value={`${shipment.masterBillNo ?? '—'} / ${shipment.houseBillNo ?? '—'}`} />
        <DetailFact label="ETD / ETA" value={`${formatDate(shipment.etd)} / ${formatDate(container.eta ?? shipment.eta)}`} />
        <DetailFact label="Free days allowed" value={container.freeDaysAllowed === null ? 'Not recorded' : `${container.freeDaysAllowed} days`} />
        <DetailFact label="Free-time expiry" value={formatDate(container.freeTimeExpiryDate)} />
        <DetailFact label="Free-time state" value={freeTime.remainingDays === null ? 'Not configured' : freeTime.remainingDays < 0 ? `Overdue by ${Math.abs(freeTime.remainingDays)} days` : `${freeTime.remainingDays} days remaining`} warning={freeTime.state === 'expired' || freeTime.state === 'due_soon'} />
        <DetailFact label="Demurrage / detention exposure" value={freeTime.state === 'expired' ? `${Math.abs(freeTime.remainingDays ?? 0)} days beyond recorded free time · rate not configured` : freeTime.remainingDays === null ? 'Free-time basis not recorded · rate not configured' : `${freeTime.remainingDays} free days remain · no charge estimate`} warning={freeTime.state === 'expired'} />
        <DetailFact label="Tracking source / update" value={`${label(shipment.trackingSource)} · ${formatDate(shipment.lastUpdated)}`} />
      </div>
      <MilestoneHistory
        dataset={dataset}
        documents={relatedDocuments}
        job={job}
        milestones={milestones}
        onOpenJob={onOpenJob}
        onUpdateMilestone={onUpdateMilestone}
      />
    </>
  )
}

function DetailHeading({ eyebrow, title, status, jobNo, onOpenJob }: { eyebrow: string; title: string; status: string; jobNo: string; onOpenJob: () => void }) {
  return (
    <div className="logistics-detail-heading">
      <div><span className="section-eyebrow">{eyebrow}</span><h3>{title}</h3><span className="logistics-detail-job">{jobNo}</span></div>
      <div className="logistics-detail-actions"><span className="logistics-source-badge">{status}</span><button className="dashboard-text-link" onClick={onOpenJob} type="button">Open Job →</button></div>
    </div>
  )
}

function DetailFact({ label: title, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`logistics-detail-fact${warning ? ' logistics-detail-fact--warning' : ''}`}><span>{title}</span><strong>{value}</strong></div>
}

function MilestoneHistory({
  dataset,
  documents,
  job,
  milestones,
  onOpenJob,
  onUpdateMilestone,
}: {
  dataset: DemoDataset
  documents: DemoDataset['documents']
  job: DemoDataset['jobs'][number]
  milestones: OperationalMilestone[]
  onOpenJob: ForwardingWorkspaceProps['onOpenJob']
  onUpdateMilestone: ForwardingWorkspaceProps['onUpdateMilestone']
}) {
  return (
    <section className="logistics-subsection">
      <div className="logistics-subsection-heading"><div><h4>Milestone history</h4><small>Date-level records · timestamps are not available in the demo dataset</small></div><span>{milestones.length}</span></div>
      {milestones.length ? (
        <ol className="logistics-milestone-list">
          {milestones.map((milestone) => {
            const evidence = documents.find((document) =>
              document.status === 'available' &&
              (milestone.containerNo ? document.containerNo === milestone.containerNo : true),
            )
            return (
              <li className={`logistics-milestone logistics-milestone--${milestone.status}`} key={milestone.id}>
                <span className="logistics-milestone-dot" />
                <div className="logistics-milestone-body">
                  <div className="logistics-milestone-title"><strong>{milestone.title}</strong><span className={`logistics-status logistics-status--${milestone.status}`}>{label(milestone.status)}</span></div>
                  <div className="logistics-milestone-meta"><span>Owner: {job.owner}</span><span>Recorded date: {formatDate(milestone.occurredAt)}</span><span>Source: {sourceLabel(milestone.source)}</span></div>
                  <div className="logistics-evidence">{evidence ? <>Related document on Job No.: <button className="documents-evidence-link" type="button" onClick={() => onOpenJob(job.jobNo)}><strong>{evidence.type} · {evidence.fileName ?? 'Filename not recorded'}</strong></button></> : 'No related document is on file for this Job No.'}</div>
                  {milestone.status !== 'completed' && (
                    <label className="milestone-update-control">Update status
                      <select aria-label={`Update ${milestone.title} status`} onChange={(event) => onUpdateMilestone(milestone.id, event.target.value as OperationalMilestone['status'])} value={milestone.status}>
                        <option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
                      </select>
                    </label>
                  )}
                  {milestone.source === 'integration_verified' && <p className="logistics-event-note">Integration-verified is the source label recorded in the demo data; no live connection is implied.</p>}
                </div>
              </li>
            )
          })}
        </ol>
      ) : <p className="logistics-empty">No forwarding milestones are recorded for this Job No.</p>}
      <p className="logistics-demo-caption">Manual milestone updates remain local to this prototype. Status changes do not create or imply carrier/customs evidence.</p>
      <span className="sr-only">{dataset.metadata.asOfDate}</span>
    </section>
  )
}
