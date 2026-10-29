import { useEffect, useMemo, useState } from 'react'
import {
  CUSTOMS_DECLARATION_TYPES,
  getCustomsRecords,
  getCustomsStepBlocker,
  type CustomsFilters,
  type CustomsWorkflowStep,
} from '../data/shipments.js'
import type {
  CustomsCase,
  CustomsStepStatus,
  DemoDataset,
} from '../data/model.js'
import { LogisticsAnimation } from './LogisticsAnimation.js'
import { useConfirmation } from './useConfirmation.js'

interface CustomsWorkspaceProps {
  dataset: DemoDataset
  onOpenJob: (jobNo: string) => void
  onUpdateMilestone: (milestoneId: string, status: 'pending' | 'in_progress' | 'completed') => void
  onUpdateCustomsStep: (
    customsCaseId: string,
    step: CustomsWorkflowStep,
    status: CustomsStepStatus | 'paid' | 'pending',
  ) => void
}

const initialFilters: CustomsFilters = { query: '', declarationType: 'all', status: 'all' }

const workflowSteps: Array<{
  key: CustomsWorkflowStep
  label: string
  documentType?: string
}> = [
  { key: 'declarationStatus', label: 'Declaration lodged' },
  { key: 'paymentStatus', label: 'Duty / SST payment' },
  { key: 'ssrStatus', label: 'SSR' },
  { key: 'inspectionStatus', label: 'Inspection' },
  { key: 'approvalStatus', label: 'Customs approval / release' },
  { key: 'edoStatus', label: 'EDO released', documentType: 'EDO' },
  { key: 'gatePassStatus', label: 'Gate pass' },
]

