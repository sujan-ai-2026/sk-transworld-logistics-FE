import type {
  DemoDataset,
  Department,
  Job,
  JobFinancialStatus,
  JobOperationalStatus,
} from './model.js'

export interface JobFilters {
  search: string
  customerId: string
  department: Department | ''
  operationalStatus: JobOperationalStatus | ''
  financialStatus: JobFinancialStatus | ''
  fromDate: string
  toDate: string
  sortBy: 'jobNo' | 'customer' | 'service' | 'eta' | 'owner' | 'operationalStatus' | 'financialStatus'
  sortDirection: 'asc' | 'desc'
}

export interface JobCreateInput {
  customerId: string
  quotationId: string
  description: string
  serviceDepartments: Department[]
  owner: string
  createdDate: string
  eta: string
}

export interface JobCloseReadiness {
  canClose: boolean
  unbilledCharges: DemoDataset['charges']
  missingDocuments: DemoDataset['documents']
  unpaidInvoices: DemoDataset['invoices']
  blockers: string[]
}

export interface AcceptedQuotationJob {
  job: Job
  quotation: DemoDataset['quotations'][number]
}

const DEPARTMENTS: Department[] = ['forwarding', 'customs', 'haulage', 'warehouse']

function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

export function getDefaultJobFilters(): JobFilters {
  return {
    search: '',
    customerId: '',
    department: '',
    operationalStatus: '',
    financialStatus: '',
    fromDate: '',
    toDate: '',
    sortBy: 'jobNo',
    sortDirection: 'desc',
  }
}

