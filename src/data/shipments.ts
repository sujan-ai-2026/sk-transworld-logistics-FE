import { getFreeDaysRemaining } from './calculations.js'
import type {
  CustomsCase,
  CustomsDeclarationType,
  CustomsStepStatus,
  DateOnly,
  DemoDataset,
  OperationalMilestone,
  Shipment,
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
