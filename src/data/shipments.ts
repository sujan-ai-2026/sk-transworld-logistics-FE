import { calculateInvoiceTotals, getFreeDaysRemaining } from './calculations.js'
import { getProfitabilityByShipment } from './finance.js'
import type {
  Container,
  CustomerInvoice,
  CustomsCase,
  CustomsDeclarationType,
  CustomsStepStatus,
  DateOnly,
  DemoDataset,
  Job,
  OperationalMilestone,
  Shipment,
  SupplierCost,
} from './model.js'

export type ShipmentStatusFilter = 'all' | 'booked' | 'in_transit' | 'at_port' | 'in_warehouse' | 'delivered'
export type CustomsStatusFilter = 'all' | 'pending' | 'in_progress' | 'overdue' | 'complete'
export type CustomsWorkflowStep =
  | 'declarationStatus'
  | 'paymentStatus'
  | 'ssrStatus'
  | 'inspectionStatus'
  | 'approvalStatus'
  | 'edoStatus'
  | 'gatePassStatus'

export interface ForwardingFilters {
  query: string
  mode: Shipment['mode'] | 'all'
  movement: Shipment['movement'] | 'all'
  status: ShipmentStatusFilter
  trackingSource: Shipment['trackingSource'] | 'all'
}

export interface CustomsFilters {
  query: string
  declarationType: CustomsDeclarationType | 'all'
  status: CustomsStatusFilter
}

export const CUSTOMS_DECLARATION_TYPES: CustomsDeclarationType[] = [
  'K1', 'K2', 'K3', 'K4', 'K5', 'K8', 'ZB', 'DG', 'DSO', 'IGM',
]

export function getForwardingRecords(
  dataset: DemoDataset,
  filters: ForwardingFilters,
): Array<{
  shipment: Shipment
  job: DemoDataset['jobs'][number]
  customerName: string
  carrierName: string
  containers: DemoDataset['containers']
}> {
  const query = filters.query.trim().toLowerCase()

  return dataset.shipments.flatMap((shipment) => {
    const job = dataset.jobs.find((record) => record.jobNo === shipment.jobNo)
    if (!job) return []
    const customer = dataset.customers.find((record) => record.id === job.customerId)
    const carrier = dataset.suppliers.find((record) => record.id === shipment.carrierId)
    const containers = dataset.containers.filter((container) => container.shipmentId === shipment.id)
    const haystack = [
      shipment.id,
      shipment.jobNo,
      customer?.name,
      carrier?.name,
      shipment.coLoader,
      shipment.vessel,
      shipment.voyage,
      shipment.origin,
      shipment.destination,
      shipment.masterBillNo,
      shipment.houseBillNo,
      ...containers.map((container) => container.containerNo),
    ].filter(Boolean).join(' ').toLowerCase()

    if (query && !haystack.includes(query)) return []
    if (filters.mode !== 'all' && shipment.mode !== filters.mode) return []
    if (filters.movement !== 'all' && shipment.movement !== filters.movement) return []
    if (filters.trackingSource !== 'all' && shipment.trackingSource !== filters.trackingSource) return []
    if (
      filters.status !== 'all' &&
      !containers.some((container) => container.status === filters.status)
    ) return []

    return [{
      shipment,
      job,
      customerName: customer?.name ?? 'Unknown customer',
      carrierName: carrier?.name ?? 'Unknown carrier',
      containers,
    }]
  })
}

export function getContainerFreeTime(
  freeTimeExpiryDate: DateOnly | null,
  asOfDate: DateOnly,
): { remainingDays: number | null; state: 'not_set' | 'expired' | 'due_soon' | 'available' } {
  if (!freeTimeExpiryDate) return { remainingDays: null, state: 'not_set' }
  const remainingDays = getFreeDaysRemaining(freeTimeExpiryDate, asOfDate)
  return {
    remainingDays,
    state: remainingDays < 0 ? 'expired' : remainingDays <= 2 ? 'due_soon' : 'available',
  }
}

export function getCustomsProgress(
  customsCase: CustomsCase,
  eta: DateOnly | null,
  asOfDate: DateOnly,
): { state: Exclude<CustomsStatusFilter, 'all'>; pendingSteps: number; overdue: boolean } {
  const steps = [
    customsCase.declarationStatus,
    customsCase.paymentStatus === 'paid' || customsCase.paymentStatus === 'not_required'
      ? 'complete'
      : 'pending',
    customsCase.ssrStatus,
    customsCase.inspectionStatus,
    customsCase.approvalStatus,
    customsCase.edoStatus,
    customsCase.gatePassStatus,
  ]
  const pendingSteps = steps.filter((status) => status === 'pending' || status === 'in_progress').length
  const overdue = pendingSteps > 0 && eta !== null && eta < asOfDate
  const state = pendingSteps === 0
    ? 'complete'
    : overdue
      ? 'overdue'
      : steps.some((status) => status === 'complete' || status === 'in_progress')
        ? 'in_progress'
        : 'pending'
  return { state, pendingSteps, overdue }
}

