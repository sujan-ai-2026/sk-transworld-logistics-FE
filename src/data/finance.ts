import type {
  BankTransaction,
  ChargeSuggestion,
  CustomerInvoice,
  DemoDataset,
  Department,
  PaymentRequest,
  PaymentVoucher,
  SupplierCost,
} from './model.js'
import { calculateInvoiceTotals, calculateJobProfitability } from './calculations.js'

export interface OperationalChargeCandidate {
  jobNo: string
  department: Department
  description: string
  sourceEventId: string
  quantity: number
  unit: string
  amountRM: number
}

export interface FinanceAggregate {
  id: string
  label: string
  revenueRM: number
  actualCostRM: number
  estimatedCostRM: number
  grossProfitRM: number
  marginPercent: number | null
}

function roundRM(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function rateForDepartment(
  dataset: DemoDataset,
  jobNo: string,
  department: Department,
): { rateRM: number; unit: string } | undefined {
  const job = dataset.jobs.find((record) => record.jobNo === jobNo)
  if (!job) throw new Error(`Job not found: ${jobNo}`)
  const quotation = dataset.quotations.find((record) => record.id === job.quotationId)
  const line = quotation?.lines.find((record) => record.department === department)
  return line ? { rateRM: line.rateRM, unit: line.unit } : undefined
}

export function getOperationalChargeCandidates(dataset: DemoDataset): OperationalChargeCandidate[] {
  const candidates: OperationalChargeCandidate[] = []
  const existingSources = new Set(dataset.charges.map((charge) => charge.sourceEventId))

  function addCandidate(
    jobNo: string,
    department: Department,
    sourceEventId: string,
    description: string,
  ) {
    if (existingSources.has(sourceEventId)) return
    const rate = rateForDepartment(dataset, jobNo, department)
    if (!rate) return
    candidates.push({
      jobNo,
      department,
      description,
      sourceEventId,
      quantity: 1,
      unit: rate.unit,
      amountRM: rate.rateRM,
    })
    existingSources.add(sourceEventId)
  }

  for (const milestone of dataset.milestones) {
    if (milestone.status !== 'completed') continue
    addCandidate(milestone.jobNo, milestone.department, milestone.id, milestone.title)
  }
  for (const trip of dataset.trips) {
    if (!['delivered', 'in_transit'].includes(trip.status)) continue
    addCandidate(trip.jobNo, 'haulage', trip.id, `Haulage service · ${trip.route}`)
  }
  for (const customsCase of dataset.customsCases) {
    if (customsCase.declarationStatus === 'pending') continue
    addCandidate(customsCase.jobNo, 'customs', customsCase.id, `${customsCase.declarationType} customs service`)
  }
  for (const activity of dataset.warehouseActivities) {
    if (activity.status !== 'completed' || activity.type !== 'handling') continue
    addCandidate(activity.jobNo, 'warehouse', activity.id, 'Warehouse handling service')
  }

  return candidates
}

export function createDraftChargeSuggestion(
  candidate: OperationalChargeCandidate,
  existingCharges: ChargeSuggestion[],
  asOfDate: string,
): ChargeSuggestion {
  if (existingCharges.some((charge) => charge.sourceEventId === candidate.sourceEventId && !['cancelled', 'reversed', 'waived'].includes(charge.status))) {
    throw new Error(`A charge suggestion already exists for source event ${candidate.sourceEventId}`)
  }
  if (!Number.isFinite(candidate.amountRM) || candidate.amountRM < 0 || !Number.isFinite(candidate.quantity) || candidate.quantity <= 0) {
    throw new RangeError('Charge candidate must have a positive quantity and non-negative amount.')
  }
  const sourceKey = candidate.sourceEventId.replaceAll(/[^a-zA-Z0-9-]/g, '-')
  return {
    id: `CHG-FIN-${asOfDate.replaceAll('-', '')}-${sourceKey}`,
    jobNo: candidate.jobNo,
    department: candidate.department,
    description: candidate.description,
    sourceEventId: candidate.sourceEventId,
    quantity: candidate.quantity,
    unit: candidate.unit,
    amountRM: roundRM(candidate.amountRM),
    performed: true,
    status: 'draft',
    illustrativeRate: true,
  }
}

export function createInvoiceFromApprovedCharges(
  dataset: DemoDataset,
  jobNo: string,
): CustomerInvoice {
  const job = dataset.jobs.find((record) => record.jobNo === jobNo)
  if (!job) throw new Error(`Job not found: ${jobNo}`)
  const chargeIds = dataset.charges
    .filter((charge) => charge.jobNo === jobNo && charge.status === 'approved' && charge.performed)
    .map((charge) => charge.id)
  if (!chargeIds.length) throw new Error('No approved performed charges are ready to invoice for this Job No.')

  const sequence = dataset.invoices.length + 1
  const invoiceDate = dataset.metadata.asOfDate
  const due = new Date(`${invoiceDate}T00:00:00.000Z`)
  due.setUTCDate(due.getUTCDate() + 14)
  const dueDate = due.toISOString().slice(0, 10)
  return {
    id: `INV-DEMO-${String(sequence).padStart(3, '0')}`,
    jobNo,
    customerId: job.customerId,
    invoiceDate,
    dueDate,
    chargeIds,
    amountPaidRM: 0,
    status: 'draft',
    eInvoiceStatus: 'not_ready',
    eInvoiceReference: null,
    emailStatus: 'not_sent',
  }
}

export function getProfitabilityByJob(dataset: DemoDataset): FinanceAggregate[] {
  return dataset.jobs.map((job) => {
    const profit = calculateJobProfitability(dataset, job.jobNo)
    const marginPercent = profit.revenueRM > 0
      ? roundRM((profit.actualMarginRM / profit.revenueRM) * 100)
      : null
    return {
      id: job.jobNo,
      label: job.jobNo,
      revenueRM: profit.revenueRM,
      actualCostRM: profit.actualCostsRM,
      estimatedCostRM: profit.estimatedCostsRM,
      grossProfitRM: profit.actualMarginRM,
      marginPercent,
    }
  })
}

export function getProfitabilityByCustomer(dataset: DemoDataset): FinanceAggregate[] {
  return dataset.customers.map((customer) => {
    const jobs = dataset.jobs.filter((job) => job.customerId === customer.id)
    const totals = jobs.reduce((aggregate, job) => {
      const profit = calculateJobProfitability(dataset, job.jobNo)
      return {
        revenueRM: aggregate.revenueRM + profit.revenueRM,
        actualCostRM: aggregate.actualCostRM + profit.actualCostsRM,
        estimatedCostRM: aggregate.estimatedCostRM + profit.estimatedCostsRM,
      }
    }, { revenueRM: 0, actualCostRM: 0, estimatedCostRM: 0 })
    const grossProfitRM = roundRM(totals.revenueRM - totals.actualCostRM)
    return {
      id: customer.id,
      label: customer.name,
      revenueRM: roundRM(totals.revenueRM),
      actualCostRM: roundRM(totals.actualCostRM),
      estimatedCostRM: roundRM(totals.estimatedCostRM),
      grossProfitRM,
      marginPercent: totals.revenueRM > 0 ? roundRM((grossProfitRM / totals.revenueRM) * 100) : null,
    }
  })
}

export function getProfitabilityByDepartment(dataset: DemoDataset): FinanceAggregate[] {
  const departments: Department[] = ['forwarding', 'customs', 'haulage', 'warehouse']
  return departments.map((department) => {
    const charges = dataset.charges.filter(
      (charge) => charge.department === department && charge.performed && !['waived', 'cancelled', 'reversed'].includes(charge.status),
    )
    const costs = dataset.supplierCosts.filter((cost) => cost.department === department)
    const revenueRM = roundRM(charges.reduce((total, charge) => total + charge.amountRM, 0))
    const actualCostRM = roundRM(costs.filter((cost) => cost.costType === 'actual').reduce((total, cost) => total + cost.amountRM, 0))
    const estimatedCostRM = roundRM(costs.filter((cost) => cost.costType === 'estimated').reduce((total, cost) => total + cost.amountRM, 0))
    const grossProfitRM = roundRM(revenueRM - actualCostRM)
    return {
      id: department,
      label: department,
      revenueRM,
      actualCostRM,
      estimatedCostRM,
      grossProfitRM,
      marginPercent: revenueRM > 0 ? roundRM((grossProfitRM / revenueRM) * 100) : null,
    }
  })
}

export function getProfitabilityByShipment(dataset: DemoDataset): FinanceAggregate[] {
  return dataset.shipments.map((shipment) => {
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
    const charges = dataset.charges.filter(
      (charge) => charge.jobNo === shipment.jobNo &&
        charge.performed &&
        !['waived', 'cancelled', 'reversed'].includes(charge.status) &&
        (charge.sourceEventId === shipment.id ||
          tripIds.has(charge.sourceEventId) ||
          milestoneIds.has(charge.sourceEventId) ||
          customsIds.has(charge.sourceEventId) ||
          [...receiptIds].some((receiptId) => charge.sourceEventId === receiptId || charge.sourceEventId.startsWith(`storage:${receiptId}:`))),
    )
    const relatedCosts = dataset.supplierCosts.filter(
      (cost) => cost.jobNo === shipment.jobNo && (!cost.tripId || tripIds.has(cost.tripId)),
    )
    const revenueRM = roundRM(charges.reduce((total, charge) => total + charge.amountRM, 0))
    const actualCostRM = roundRM(relatedCosts.filter((cost) => cost.costType === 'actual').reduce((total, cost) => total + cost.amountRM, 0))
    const estimatedCostRM = roundRM(relatedCosts.filter((cost) => cost.costType === 'estimated').reduce((total, cost) => total + cost.amountRM, 0))
    const grossProfitRM = roundRM(revenueRM - actualCostRM)
    return {
      id: shipment.id,
      label: `${shipment.id} · ${shipment.jobNo}`,
      revenueRM,
      actualCostRM,
      estimatedCostRM,
      grossProfitRM,
      marginPercent: revenueRM > 0 ? roundRM((grossProfitRM / revenueRM) * 100) : null,
    }
  })
}

export function getReceivablesRM(dataset: DemoDataset): number {
  return roundRM(dataset.invoices
    .filter((invoice) => invoice.status !== 'cancelled')
    .reduce((total, invoice) => total + calculateInvoiceTotals(dataset, invoice.id).outstandingRM, 0))
}

export function getPayablesRM(dataset: DemoDataset): number {
  return roundRM(dataset.supplierCosts
    .filter((cost) => cost.costType === 'actual' && cost.paymentStatus === 'unpaid')
    .reduce((total, cost) => total + cost.amountRM, 0))
}

export function matchBankTransaction(
  transaction: BankTransaction,
  recordId: string,
  dataset: DemoDataset,
): BankTransaction {
  if (transaction.reconciliationStatus === 'reconciled') {
    throw new Error(`Bank transaction ${transaction.id} is already reconciled.`)
  }
  const exists = dataset.invoices.some((invoice) => invoice.id === recordId && invoice.status !== 'cancelled') ||
    dataset.paymentVouchers.some((voucher) => voucher.id === recordId && voucher.status !== 'cancelled')
  if (!exists) throw new Error(`Finance record not found for bank match: ${recordId}`)
  return { ...transaction, matchedRecordId: recordId, reconciliationStatus: 'matched' }
}

export function reconcileBankTransaction(transaction: BankTransaction): BankTransaction {
  if (transaction.reconciliationStatus !== 'matched' || !transaction.matchedRecordId) {
    throw new Error('Match a bank transaction to a finance record before reconciliation.')
  }
  return { ...transaction, reconciliationStatus: 'reconciled' }
}

export function hasLinkedInvoice(dataset: DemoDataset, invoice: CustomerInvoice): boolean {
  return invoice.chargeIds.every((chargeId) => dataset.charges.some((charge) => charge.id === chargeId && charge.invoiceId === invoice.id))
}

export type FinanceRecordUpdates = {
  charges: ChargeSuggestion[]
  supplierCosts: SupplierCost[]
  paymentRequests: PaymentRequest[]
  paymentVouchers: PaymentVoucher[]
}
