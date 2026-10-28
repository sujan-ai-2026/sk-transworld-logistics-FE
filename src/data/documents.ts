import type { DemoDataset, DocumentRecord } from './model.js'

export interface DocumentFilters {
  query: string
  jobNo: string
  type: DocumentRecord['type'] | 'all'
  status: 'all' | DocumentRecord['status']
  access: 'all' | DocumentRecord['access']
  portalOnly: boolean
}

export interface RequiredDocumentCheck {
  type: DocumentRecord['type']
  document: DocumentRecord | undefined
  status: 'available' | 'missing'
}

export function getDocumentRecords(dataset: DemoDataset, filters: DocumentFilters): DocumentRecord[] {
  const query = filters.query.trim().toLowerCase()
  return dataset.documents.filter((document) => {
    if (filters.portalOnly && (document.access !== 'customer_approved' || document.status !== 'available')) return false
    if (filters.jobNo && filters.jobNo !== document.jobNo) return false
    if (filters.type !== 'all' && filters.type !== document.type) return false
    if (filters.status !== 'all' && filters.status !== document.status) return false
    if (filters.access !== 'all' && filters.access !== document.access) return false
    const job = dataset.jobs.find((record) => record.jobNo === document.jobNo)
    const customer = job && dataset.customers.find((record) => record.id === job.customerId)
    const searchable = [
      document.id,
      document.fileName,
      document.type,
      document.status,
      document.access,
      document.uploadedBy,
      document.jobNo,
      customer?.name,
      document.containerNo,
      document.tripId,
      document.invoiceId,
    ].filter(Boolean).join(' ').toLowerCase()
    return !query || searchable.includes(query)
  })
}

export function createDocumentVersion(
  dataset: DemoDataset,
  input: {
    jobNo: string
    type: DocumentRecord['type']
    fileName: string
    containerNo?: string
    tripId?: string
    invoiceId?: string
  },
): DocumentRecord {
  const job = dataset.jobs.find((record) => record.jobNo === input.jobNo)
  if (!job) throw new Error(`Job not found: ${input.jobNo}`)
  if (!input.fileName.trim()) throw new Error('Document filename is required.')
  if (input.containerNo && !dataset.containers.some((container) => container.jobNo === input.jobNo && container.containerNo === input.containerNo)) {
    throw new Error('Document container must belong to the selected Job No.')
  }
  if (input.tripId && !dataset.trips.some((trip) => trip.jobNo === input.jobNo && trip.id === input.tripId)) {
    throw new Error('Document trip must belong to the selected Job No.')
  }
  if (input.invoiceId && !dataset.invoices.some((invoice) => invoice.jobNo === input.jobNo && invoice.id === input.invoiceId)) {
    throw new Error('Document invoice must belong to the selected Job No.')
  }

  const existing = dataset.documents.find(
    (document) =>
      document.jobNo === input.jobNo &&
      document.type === input.type &&
      document.containerNo === input.containerNo &&
      document.status !== 'missing',
  ) ?? dataset.documents.find(
    (document) =>
      document.jobNo === input.jobNo &&
      document.type === input.type &&
      document.containerNo === input.containerNo &&
      document.status === 'missing',
  )
  const history = existing?.history ?? []
  const nextVersion = existing ? existing.version + 1 : 1
  const versionHistory = existing?.fileName && existing.uploadedAt && existing.uploadedBy
    ? [...history, {
        version: existing.version,
        fileName: existing.fileName,
        uploadedBy: existing.uploadedBy,
        uploadedAt: existing.uploadedAt,
      }]
    : history

  return {
    id: existing?.id ?? `DOC-${input.jobNo.slice(-3)}-${String(dataset.documents.length + 1).padStart(2, '0')}`,
    jobNo: input.jobNo,
    ...(input.containerNo ? { containerNo: input.containerNo } : {}),
    ...(input.tripId ? { tripId: input.tripId } : {}),
    ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
    type: input.type,
    fileName: input.fileName.trim(),
    status: 'available',
    access: 'internal',
    version: nextVersion,
    uploadedBy: 'Demo workspace user',
    uploadedAt: dataset.metadata.asOfDate,
    history: versionHistory,
  }
}

export function getRequiredDocumentChecklist(
  dataset: DemoDataset,
  jobNo: string,
): RequiredDocumentCheck[] {
  const job = dataset.jobs.find((record) => record.jobNo === jobNo)
  if (!job) throw new Error(`Job not found: ${jobNo}`)

  const expectedTypes = new Set<DocumentRecord['type']>()
  const shipments = dataset.shipments.filter((shipment) => shipment.jobNo === jobNo)
  const customsCases = dataset.customsCases.filter((customsCase) => customsCase.jobNo === jobNo)
  const trips = dataset.trips.filter((trip) => trip.jobNo === jobNo)

  if (job.serviceDepartments.includes('forwarding')) {
    expectedTypes.add('commercial_invoice')
    expectedTypes.add('packing_list')
    if (shipments.some((shipment) => shipment.houseBillNo)) expectedTypes.add('HBL')
    if (shipments.some((shipment) => shipment.masterBillNo)) expectedTypes.add('MBL')
  }

  if (job.serviceDepartments.includes('customs')) {
    customsCases.forEach((customsCase) => expectedTypes.add(customsCase.declarationType))
    if (customsCases.some((customsCase) => customsCase.edoStatus !== 'not_required')) {
      expectedTypes.add('EDO')
    }
  }

  if (job.serviceDepartments.includes('haulage') && trips.length > 0) {
    expectedTypes.add('delivery_order')
    expectedTypes.add('gate_pass')
    expectedTypes.add('POD')
  }

  if (job.serviceDepartments.includes('warehouse') && dataset.warehouseReceipts.some((receipt) => receipt.jobNo === jobNo)) {
    expectedTypes.add('packing_list')
  }

  return [...expectedTypes].map((type) => {
    const document = dataset.documents.find(
      (record) => record.jobNo === jobNo && record.type === type && record.status === 'available',
    )
    return { type, document, status: document ? 'available' : 'missing' }
  })
}