export function getCustomsRecords(
  dataset: DemoDataset,
  filters: CustomsFilters,
): Array<{
  customsCase: CustomsCase
  job: DemoDataset['jobs'][number]
  shipment: Shipment | undefined
  customerName: string
  progress: ReturnType<typeof getCustomsProgress>
  documents: DemoDataset['documents']
}> {
  const query = filters.query.trim().toLowerCase()

  return dataset.customsCases.flatMap((customsCase) => {
    const job = dataset.jobs.find((record) => record.jobNo === customsCase.jobNo)
    if (!job) return []
    const shipment = dataset.shipments.find((record) => record.jobNo === customsCase.jobNo)
    const customer = dataset.customers.find((record) => record.id === job.customerId)
    const progress = getCustomsProgress(customsCase, job.eta, dataset.metadata.asOfDate)
    const documents = dataset.documents.filter(
      (document) =>
        document.jobNo === customsCase.jobNo &&
        (!document.containerNo || document.containerNo === customsCase.containerNo),
    )
    const haystack = [
      customsCase.id,
      customsCase.jobNo,
      customsCase.containerNo,
      customsCase.declarationType,
      customsCase.declarationReference,
      customer?.name,
      job.owner,
      shipment?.vessel,
    ].filter(Boolean).join(' ').toLowerCase()

    if (query && !haystack.includes(query)) return []
    if (filters.declarationType !== 'all' && customsCase.declarationType !== filters.declarationType) return []
    if (filters.status !== 'all' && progress.state !== filters.status) return []

    return [{
      customsCase,
      job,
      shipment,
      customerName: customer?.name ?? 'Unknown customer',
      progress,
      documents,
    }]
  })
}

export function getCustomsStepBlocker(
  customsCase: CustomsCase,
  step: CustomsWorkflowStep,
  nextStatus: string,
): string | null {
  const downstreamComplete = step === 'declarationStatus'
    ? customsCase.paymentStatus === 'paid' ||
      customsCase.ssrStatus === 'complete' ||
      customsCase.inspectionStatus === 'complete' ||
      customsCase.approvalStatus === 'complete' ||
      customsCase.edoStatus === 'complete' ||
      customsCase.gatePassStatus === 'complete'
    : step === 'paymentStatus' || step === 'ssrStatus' || step === 'inspectionStatus'
      ? customsCase.approvalStatus === 'complete' ||
        customsCase.edoStatus === 'complete' ||
        customsCase.gatePassStatus === 'complete'
      : step === 'approvalStatus'
        ? customsCase.edoStatus === 'complete' || customsCase.gatePassStatus === 'complete'
        : step === 'edoStatus'
          ? customsCase.gatePassStatus === 'complete'
          : false

  if (
    downstreamComplete &&
    nextStatus !== 'complete' &&
    !(step === 'paymentStatus' && nextStatus === 'paid')
  ) {
    return 'A downstream customs step is already complete. Reconcile dependent steps before changing this status.'
  }
  if (
    step === 'paymentStatus' &&
    nextStatus === 'not_required' &&
    customsCase.dutyRM + customsCase.sstRM > 0
  ) {
    return 'Customs payment cannot be marked not required while duty or SST is assessed.'
  }
  if (nextStatus !== 'complete' && nextStatus !== 'paid') return null
  if (step === 'paymentStatus' && customsCase.declarationStatus !== 'complete') {
    return 'Complete the declaration before recording customs payment.'
  }
  if (
    step === 'approvalStatus' &&
    (
      customsCase.declarationStatus !== 'complete' ||
      (customsCase.paymentStatus !== 'paid' && customsCase.paymentStatus !== 'not_required') ||
      (customsCase.ssrStatus !== 'complete' && customsCase.ssrStatus !== 'not_required') ||
      (customsCase.inspectionStatus !== 'complete' && customsCase.inspectionStatus !== 'not_required')
    )
  ) {
    return 'Declaration, payment, SSR and required inspection must be complete before customs approval.'
  }
  if (step === 'edoStatus' && customsCase.approvalStatus !== 'complete') {
    return 'Record customs approval before releasing the EDO.'
  }
  if (step === 'gatePassStatus' && customsCase.edoStatus !== 'complete') {
    return 'Release the EDO before completing the gate pass.'
  }
  return null
}

export function updateCustomsStep(
  customsCase: CustomsCase,
  step: CustomsWorkflowStep,
  nextStatus: CustomsStepStatus | 'paid' | 'pending',
  updatedAt: DateOnly,
): CustomsCase {
  const blocker = getCustomsStepBlocker(customsCase, step, nextStatus)
  if (blocker) throw new Error(blocker)
  return { ...customsCase, [step]: nextStatus, updatedAt }
}

export function updateShipmentMilestone(
  milestone: OperationalMilestone,
  status: OperationalMilestone['status'],
  updatedAt: DateOnly,
): OperationalMilestone {
  return {
    ...milestone,
    status,
    occurredAt: updatedAt,
    source: 'manual',
  }
}

export type DerivedShipmentStatus = Container['status'] | 'unknown'