export function getJobListRecords(
  dataset: DemoDataset,
  filters: JobFilters,
): Array<{
  job: Job
  customerName: string
  shipmentTypes: string[]
  containerNumbers: string[]
  eta: string | null
  etd: string | null
  hasMissingDocuments: boolean
}> {
  const customers = new Map(dataset.customers.map((customer) => [customer.id, customer]))
  const query = filters.search.trim().toLowerCase()

  const rows = dataset.jobs.flatMap((job) => {
    const customer = customers.get(job.customerId)
    const jobShipments = dataset.shipments.filter((shipment) => shipment.jobNo === job.jobNo)
    const containers = dataset.containers.filter((container) => container.jobNo === job.jobNo)
    const searchable = [
      job.jobNo,
      job.description,
      job.owner,
      job.operationalStatus,
      job.financialStatus,
      customer?.name,
      customer?.code,
      ...jobShipments.flatMap((shipment) => [
        shipment.mode,
        shipment.movement,
        shipment.vessel,
        shipment.voyage,
        shipment.masterBillNo,
        shipment.houseBillNo,
      ]),
      ...containers.map((container) => container.containerNo),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replaceAll('_', ' ')
    const normalizedQuery = query.replaceAll('_', ' ')

    if (normalizedQuery && !searchable.includes(normalizedQuery)) return []
    if (filters.customerId && job.customerId !== filters.customerId) return []
    if (
      filters.department &&
      !job.serviceDepartments.includes(filters.department)
    ) return []
    if (filters.operationalStatus && job.operationalStatus !== filters.operationalStatus) return []
    if (filters.financialStatus && job.financialStatus !== filters.financialStatus) return []
    if (filters.fromDate && job.createdDate < filters.fromDate) return []
    if (filters.toDate && job.createdDate > filters.toDate) return []

    const etaDates = jobShipments.map((shipment) => shipment.eta).filter((date): date is string => date !== null)
    const etdDates = jobShipments.map((shipment) => shipment.etd).filter((date): date is string => date !== null)
    const hasMissingDocuments = dataset.documents.some(
      (document) => document.jobNo === job.jobNo && document.status === 'missing',
    )
    const shipmentTypes = [...new Set(jobShipments.map((shipment) => `${shipment.mode} ${shipment.movement}`))]
    const row = {
      job,
      customerName: customer?.name ?? 'Unknown customer',
      shipmentTypes,
      containerNumbers: containers.map((container) => container.containerNo),
      eta: etaDates.sort()[0] ?? job.eta,
      etd: etdDates.sort()[0] ?? null,
      hasMissingDocuments,
    }
    return [row]
  })

  const direction = filters.sortDirection === 'asc' ? 1 : -1
  return rows.sort((a, b) => {
    let valueA: string
    let valueB: string
    switch (filters.sortBy) {
      case 'customer':
        valueA = a.customerName
        valueB = b.customerName
        break
      case 'service':
        valueA = a.job.serviceDepartments.join(',')
        valueB = b.job.serviceDepartments.join(',')
        break
      case 'eta':
        valueA = a.eta ?? ''
        valueB = b.eta ?? ''
        break
      case 'owner':
        valueA = a.job.owner
        valueB = b.job.owner
        break
      case 'operationalStatus':
        valueA = a.job.operationalStatus
        valueB = b.job.operationalStatus
        break
      case 'financialStatus':
        valueA = a.job.financialStatus
        valueB = b.job.financialStatus
        break
      default:
        valueA = a.job.jobNo
        valueB = b.job.jobNo
    }
    return valueA.localeCompare(valueB) * direction
  })
}

export function validateJobCreateInput(
  dataset: DemoDataset,
  input: JobCreateInput,
): string[] {
  const errors: string[] = []
  if (!dataset.customers.some((customer) => customer.id === input.customerId)) {
    errors.push('Select a valid customer.')
  }
  if (!input.description.trim()) errors.push('Enter a job description.')
  if (!input.owner.trim()) errors.push('Enter a job owner.')
  if (!isValidDate(input.createdDate)) {
    errors.push('Enter a valid job date.')
  }
  if (input.eta && !isValidDate(input.eta)) {
    errors.push('Enter a valid ETA.')
  }
  if (input.eta && input.createdDate && input.eta < input.createdDate) {
    errors.push('ETA cannot be before the job date.')
  }
  if (input.serviceDepartments.length === 0) {
    errors.push('Select at least one service department.')
  }
  if (input.serviceDepartments.some((department) => !DEPARTMENTS.includes(department))) {
    errors.push('Select valid service departments.')
  }

  if (input.quotationId) {
    const quotation = dataset.quotations.find((record) => record.id === input.quotationId)
    if (!quotation) {
      errors.push('Select a valid quotation.')
    } else {
      if (quotation.customerId !== input.customerId) {
        errors.push('The selected quotation belongs to a different customer.')
      }
      if (quotation.linkedJobNo) {
        errors.push('This quotation is already linked to a job.')
      }
      if (quotation.status === 'expired' || quotation.validUntil < input.createdDate) {
        errors.push('The selected quotation has expired.')
      }
      if (
        input.serviceDepartments.some(
          (department) => !quotation.lines.some((line) => line.department === department),
        )
      ) {
        errors.push('Job services must be included in the selected quotation.')
      }
    }
  }
  return errors
}

export function generateIllustrativeJobNumber(
  dataset: DemoDataset,
  createdDate: string,
): string {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(createdDate)
  if (!match || !isValidDate(createdDate)) {
    throw new RangeError('A valid YYYY-MM-DD job date is required')
  }
  const prefix = `SKI${createdDate.slice(2, 4)}${createdDate.slice(5, 7)}`
  const nextSequence = dataset.jobs.reduce((highest, job) => {
    const sequence = new RegExp(`^${prefix}(\\d+)$`).exec(job.jobNo)
    return sequence ? Math.max(highest, Number(sequence[1])) : highest
  }, 0) + 1
  return `${prefix}${String(nextSequence).padStart(3, '0')}`
}

export function createJobFromInput(
  dataset: DemoDataset,
  input: JobCreateInput,
): Job {
  const errors = validateJobCreateInput(dataset, input)
  if (errors.length > 0) throw new Error(errors.join(' '))

  const quotation = input.quotationId
    ? dataset.quotations.find((record) => record.id === input.quotationId)
    : undefined
  return {
    jobNo: generateIllustrativeJobNumber(dataset, input.createdDate),
    customerId: input.customerId,
    ...(quotation ? { quotationId: quotation.id } : {}),
    description: input.description.trim(),
    serviceDepartments: [...input.serviceDepartments],
    owner: input.owner.trim(),
    createdDate: input.createdDate,
    eta: input.eta || null,
    operationalStatus: 'awaiting_customs',
    financialStatus: 'unbilled',
  }
}

export function acceptQuotationAndCreateJob(
  dataset: DemoDataset,
  input: JobCreateInput,
): AcceptedQuotationJob {
  if (!input.quotationId) throw new Error('Select a quotation to accept.')
  const job = createJobFromInput(dataset, input)
  const quotation = dataset.quotations.find((record) => record.id === input.quotationId)
  if (!quotation) throw new Error(`Quotation not found: ${input.quotationId}`)
  return {
    job,
    quotation: { ...quotation, status: 'accepted', linkedJobNo: job.jobNo },
  }
}

export function getJobCloseReadiness(
  dataset: DemoDataset,
  jobNo: string,
  approvedException?: { reason: string; approvedBy: string },
): JobCloseReadiness {
  const job = dataset.jobs.find((record) => record.jobNo === jobNo)
  if (!job) throw new Error(`Job not found: ${jobNo}`)

  const unbilledCharges = dataset.charges.filter(
    (charge) =>
      charge.jobNo === jobNo &&
      charge.performed &&
      charge.status !== 'invoiced' &&
      charge.status !== 'waived',
  )
  const missingDocuments = dataset.documents.filter(
    (document) => document.jobNo === jobNo && document.status === 'missing',
  )
  const unpaidInvoices = dataset.invoices.filter(
    (invoice) =>
      invoice.jobNo === jobNo &&
      invoice.status !== 'paid' &&
      invoice.status !== 'draft',
  )
  const blockers: string[] = []
  if (job.operationalStatus !== 'delivered') blockers.push('Operational work is not marked delivered.')
  if (unbilledCharges.length > 0) blockers.push(`${unbilledCharges.length} performed charge(s) are not invoiced or waived.`)
  if (missingDocuments.length > 0) blockers.push(`${missingDocuments.length} required document record(s) are missing.`)
  if (unpaidInvoices.length > 0) blockers.push(`${unpaidInvoices.length} customer invoice(s) remain unpaid.`)

  const exceptionIsApproved = Boolean(
    approvedException?.reason.trim() && approvedException.approvedBy.trim(),
  )
  const commercialBlockers = blockers.some((blocker) => blocker !== 'Operational work is not marked delivered.')

  return {
    canClose: job.operationalStatus === 'delivered' && (!commercialBlockers || exceptionIsApproved),
    unbilledCharges,
    missingDocuments,
    unpaidInvoices,
    blockers,
  }
}
