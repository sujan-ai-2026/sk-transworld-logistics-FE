import { useMemo, useState } from 'react'
import type { DemoDataset, DocumentRecord } from '../data/model.js'
import { createDocumentVersion, getDocumentRecords, getRequiredDocumentChecklist } from '../data/documents.js'

const documentTypes: DocumentRecord['type'][] = [
  'commercial_invoice',
  'packing_list',
  'BL',
  'HBL',
  'MBL',
  'K1',
  'K2',
  'K3',
  'K4',
  'K5',
  'K8',
  'ZB',
  'DG',
  'DSO',
  'IGM',
  'customs_supporting_document',
  'EDO',
  'LOI',
  'delivery_order',
  'gate_pass',
  'POD',
  'photo',
  'correspondence',
]

type DocumentFilter = 'all' | 'available' | 'pending_review' | 'missing'
type AccessFilter = 'all' | DocumentRecord['access']

interface DocumentsWorkspaceProps {
  dataset: DemoDataset
  initialJobNo?: string | null
  portalOnly?: boolean
  onOpenJob: (jobNo: string) => void
  onSaveDocument: (document: DocumentRecord, activityDescription: string) => void
  onClassifyDocument: (documentId: string, access: DocumentRecord['access']) => void
}

function documentLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function dateLabel(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`))
}

function recordLinks(
  dataset: DemoDataset,
  document: DocumentRecord,
): string[] {
  const links = [`Job ${document.jobNo}`]
  if (document.containerNo) links.push(`Container ${document.containerNo}`)
  if (document.tripId) links.push(`Trip ${document.tripId}`)
  if (document.invoiceId) links.push(`Invoice ${document.invoiceId}`)
  const job = dataset.jobs.find((record) => record.jobNo === document.jobNo)
  if (!job) throw new Error(`Document ${document.id} references unknown Job No. ${document.jobNo}`)
  return links
}

export function DocumentsWorkspace({
  dataset,
  initialJobNo,
  portalOnly = false,
  onOpenJob,
  onSaveDocument,
  onClassifyDocument,
}: DocumentsWorkspaceProps) {
  const [jobNo, setJobNo] = useState(initialJobNo ?? '')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentRecord['type'] | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DocumentFilter>('all')
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all')
  const [uploadType, setUploadType] = useState<DocumentRecord['type']>('commercial_invoice')
  const [fileName, setFileName] = useState('')
  const [uploadJobNo, setUploadJobNo] = useState(initialJobNo ?? dataset.jobs[0]?.jobNo ?? '')
  const [uploadContainerNo, setUploadContainerNo] = useState('')
  const [uploadTripId, setUploadTripId] = useState('')
  const [uploadInvoiceId, setUploadInvoiceId] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null)
  const [message, setMessage] = useState('')

  const visibleDocuments = useMemo(() => getDocumentRecords(dataset, {
    query,
    jobNo: portalOnly ? '' : jobNo,
    type: typeFilter,
    status: statusFilter,
    access: accessFilter,
    portalOnly,
  }), [accessFilter, dataset, jobNo, portalOnly, query, statusFilter, typeFilter])

  const selectedJob = jobNo ? dataset.jobs.find((job) => job.jobNo === jobNo) : undefined
  const checklist = selectedJob ? getRequiredDocumentChecklist(dataset, selectedJob.jobNo) : []
  const uploadJob = dataset.jobs.find((job) => job.jobNo === uploadJobNo)
  const uploadContainers = dataset.containers.filter((container) => container.jobNo === uploadJobNo)
  const uploadTrips = dataset.trips.filter((trip) => trip.jobNo === uploadJobNo)
  const uploadInvoices = dataset.invoices.filter((invoice) => invoice.jobNo === uploadJobNo)

  function uploadMockDocument() {
    if (!uploadJob) {
      setMessage('Select a valid Job No. before adding a document.')
      return
    }
    if (!fileName.trim()) {
      setMessage('Enter a filename for the local demo upload.')
      return
    }
    const nextDocument = createDocumentVersion(dataset, {
      jobNo: uploadJobNo,
      type: uploadType,
      fileName,
      ...(uploadContainerNo ? { containerNo: uploadContainerNo } : {}),
      ...(uploadTripId ? { tripId: uploadTripId } : {}),
      ...(uploadInvoiceId ? { invoiceId: uploadInvoiceId } : {}),
    })
    onSaveDocument(
      nextDocument,
      `${nextDocument.version > 1 ? 'Document version uploaded' : 'Document uploaded'}: ${documentLabel(uploadType)} ${nextDocument.fileName} (v${nextDocument.version}); internal classification`,
    )
    setJobNo(uploadJobNo)
    setFileName('')
    setMessage('Local demo record added. No file was sent to or stored on a server.')
  }

  function downloadDemoRecord(document: DocumentRecord) {
    const contents = [
      'SK Transworld Logistics — local demo document record',
      `Job No.: ${document.jobNo}`,
      `Document: ${documentLabel(document.type)}`,
      `Filename: ${document.fileName ?? 'Not available'}`,
      `Version: ${document.version}`,
      'This text file is a metadata placeholder; original document bytes are not stored in this prototype.',
    ].join('\n')
    const link = window.document.createElement('a')
    link.href = URL.createObjectURL(new Blob([contents], { type: 'text/plain' }))
    link.download = `${document.id}-demo.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function toggleSelectedDocumentSharing() {
    if (!selectedDocument) return
    const access = selectedDocument.access === 'customer_approved' ? 'internal' : 'customer_approved'
    onClassifyDocument(selectedDocument.id, access)
    setSelectedDocument({ ...selectedDocument, access })
  }

  return (
    <div className="logistics-workspace documents-workspace">
      {/* <div className="logistics-intro">
        <div>
          <span className="section-eyebrow">{portalOnly ? 'CUSTOMER-SHAREABLE RECORDS' : 'JOB FOLDER + AUDIT TRAIL'}</span>
          <h2>{portalOnly ? 'Customer portal documents' : 'Digital documents'}</h2>
          <p>
            {portalOnly
              ? 'Portal preview lists only available documents explicitly classified as customer-approved.'
              : 'One searchable folder per Job No. Uploads and document actions are local demo records; no files persist to a server.'}
          </p>
        </div>
        <span className="status-badge status-badge--blue">{dataset.metadata.label}</span>
      </div> */}

      {!portalOnly && (
        <>
          <div className="documents-notice" role="note">
            Demo-only file metadata. No backend storage is configured. Uploading a document records its presence only and does not mean customs approval, release or EDO issuance.
          </div>
          <section className="documents-upload-card" aria-labelledby="document-upload-title">
            <div className="documents-section-heading">
              <div><span className="section-eyebrow">LOCAL DEMO ACTION</span><h3 id="document-upload-title">Add a document version</h3></div>
              <span className="documents-classification-note">New uploads default to Internal</span>
            </div>
            <div className="documents-upload-grid">
              <label><span>Job No.</span><select value={uploadJobNo} onChange={(event) => { setUploadJobNo(event.target.value); setUploadContainerNo(''); setUploadTripId(''); setUploadInvoiceId('') }}>{dataset.jobs.map((job) => <option key={job.jobNo} value={job.jobNo}>{job.jobNo}</option>)}</select></label>
              <label><span>Document type</span><select value={uploadType} onChange={(event) => setUploadType(event.target.value as DocumentRecord['type'])}>{documentTypes.map((type) => <option key={type} value={type}>{documentLabel(type)}</option>)}</select></label>
              <label><span>Filename (demo)</span><input value={fileName} onChange={(event) => setFileName(event.target.value)} placeholder="e.g. packing-list.pdf" /></label>
              <label><span>Container (optional)</span><select value={uploadContainerNo} onChange={(event) => setUploadContainerNo(event.target.value)}><option value="">Not linked</option>{uploadContainers.map((container) => <option key={container.id} value={container.containerNo}>{container.containerNo}</option>)}</select></label>
              <label><span>Trip (optional)</span><select value={uploadTripId} onChange={(event) => setUploadTripId(event.target.value)}><option value="">Not linked</option>{uploadTrips.map((trip) => <option key={trip.id} value={trip.id}>{trip.id}</option>)}</select></label>
              <label><span>Invoice (optional)</span><select value={uploadInvoiceId} onChange={(event) => setUploadInvoiceId(event.target.value)}><option value="">Not linked</option>{uploadInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.id}</option>)}</select></label>
            </div>
            <div className="documents-upload-actions"><button className="button button--primary" type="button" onClick={uploadMockDocument}>Add local demo document</button>{message && <span role="status">{message}</span>}</div>
          </section>
        </>
      )}

      {!portalOnly && (
        <section className="documents-checklist-card" aria-labelledby="document-checklist-title">
          <div className="documents-section-heading">
            <div><span className="section-eyebrow">SERVICE-BASED CHECKLIST</span><h3 id="document-checklist-title">Expected and missing documents</h3></div>
            <label className="documents-job-select"><span>Job folder</span><select value={jobNo} onChange={(event) => setJobNo(event.target.value)}><option value="">All job folders</option>{dataset.jobs.map((job) => <option key={job.jobNo} value={job.jobNo}>{job.jobNo}</option>)}</select></label>
          </div>
          {selectedJob ? (
            <div className="documents-checklist">
              {checklist.length ? checklist.map((item) => (
                <div className={`documents-check-item documents-check-item--${item.status}`} key={item.type}>
                  <span>{item.status === 'available' ? '✓' : '!'}</span><strong>{documentLabel(item.type)}</strong><small>{item.status === 'available' ? `Available · v${item.document?.version}` : 'Missing / not available'}</small>
                  {item.document && <button type="button" onClick={() => setSelectedDocument(item.document ?? null)}>Open record</button>}
                </div>
              )) : <p className="documents-empty">No expected-document rules are configured for this job’s linked service records.</p>}
            </div>
          ) : <p className="documents-empty">Select a Job No. to see its service-based document checklist.</p>}
          <p className="documents-checklist-note">Availability is a document-folder check only; it is not evidence of customs approval or release.</p>
        </section>
      )}

      <section className="documents-register-card" aria-labelledby="document-register-title">
        <div className="documents-section-heading">
          <div><span className="section-eyebrow">{portalOnly ? 'APPROVED FOR SHARING' : 'SEARCHABLE JOB FOLDERS'}</span><h3 id="document-register-title">{portalOnly ? 'Customer-visible documents' : 'Document register'}</h3></div>
          <span className="documents-result-count">{visibleDocuments.length} records</span>
        </div>
        <div className="documents-filter-grid">
          <label><span>Search documents</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job No., filename, container, trip, invoice, uploader…" /></label>
          <label><span>Document type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}><option value="all">All types</option>{documentTypes.map((type) => <option key={type} value={type}>{documentLabel(type)}</option>)}</select></label>
          {!portalOnly && <label><span>Document status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DocumentFilter)}><option value="all">All statuses</option><option value="available">Available</option><option value="pending_review">Pending review</option><option value="missing">Missing</option></select></label>}
          {!portalOnly && <label><span>Access</span><select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as AccessFilter)}><option value="all">All classifications</option><option value="internal">Internal</option><option value="customer_approved">Customer-approved</option></select></label>}
        </div>
        {visibleDocuments.length ? (
          <div className="documents-table-wrap">
            <table className="documents-table">
              <thead><tr><th>Document / version</th><th>Job and linked records</th><th>Uploader / timestamp</th><th>Access / status</th><th>Actions</th></tr></thead>
              <tbody>{visibleDocuments.map((document) => {
                const links = recordLinks(dataset, document)
                return (
                  <tr key={document.id}>
                    <td><strong>{documentLabel(document.type)}</strong><span>{document.fileName ?? 'No file recorded'} · v{document.version}</span></td>
                    <td><div className="documents-record-links">{links.map((link) => <button key={link} type="button" onClick={() => onOpenJob(document.jobNo)}>{link}</button>)}</div></td>
                    <td>{document.uploadedBy ?? 'Not recorded'}<span>{dateLabel(document.uploadedAt)}</span></td>
                    <td><span className={`documents-status documents-status--${document.access}`}>{document.access === 'customer_approved' ? 'Customer-approved' : 'Internal'}</span><span className={`documents-status documents-status--${document.status}`}>{documentLabel(document.status)}</span></td>
                    <td><div className="documents-row-actions">
                      <button type="button" onClick={() => setSelectedDocument(document)}>Preview</button>
                      {document.status === 'available' && <button type="button" onClick={() => downloadDemoRecord(document)}>Download demo record</button>}
                      {!portalOnly && document.status === 'available' && <button type="button" onClick={() => onClassifyDocument(document.id, document.access === 'customer_approved' ? 'internal' : 'customer_approved')}>{document.access === 'customer_approved' ? 'Revoke sharing' : 'Approve for portal'}</button>}
                    </div></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        ) : <div className="documents-empty documents-empty--large"><strong>{query ? 'No documents match this search.' : portalOnly ? 'No customer-approved documents are available.' : 'No documents match these filters.'}</strong><span>Try another Job No., document type, status or search term.</span></div>}
      </section>

      {selectedDocument && (
        <div className="documents-modal-backdrop" role="presentation" onClick={() => setSelectedDocument(null)}>
          <section className="documents-preview-modal" role="dialog" aria-modal="true" aria-labelledby="document-preview-title" onClick={(event) => event.stopPropagation()}>
            <div className="documents-section-heading"><div><span className="section-eyebrow">DEMO DOCUMENT PREVIEW</span><h3 id="document-preview-title">{documentLabel(selectedDocument.type)}</h3></div><button className="button button--secondary" type="button" onClick={() => setSelectedDocument(null)}>Close</button></div>
            <p className="documents-notice">File contents are not stored or previewed in this frontend. This panel shows linked demo metadata only.</p>
            <dl className="documents-preview-details">
              <div><dt>Job No.</dt><dd><button type="button" onClick={() => onOpenJob(selectedDocument.jobNo)}>{selectedDocument.jobNo}</button></dd></div>
              <div><dt>Filename</dt><dd>{selectedDocument.fileName ?? 'Not recorded'}</dd></div>
              <div><dt>Current version</dt><dd>v{selectedDocument.version} · {selectedDocument.uploadedBy ?? 'No uploader'} · {dateLabel(selectedDocument.uploadedAt)}</dd></div>
              <div><dt>Access classification</dt><dd>{documentLabel(selectedDocument.access)}</dd></div>
              <div><dt>Version history</dt><dd>{selectedDocument.history?.length ? selectedDocument.history.map((version) => `v${version.version} · ${version.fileName} · ${version.uploadedBy} · ${dateLabel(version.uploadedAt)}`).join(' | ') : 'No previous versions recorded.'}</dd></div>
            </dl>
            {!portalOnly && selectedDocument.status === 'available' && <button className="button button--secondary" type="button" onClick={toggleSelectedDocumentSharing}>{selectedDocument.access === 'customer_approved' ? 'Revoke customer sharing' : 'Approve for customer portal'}</button>}
          </section>
        </div>
      )}
    </div>
  )
}