export interface ShipmentDetailRecord {
  shipment: Shipment
  job: Job | null
  customerName: string | null
  carrierName: string | null
  containers: Container[]
  milestones: OperationalMilestone[]
  status: DerivedShipmentStatus
  invoices: Array<{ invoice: CustomerInvoice; outstandingRM: number; subtotalRM: number }>
  supplierCosts: SupplierCost[]
  profitability: ReturnType<typeof getProfitabilityByShipment>[number] | null
}

function shipmentSourceIds(dataset: DemoDataset, shipment: Shipment): {
  containerNumbers: Set<string>
  tripIds: Set<string>
  milestoneIds: Set<string>
  customsIds: Set<string>
  receiptIds: Set<string>
} {
  const shipmentContainers = dataset.containers.filter((container) => container.shipmentId === shipment.id)
  const containerNumbers = new Set(shipmentContainers.map((container) => container.containerNo))
  const tripIds = new Set(dataset.trips
    .filter((trip) => trip.jobNo === shipment.jobNo && containerNumbers.has(trip.containerNo))
    .map((trip) => trip.id))
  const milestoneIds = new Set(dataset.milestones
    .filter((milestone) => milestone.jobNo === shipment.jobNo && (!milestone.containerNo || containerNumbers.has(milestone.containerNo)))
    .map((milestone) => milestone.id))
  const customsIds = new Set(dataset.customsCases
    .filter((customsCase) => customsCase.jobNo === shipment.jobNo && containerNumbers.has(customsCase.containerNo))
    .map((customsCase) => customsCase.id))
  const receiptIds = new Set(dataset.warehouseReceipts
    .filter((receipt) => receipt.jobNo === shipment.jobNo && containerNumbers.has(receipt.containerNo))
    .map((receipt) => receipt.id))
  return { containerNumbers, tripIds, milestoneIds, customsIds, receiptIds }
}

function chargeBelongsToShipment(
  chargeSourceEventId: string,
  shipment: Shipment,
  sources: ReturnType<typeof shipmentSourceIds>,
): boolean {
  return chargeSourceEventId === shipment.id ||
    sources.tripIds.has(chargeSourceEventId) ||
    sources.milestoneIds.has(chargeSourceEventId) ||
    sources.customsIds.has(chargeSourceEventId) ||
    [...sources.receiptIds].some((receiptId) =>
      chargeSourceEventId === receiptId || chargeSourceEventId.startsWith(`storage:${receiptId}:`),
    )
}

export function deriveShipmentStatus(containers: Container[]): DerivedShipmentStatus {
  if (!containers.length) return 'unknown'
  if (containers.every((container) => container.status === 'delivered')) return 'delivered'
  if (containers.some((container) => container.status === 'in_warehouse')) return 'in_warehouse'
  if (containers.some((container) => container.status === 'at_port')) return 'at_port'
  if (containers.some((container) => container.status === 'in_transit')) return 'in_transit'
  return 'booked'
}

export function getShipmentById(dataset: DemoDataset, shipmentId: string): Shipment | undefined {
  return dataset.shipments.find((shipment) => shipment.id === shipmentId)
}

export function getShipmentDetail(dataset: DemoDataset, shipmentId: string): ShipmentDetailRecord | null {
  const shipment = getShipmentById(dataset, shipmentId)
  if (!shipment) return null
  const job = dataset.jobs.find((record) => record.jobNo === shipment.jobNo) ?? null
  const shipmentsOnJob = dataset.shipments.filter((record) => record.jobNo === shipment.jobNo)
  const customer = job ? dataset.customers.find((record) => record.id === job.customerId) : undefined
  const carrier = dataset.suppliers.find((record) => record.id === shipment.carrierId)
  const containers = dataset.containers.filter((container) => container.shipmentId === shipment.id)
  const sources = shipmentSourceIds(dataset, shipment)
  const milestones = dataset.milestones
    .filter((milestone) =>
      milestone.jobNo === shipment.jobNo &&
      (!milestone.containerNo || sources.containerNumbers.has(milestone.containerNo)),
    )
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const invoices = dataset.invoices.flatMap((invoice) => {
    if (invoice.jobNo !== shipment.jobNo) return []
    const attributed = invoice.chargeIds.some((chargeId) => {
      const charge = dataset.charges.find((record) => record.id === chargeId)
      return charge ? chargeBelongsToShipment(charge.sourceEventId, shipment, sources) : false
    })
    if (!attributed && shipmentsOnJob.length !== 1) return []
    const totals = calculateInvoiceTotals(dataset, invoice.id)
    return [{ invoice, outstandingRM: totals.outstandingRM, subtotalRM: totals.subtotalRM }]
  })
  const supplierCosts = dataset.supplierCosts.filter((cost) =>
    cost.jobNo === shipment.jobNo &&
      (cost.tripId ? sources.tripIds.has(cost.tripId) : shipmentsOnJob.length === 1),
  )
  const profitability = getProfitabilityByShipment(dataset).find((row) => row.id === shipment.id) ?? null
  return {
    shipment,
    job,
    customerName: customer?.name ?? null,
    carrierName: carrier?.name ?? null,
    containers,
    milestones,
    status: deriveShipmentStatus(containers),
    invoices,
    supplierCosts,
    profitability,
  }
}