function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`))
}

function stepStatus(customsCase: CustomsCase, step: CustomsWorkflowStep): string {
  return customsCase[step]
}

function stepOptions(step: CustomsWorkflowStep): Array<{ value: string; label: string }> {
  if (step === 'paymentStatus') {
    return [
      { value: 'pending', label: 'Pending' },
      { value: 'paid', label: 'Paid' },
      { value: 'not_required', label: 'Not required' },
    ]
  }
  return [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'complete', label: 'Complete' },
    { value: 'not_required', label: 'Not required' },
  ]
}

export function CustomsWorkspace({
  dataset,
  onOpenJob,
  onUpdateMilestone,
  onUpdateCustomsStep,
}: CustomsWorkspaceProps) {
  const confirm = useConfirmation()
  const [filters, setFilters] = useState(initialFilters)
  const [selectedCaseId, setSelectedCaseId] = useState(dataset.customsCases[0]?.id ?? '')
  const records = useMemo(() => getCustomsRecords(dataset, filters), [dataset, filters])
  const selectedRecord = records.find(({ customsCase }) => customsCase.id === selectedCaseId) ?? records[0]
  const allCaseRecords = getCustomsRecords(dataset, initialFilters)
  const pendingCount = allCaseRecords.filter(({ progress }) => progress.state !== 'complete').length
  const overdueCount = allCaseRecords.filter(({ progress }) => progress.overdue).length

  function setFilter<Key extends keyof CustomsFilters>(key: Key, value: CustomsFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function confirmMilestoneUpdate(milestoneId: string, status: 'pending' | 'in_progress' | 'completed') {
    const milestone = dataset.milestones.find((item) => item.id === milestoneId)
    if (!milestone) throw new Error(`Milestone not found: ${milestoneId}`)
    void confirm({
      title: 'Update customs milestone?',
      message: `Change “${milestone.title}” from ${label(milestone.status)} to ${label(status)}?`,
      confirmLabel: 'Update status',
      warningIcon: true,
    }, () => onUpdateMilestone(milestoneId, status))
  }

  function confirmCustomsStepUpdate(
    customsCaseId: string,
    step: CustomsWorkflowStep,
    status: CustomsStepStatus | 'paid' | 'pending',
  ) {
    const customsCase = dataset.customsCases.find((item) => item.id === customsCaseId)
    if (!customsCase) throw new Error(`Customs case not found: ${customsCaseId}`)
    void confirm({
      title: 'Update customs clearance status?',
      message: `Change ${label(step)} for ${customsCase.jobNo} / ${customsCase.containerNo} to ${label(status)}?`,
      confirmLabel: 'Update status',
      warningIcon: true,
      variant: status === 'complete' || status === 'paid' ? 'warning' : 'primary',
      details: 'This records a local demo workflow status only; it does not lodge a customs declaration or confirm external release.',
    }, () => onUpdateCustomsStep(customsCaseId, step, status))
  }

  return (
    <div className="logistics-workspace customs-workspace">
      {/* <div className="logistics-intro">
        <div>
          <span className="section-eyebrow">CUSTOMS + RELEASE WORKFLOW</span>
          <h2>Customs clearance</h2>
          <p>Declarations, duty/SST, SSR, inspection and release are tracked per Job No. and container.</p>
        </div>
        <span className="status-badge status-badge--blue">{dataset.metadata.label}</span>
      </div> */}

      <section className="customs-summary-grid" aria-label="Customs status summary">
        <div className="customs-summary-card"><span>Customs cases</span><strong>{dataset.customsCases.length}</strong><small>Shared job/container records</small></div>
        <div className="customs-summary-card"><span>Pending clearance</span><strong>{pendingCount}</strong><small>One or more required steps open</small></div>
        <div className="customs-summary-card customs-summary-card--warning"><span>Overdue cases</span><strong>{overdueCount}</strong><small>Outstanding steps after Job ETA</small></div>
        <div className="customs-summary-card"><span>Declaration types</span><strong>{CUSTOMS_DECLARATION_TYPES.length}</strong><small>Types represented by the workflow</small></div>
      </section>

      <section className="logistics-filter-card customs-filter-card" aria-label="Customs search and filters">
        <label className="logistics-search"><span>Search customs case</span><input onChange={(event) => setFilter('query', event.target.value)} placeholder="Job No., customer, container, declaration, vessel…" type="search" value={filters.query} /></label>
        <label><span>Declaration type</span><select onChange={(event) => setFilter('declarationType', event.target.value as CustomsFilters['declarationType'])} value={filters.declarationType}><option value="all">All declaration types</option>{CUSTOMS_DECLARATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><span>Case status</span><select onChange={(event) => setFilter('status', event.target.value as CustomsFilters['status'])} value={filters.status}><option value="all">All statuses</option><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="overdue">Overdue</option><option value="complete">Complete</option></select></label>
        <button className="logistics-reset" onClick={() => setFilters(initialFilters)} type="button">Reset filters</button>
      </section>

      <div className="logistics-content-grid customs-content-grid">
        <section className="logistics-record-card" aria-label="Customs case register">
          <div className="logistics-card-heading"><div><span className="section-eyebrow">CUSTOMS REGISTER</span><h3>Clearance cases</h3></div><span>{records.length} cases</span></div>
          {records.length ? <div className="logistics-list">{records.map(({ customsCase, customerName, progress }) => (
            <button aria-pressed={selectedRecord?.customsCase.id === customsCase.id} className={`logistics-record-option${selectedRecord?.customsCase.id === customsCase.id ? ' logistics-record-option--active' : ''}`} key={customsCase.id} onClick={() => setSelectedCaseId(customsCase.id)} type="button">
              <span className="logistics-record-main"><strong>{customsCase.jobNo}</strong><small>{customerName}</small><small>{customsCase.containerNo} · {customsCase.declarationType}</small></span>
              <span className="logistics-record-aside"><b className={`customs-case-state customs-case-state--${progress.state}`}>{label(progress.state)}</b><small>{progress.pendingSteps} open steps</small><small>Updated {formatDate(customsCase.updatedAt)}</small></span>
            </button>
          ))}</div> : <p className="logistics-empty">No customs cases match the search and filters.</p>}
        </section>

        <section className="logistics-detail-card customs-detail-card" aria-label="Selected customs case">
          {selectedRecord ? (
            <CustomsCaseDetail
              dataset={dataset}
              record={selectedRecord}
              onOpenJob={onOpenJob}
              onUpdateMilestone={confirmMilestoneUpdate}
              onUpdateCustomsStep={confirmCustomsStepUpdate}
            />
          ) : <p className="logistics-empty logistics-empty--detail">Select a case to review its declaration and release chain.</p>}
        </section>
      </div>

      <section className="customs-declaration-catalog">
        <div><span className="section-eyebrow">DECLARATION REFERENCE</span><h3>Supported declaration categories</h3><p>Applicability depends on shipment direction, cargo and approved business/customs policy. The catalog does not assert a filing requirement for every job.</p><div className="logistics-animation-inline"><LogisticsAnimation name="documentProcessing" width={70} height={52} /><small>Illustrative transport artwork · no customs filing or status is represented.</small></div></div>
        <div className="customs-type-chips">{CUSTOMS_DECLARATION_TYPES.map((type) => <span key={type}>{type}{type === 'DG' ? ' · Dangerous goods' : type === 'DSO' ? ' · Delivery / shipping order' : type === 'IGM' ? ' · Import general manifest' : ''}</span>)}</div>
      </section>
      <p className="logistics-demo-note"><span className="status-dot status-dot--amber" />Demo / unconfigured · no live customs authority, carrier, payment or EDO integration. Document presence is not customs approval.</p>
    </div>
  )
}

type CustomsRecord = ReturnType<typeof getCustomsRecords>[number]

function CustomsCaseDetail({
  dataset,
  record,
  onOpenJob,
  onUpdateMilestone,
  onUpdateCustomsStep,
}: {
  dataset: DemoDataset
  record: CustomsRecord
  onOpenJob: CustomsWorkspaceProps['onOpenJob']
  onUpdateMilestone: CustomsWorkspaceProps['onUpdateMilestone']
  onUpdateCustomsStep: CustomsWorkspaceProps['onUpdateCustomsStep']
}) {
  const [selectedStage, setSelectedStage] = useState<CustomsWorkflowStep | null>(null)
  const { customsCase, job, shipment, customerName, progress, documents } = record
  const customsEvents = dataset.milestones
    .filter((milestone) =>
      milestone.jobNo === job.jobNo &&
      milestone.department === 'customs' &&
      (!milestone.containerNo || milestone.containerNo === customsCase.containerNo),
    )
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const caseDocuments = documents.filter(
    (document) => !document.containerNo || document.containerNo === customsCase.containerNo,
  )
  const selectedStageDefinition = workflowSteps.find(({ key }) => key === selectedStage)
  const selectedStageValue = selectedStageDefinition ? stepStatus(customsCase, selectedStageDefinition.key) : null
  const selectedStageEvidence = selectedStageDefinition
    ? caseDocuments.find((document) => document.type === (selectedStageDefinition.documentType ?? customsCase.declarationType) && document.status === 'available')
      ?? caseDocuments.find((document) => document.status === 'available')
    : undefined
  const selectedStageBlocker = selectedStageDefinition
    ? getCustomsStepBlocker(customsCase, selectedStageDefinition.key, selectedStageDefinition.key === 'paymentStatus' ? 'paid' : 'complete')
    : null

  useEffect(() => {
    if (!selectedStage) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedStage(null)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedStage])

  return (
    <>
      <div className="logistics-detail-heading">
        <div><span className="section-eyebrow">CUSTOMS CASE · {customsCase.id}</span><h3>{customsCase.jobNo}</h3><span className="logistics-detail-job">{customsCase.containerNo}</span></div>
        <div className="logistics-detail-actions"><span className={`customs-case-state customs-case-state--${progress.state}`}>{label(progress.state)}</span><button className="dashboard-text-link" onClick={() => onOpenJob(job.jobNo)} type="button">Open Job →</button></div>
      </div>
      {progress.overdue && <p className="customs-overdue-banner">Overdue: required clearance steps remain open after the Job ETA ({formatDate(job.eta)}).</p>}
      <div className="logistics-detail-grid">
        <CustomsFact label="Customer / owner" value={`${customerName} · ${job.owner}`} />
        <CustomsFact label="Declaration / reference" value={`${customsCase.declarationType} · ${customsCase.declarationReference ?? 'Reference not recorded'}`} />
        <CustomsFact label="Vessel / voyage" value={shipment ? `${shipment.vessel} · ${shipment.voyage}` : 'Not linked'} />
        <CustomsFact label="Job ETA" value={formatDate(job.eta)} />
        <CustomsFact label="Duty / SST" value={`RM ${customsCase.dutyRM.toLocaleString()} / RM ${customsCase.sstRM.toLocaleString()}`} />
        <CustomsFact label="Customs payment" value={label(customsCase.paymentStatus)} />
        <CustomsFact label="Case last updated" value={formatDate(customsCase.updatedAt)} />
        <CustomsFact label="Delivery lifecycle" value={`${label(customsCase.edoStatus)} EDO · ${label(customsCase.gatePassStatus)} gate pass`} />
      </div>
      <section className="logistics-subsection customs-workflow">
        <div className="logistics-subsection-heading"><div><h4>Clearance chain</h4><small>Stage owner defaults to the Job owner; case date is the only customs timestamp recorded.</small></div><span>{workflowSteps.filter(({ key }) => ['complete', 'paid', 'not_required'].includes(stepStatus(customsCase, key))).length} / {workflowSteps.length} complete</span></div>
        <div className="customs-progress-summary" aria-label="Clearance progress">
          <div className="customs-progress-summary__track"><span style={{ width: `${(workflowSteps.filter(({ key }) => ['complete', 'paid', 'not_required'].includes(stepStatus(customsCase, key))).length / workflowSteps.length) * 100}%` }} /></div>
          <small>{progress.pendingSteps ? `${progress.pendingSteps} stage${progress.pendingSteps === 1 ? '' : 's'} remaining` : 'All required stages complete'}</small>
        </div>
        <ol className="customs-timeline">
          {workflowSteps.map(({ key, label: stepLabel }, index) => {
            const value = stepStatus(customsCase, key)
            const isNotRequired = value === 'not_required'
            const isComplete = value === 'complete' || value === 'paid' || isNotRequired
            const isDelayed = progress.overdue && !isComplete
            return (
              <li className={`customs-timeline__item customs-timeline__item--${isDelayed ? 'delayed' : value}${selectedStage === key ? ' customs-timeline__item--selected' : ''}`} key={key}>
                <button className="customs-timeline__stage" type="button" onClick={() => setSelectedStage(selectedStage === key ? null : key)} aria-expanded={selectedStage === key}>
                  <span className="customs-timeline__marker" aria-hidden="true">{isComplete ? '✓' : value === 'in_progress' ? '•' : isDelayed ? '!' : String(index + 1)}</span>
                  <span className="customs-timeline__stage-copy"><strong>{stepLabel}</strong><small>{isDelayed ? 'Delayed' : label(value)}</small></span>
                </button>
                <div className="customs-timeline__connector" aria-hidden="true" />
              </li>
            )
          })}
        </ol>
        <p className="customs-document-disclaimer">Document upload or presence is record evidence only; it does not set declaration, approval, EDO or gate-pass status. Each status must be updated explicitly.</p>
      </section>
      {selectedStageDefinition && selectedStageValue && (
        <div className="customs-stage-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedStage(null) }}>
          <section className="customs-stage-modal" role="dialog" aria-modal="true" aria-labelledby="customs-stage-modal-title">
            <div className="customs-stage-modal__heading">
              <div><span className="section-eyebrow">CLEARANCE STAGE</span><h3 id="customs-stage-modal-title">{selectedStageDefinition.label}</h3></div>
              <button className="customs-stage-modal__close" type="button" onClick={() => setSelectedStage(null)}>Close</button>
            </div>
            <div className="customs-stage-modal__facts">
              <div><span>Status</span><strong>{label(selectedStageValue)}</strong></div>
              <div><span>Responsible</span><strong>{job.owner}</strong></div>
              <div><span>Recorded date</span><strong>{formatDate(customsCase.updatedAt)}</strong></div>
              <div><span>Document status</span><strong>{selectedStageEvidence ? `${selectedStageEvidence.type} · ${label(selectedStageEvidence.status)}` : 'No supporting document'}</strong></div>
            </div>
            <div className="customs-stage-modal__remarks"><span>Remarks / pending action</span><p>{selectedStageBlocker ?? (selectedStageEvidence ? `Evidence linked: ${selectedStageEvidence.fileName ?? 'filename not recorded'}.` : 'No remarks recorded for this stage.')}</p></div>
            {selectedStageValue !== 'not_required' && <label className="customs-step-control">Update status
              <select aria-label={`Update ${selectedStageDefinition.label}`} onChange={(event) => onUpdateCustomsStep(customsCase.id, selectedStageDefinition.key, event.target.value as CustomsStepStatus | 'paid' | 'pending')} value={selectedStageValue}>
                {stepOptions(selectedStageDefinition.key).map((option) => {
                  const optionBlocker = getCustomsStepBlocker(customsCase, selectedStageDefinition.key, option.value)
                  return <option disabled={Boolean(optionBlocker)} key={option.value} title={optionBlocker ?? undefined} value={option.value}>{option.label}</option>
                })}
              </select>
            </label>}
          </section>
        </div>
      )}

      <section className="logistics-subsection">
        <div className="logistics-subsection-heading"><div><h4>Customs event history</h4><small>Milestones include source and supporting file where linked.</small></div><span>{customsEvents.length}</span></div>
        {customsEvents.length ? <ol className="logistics-milestone-list">{customsEvents.map((event) => {
          const evidence = caseDocuments.find((document) =>
            document.status === 'available' &&
            (document.type === customsCase.declarationType || document.type === 'EDO'),
          )
          return <li className={`logistics-milestone logistics-milestone--${event.status}`} key={event.id}><span className="logistics-milestone-dot" /><div className="logistics-milestone-body"><div className="logistics-milestone-title"><strong>{event.title}</strong><span className={`logistics-status logistics-status--${event.status}`}>{label(event.status)}</span></div><div className="logistics-milestone-meta"><span>Owner: {job.owner}</span><span>Recorded date: {formatDate(event.occurredAt)}</span><span>Source: {label(event.source)}</span></div><div className="logistics-evidence">{evidence ? <>Related document on Job No.: <button className="documents-evidence-link" type="button" onClick={() => onOpenJob(job.jobNo)}><strong>{evidence.type} · {evidence.fileName ?? 'Filename not recorded'}</strong></button></> : 'No related supporting document on file'}</div>{event.status !== 'completed' && <label className="milestone-update-control">Update status<select aria-label={`Update ${event.title} status`} onChange={(change) => onUpdateMilestone(event.id, change.target.value as 'pending' | 'in_progress' | 'completed')} value={event.status}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label>}</div></li>
        })}</ol> : <p className="logistics-empty">No customs milestone events are recorded against this Job No.</p>}
      </section>

      <section className="logistics-subsection customs-documents">
        <div className="logistics-subsection-heading"><div><h4>Related documents</h4><small>Files and evidence records only—not regulatory approvals.</small></div><span>{caseDocuments.length}</span></div>
        {caseDocuments.length ? <ul>{caseDocuments.map((document) => <li key={document.id}><span><button className="documents-evidence-link" type="button" onClick={() => onOpenJob(customsCase.jobNo)}><strong>{document.type}</strong></button><small>{document.fileName ?? 'No file attached'} · {document.uploadedAt ? formatDate(document.uploadedAt) : 'No upload date'}</small></span><b className={`logistics-status logistics-status--${document.status === 'available' ? 'completed' : document.status}`}>{label(document.status)}</b></li>)}</ul> : <p className="logistics-empty">No document records are linked to this customs case.</p>}
      </section>
    </>
  )
}

function CustomsFact({ label: title, value }: { label: string; value: string }) {
  return <div className="logistics-detail-fact"><span>{title}</span><strong>{value}</strong></div>
}
