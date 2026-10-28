import type {
  Department,
  DemoDataset,
  DateOnly,
  StorageRateRule,
} from './model.js'

export interface InvoiceTotals {
  subtotalRM: number
  paidRM: number
  outstandingRM: number
}

export interface JobProfitability {
  revenueRM: number
  actualCostsRM: number
  estimatedCostsRM: number
  actualMarginRM: number
  projectedMarginRM: number
}

export interface DepartmentRevenue {
  department: Department
  revenueRM: number
}

export interface StorageChargeInput {
  quantity: number
  rateRM: number
  chargeablePeriods: number
}

export interface AlertCounts {
  open: number
  acknowledged: number
  resolved: number
  critical: number
  high: number
  medium: number
  low: number
  dueOrOverdue: number
}

export interface DashboardSummary {
  totalJobs: number
  activeJobs: number
  deliveredJobs: number
  totalContainers: number
  containersAtPort: number
  openAlerts: number
  overdueInvoices: number
  receivablesOutstandingRM: number
  billedRevenueRM: number
}

export interface DataIntegrityResult {
  valid: boolean
  errors: string[]
}

export interface DashboardFilters {
  fromDate: DateOnly
  toDate: DateOnly
  customerId: string
}

export interface DashboardShipmentRow {
  jobNo: string
  customerId: string
  customerName: string
  containerNo: string
  milestone: string
  eta: DateOnly | null
  etd: DateOnly | null
  owner: string
  operationalStatus: string
  financialStatus: string
  shipmentId: string
}

export interface DashboardMetrics {
  deliveriesToday: number
  containersArriving: number
  customsPending: number
  edoPending: number
  warehouseDeliveries: number
  trucksRequired: number
  revenueTodayRM: number
  revenueMonthToDateRM: number
  customerOutstandingRM: number
  supplierPayableRM: number
  jobProfitabilityRM: number
  departmentRevenue: DepartmentRevenue[]
  shipmentRows: DashboardShipmentRow[]
  alerts: DemoDataset['alerts']
  activity: DemoDataset['activity']
}

const DAY_MS = 24 * 60 * 60 * 1000

function assertNonNegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number`)
  }
}

function parseDate(date: DateOnly, label: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new RangeError(`${label} must be a valid YYYY-MM-DD date`)
  }

  const timestamp = Date.parse(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`${label} must be a valid YYYY-MM-DD date`)
  }

  return timestamp
}

function roundRM(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function dateInRange(date: DateOnly | null, filters: DashboardFilters): boolean {
  return date !== null && date >= filters.fromDate && date <= filters.toDate
}

function invoiceRevenueInRange(
  dataset: DemoDataset,
  invoiceDate: DateOnly,
  filters: DashboardFilters,
): number {
  if (!dateInRange(invoiceDate, filters)) return 0
  return dataset.invoices
    .filter((invoice) => invoice.invoiceDate === invoiceDate)
    .filter((invoice) => !filters.customerId || invoice.customerId === filters.customerId)
    .reduce((total, invoice) => total + calculateInvoiceTotals(dataset, invoice.id).subtotalRM, 0)
}

export function getDefaultDashboardFilters(dataset: DemoDataset): DashboardFilters {
  const dates = [
    dataset.metadata.asOfDate,
    ...dataset.jobs.map((record) => record.createdDate),
    ...dataset.shipments.flatMap((record) => [record.etd, record.eta]),
    ...dataset.containers.map((record) => record.eta),
    ...dataset.trips.flatMap((record) => [record.scheduledDate, record.deliveryDate]),
    ...dataset.warehouseActivities.map((record) => record.scheduledDate),
    ...dataset.invoices.flatMap((record) => [record.invoiceDate, record.dueDate]),
    ...dataset.alerts.flatMap((record) => [record.createdAt, record.dueDate]),
    ...dataset.activity.map((record) => record.occurredAt),
  ].filter((date): date is DateOnly => date !== null)
  const sortedDates = [...dates].sort()

  return {
    fromDate: sortedDates[0] ?? dataset.metadata.asOfDate,
    toDate: sortedDates.at(-1) ?? dataset.metadata.asOfDate,
    customerId: '',
  }
}

export function calculateDashboardMetrics(
  dataset: DemoDataset,
  filters: DashboardFilters = getDefaultDashboardFilters(dataset),
): DashboardMetrics {
  parseDate(filters.fromDate, 'From date')
  parseDate(filters.toDate, 'To date')
  if (filters.fromDate > filters.toDate) {
    throw new RangeError('From date must be on or before To date')
  }
  if (filters.customerId && !dataset.customers.some((customer) => customer.id === filters.customerId)) {
    throw new Error(`Customer not found: ${filters.customerId}`)
  }

  const asOfDate = dataset.metadata.asOfDate
  const monthStart = `${asOfDate.slice(0, 7)}-01`
  const selectedJobNumbers = new Set(
    dataset.jobs
      .filter((job) => (!filters.customerId || job.customerId === filters.customerId))
      .filter((job) => dateInRange(job.createdDate, filters))
      .map((job) => job.jobNo),
  )
  const shipments = new Map(dataset.shipments.map((shipment) => [shipment.id, shipment]))
  const customers = new Map(dataset.customers.map((customer) => [customer.id, customer]))
  const jobs = new Map(dataset.jobs.map((job) => [job.jobNo, job]))
  const customerMatchesJob = (jobNo: string): boolean => {
    const job = jobs.get(jobNo)
    return Boolean(job && (!filters.customerId || job.customerId === filters.customerId))
  }
  const milestonesByContainer = new Map<string, DemoDataset['milestones'][number]>()
  for (const milestone of dataset.milestones) {
    if (!milestone.containerNo) continue
    const current = milestonesByContainer.get(milestone.containerNo)
    if (!current || milestone.occurredAt > current.occurredAt) {
      milestonesByContainer.set(milestone.containerNo, milestone)
    }
  }
  const rows = dataset.containers
    .filter((container) => {
      const shipment = shipments.get(container.shipmentId)
      return (
        customerMatchesJob(container.jobNo) &&
        (dateInRange(shipment?.eta ?? container.eta, filters) ||
          dateInRange(shipment?.etd ?? null, filters))
      )
    })
    .map((container): DashboardShipmentRow => {
      const shipment = shipments.get(container.shipmentId)
      const job = jobs.get(container.jobNo)
      const customer = job ? customers.get(job.customerId) : undefined
      const milestone =
        milestonesByContainer.get(container.containerNo) ??
        dataset.milestones
          .filter((record) => record.jobNo === container.jobNo)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
      return {
        jobNo: container.jobNo,
        customerId: job?.customerId ?? '',
        customerName: customer?.name ?? 'Unknown customer',
        containerNo: container.containerNo,
        milestone: milestone?.title ?? 'No milestone recorded',
        eta: shipment?.eta ?? container.eta,
        etd: shipment?.etd ?? null,
        owner: job?.owner ?? 'Unassigned',
        operationalStatus: job?.operationalStatus ?? 'unknown',
        financialStatus: job?.financialStatus ?? 'unknown',
        shipmentId: shipment?.id ?? container.shipmentId,
      }
    })

  const selectedTrips = dataset.trips.filter(
    (trip) => customerMatchesJob(trip.jobNo) && dateInRange(trip.scheduledDate, filters),
  )
  const todayRevenueRM = invoiceRevenueInRange(dataset, asOfDate, {
    ...filters,
    fromDate: asOfDate,
    toDate: asOfDate,
  })
  const revenueMonthToDateRM = dataset.invoices
    .filter((invoice) => invoice.invoiceDate >= monthStart && invoice.invoiceDate <= asOfDate)
    .filter((invoice) => !filters.customerId || invoice.customerId === filters.customerId)
    .filter((invoice) => dateInRange(invoice.invoiceDate, filters))
    .reduce((total, invoice) => total + calculateInvoiceTotals(dataset, invoice.id).subtotalRM, 0)

  const departmentTotals = new Map<Department, number>()
  for (const charge of dataset.charges) {
    if (!charge.invoiceId || !customerMatchesJob(charge.jobNo)) continue
    const invoice = dataset.invoices.find((record) => record.id === charge.invoiceId)
    if (!invoice || !dateInRange(invoice.invoiceDate, filters)) continue
    departmentTotals.set(
      charge.department,
      (departmentTotals.get(charge.department) ?? 0) + charge.amountRM,
    )
  }

  const customerOutstandingRM = dataset.invoices
    .filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'paid')
    .filter((invoice) => !filters.customerId || invoice.customerId === filters.customerId)
    .reduce((total, invoice) => total + calculateInvoiceTotals(dataset, invoice.id).outstandingRM, 0)
  const supplierPayableRM = dataset.supplierCosts
    .filter((cost) => cost.costType === 'actual' && cost.approvalStatus === 'approved' && cost.paymentStatus === 'unpaid')
    .filter((cost) => customerMatchesJob(cost.jobNo))
    .reduce((total, cost) => total + cost.amountRM, 0)
  const jobProfitabilityRM = [...selectedJobNumbers].reduce(
    (total, jobNo) => total + calculateJobProfitability(dataset, jobNo).actualMarginRM,
    0,
  )

  return {
    deliveriesToday: dataset.trips.filter(
      (trip) =>
        customerMatchesJob(trip.jobNo) &&
        trip.status === 'delivered' &&
        trip.deliveryDate === asOfDate,
    ).length,
    containersArriving: dataset.containers.filter((container) => {
      const shipment = shipments.get(container.shipmentId)
      return (
        customerMatchesJob(container.jobNo) &&
        dateInRange(shipment?.eta ?? container.eta, filters) &&
        (shipment?.eta ?? container.eta ?? '') >= asOfDate &&
        container.status !== 'delivered' &&
        container.status !== 'in_warehouse'
      )
    }).length,
    customsPending: dataset.customsCases.filter(
      (record) =>
        customerMatchesJob(record.jobNo) &&
        dateInRange(record.updatedAt, filters) &&
        (record.declarationStatus === 'pending' ||
          record.declarationStatus === 'in_progress' ||
          record.approvalStatus === 'pending' ||
          record.approvalStatus === 'in_progress'),
    ).length,
    edoPending: dataset.customsCases.filter(
      (record) =>
        customerMatchesJob(record.jobNo) &&
        dateInRange(record.updatedAt, filters) &&
        (record.edoStatus === 'pending' || record.edoStatus === 'in_progress'),
    ).length,
    warehouseDeliveries: dataset.warehouseActivities.filter(
      (activity) =>
        customerMatchesJob(activity.jobNo) &&
        activity.type === 'delivery' &&
        activity.status !== 'completed' &&
        dateInRange(activity.scheduledDate, filters),
    ).length,
    trucksRequired: new Set(
      selectedTrips
        .filter((trip) => trip.status === 'planned' || trip.status === 'in_transit')
        .map((trip) => trip.truckId),
    ).size,
    revenueTodayRM: roundRM(todayRevenueRM),
    revenueMonthToDateRM: roundRM(revenueMonthToDateRM),
    customerOutstandingRM: roundRM(customerOutstandingRM),
    supplierPayableRM: roundRM(supplierPayableRM),
    jobProfitabilityRM: roundRM(jobProfitabilityRM),
    departmentRevenue: (['forwarding', 'customs', 'haulage', 'warehouse'] as Department[]).map(
      (department) => ({
        department,
        revenueRM: roundRM(departmentTotals.get(department) ?? 0),
      }),
    ),
    shipmentRows: rows,
    alerts: dataset.alerts.filter(
      (alert) =>
        dateInRange(alert.createdAt, filters) &&
        (!filters.customerId ||
          (alert.jobNo !== undefined && customerMatchesJob(alert.jobNo))),
    ),
    activity: dataset.activity
      .filter(
        (event) =>
          dateInRange(event.occurredAt, filters) && customerMatchesJob(event.jobNo),
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  }
}

export function calculateInvoiceTotals(
  dataset: DemoDataset,
  invoiceId: string,
): InvoiceTotals {
  const invoice = dataset.invoices.find((record) => record.id === invoiceId)
  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`)
  }

  const chargesById = new Map(dataset.charges.map((charge) => [charge.id, charge]))
  const subtotalRM = invoice.chargeIds.reduce((total, chargeId) => {
    const charge = chargesById.get(chargeId)
    if (!charge) {
      throw new Error(`Charge ${chargeId} referenced by invoice ${invoiceId} was not found`)
    }
    return total + charge.amountRM
  }, 0)
  const paidRM = Math.min(invoice.amountPaidRM, subtotalRM)

  return {
    subtotalRM: roundRM(subtotalRM),
    paidRM: roundRM(paidRM),
    outstandingRM: roundRM(Math.max(0, subtotalRM - paidRM)),
  }
}

export function calculateJobProfitability(
  dataset: DemoDataset,
  jobNo: string,
): JobProfitability {
  if (!dataset.jobs.some((job) => job.jobNo === jobNo)) {
    throw new Error(`Job not found: ${jobNo}`)
  }

  const revenueRM = dataset.charges
    .filter((charge) => charge.jobNo === jobNo && charge.performed && !['waived', 'cancelled', 'reversed'].includes(charge.status))
    .reduce((total, charge) => total + charge.amountRM, 0)
  const costs = dataset.supplierCosts.filter((cost) => cost.jobNo === jobNo)
  const actualCostsRM = costs
    .filter((cost) => cost.costType === 'actual')
    .reduce((total, cost) => total + cost.amountRM, 0)
  const estimatedCostsRM = costs
    .filter((cost) => cost.costType === 'estimated')
    .reduce((total, cost) => total + cost.amountRM, 0)

  return {
    revenueRM: roundRM(revenueRM),
    actualCostsRM: roundRM(actualCostsRM),
    estimatedCostsRM: roundRM(estimatedCostsRM),
    actualMarginRM: roundRM(revenueRM - actualCostsRM),
    projectedMarginRM: roundRM(revenueRM - actualCostsRM - estimatedCostsRM),
  }
}

export function calculateDepartmentRevenue(dataset: DemoDataset): DepartmentRevenue[] {
  const revenue = new Map<Department, number>()

  for (const charge of dataset.charges) {
    if (!charge.performed || ['waived', 'cancelled', 'reversed'].includes(charge.status)) continue
    revenue.set(charge.department, (revenue.get(charge.department) ?? 0) + charge.amountRM)
  }

  return [...revenue.entries()]
    .sort(([departmentA], [departmentB]) => departmentA.localeCompare(departmentB))
    .map(([department, revenueRM]) => ({ department, revenueRM: roundRM(revenueRM) }))
}

export function calculateStorageCharge(input: StorageChargeInput): number {
  assertNonNegativeFinite(input.quantity, 'Quantity')
  assertNonNegativeFinite(input.rateRM, 'Rate')
  assertNonNegativeFinite(input.chargeablePeriods, 'Chargeable periods')
  return roundRM(input.quantity * input.rateRM * input.chargeablePeriods)
}

export function calculateStorageChargeFromRate(
  rate: StorageRateRule,
  quantity: number,
  chargeablePeriods: number,
): number {
  return calculateStorageCharge({
    quantity,
    rateRM: rate.rateRM,
    chargeablePeriods,
  })
}

export function getFreeDaysRemaining(expiryDate: DateOnly, asOfDate: DateOnly): number {
  const expiry = parseDate(expiryDate, 'Expiry date')
  const asOf = parseDate(asOfDate, 'As-of date')
  return Math.round((expiry - asOf) / DAY_MS)
}

export function calculateAlertCounts(
  dataset: DemoDataset,
  asOfDate: DateOnly = dataset.metadata.asOfDate,
): AlertCounts {
  parseDate(asOfDate, 'As-of date')
  const counts: AlertCounts = {
    open: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    dueOrOverdue: 0,
  }

  for (const alert of dataset.alerts) {
    counts[alert.status] += 1
    counts[alert.severity] += 1
    if (
      alert.status !== 'resolved' &&
      alert.dueDate !== null &&
      alert.dueDate <= asOfDate
    ) {
      counts.dueOrOverdue += 1
    }
  }

  return counts
}

export function calculateDashboardSummary(dataset: DemoDataset): DashboardSummary {
  const overdueInvoices = dataset.invoices.filter((invoice) => invoice.status === 'overdue')
  const receivablesOutstandingRM = overdueInvoices.reduce(
    (total, invoice) => total + calculateInvoiceTotals(dataset, invoice.id).outstandingRM,
    0,
  )
  const billedRevenueRM = dataset.charges
    .filter((charge) => charge.status === 'invoiced')
    .reduce((total, charge) => total + charge.amountRM, 0)

  return {
    totalJobs: dataset.jobs.length,
    activeJobs: dataset.jobs.filter((job) => job.operationalStatus !== 'delivered').length,
    deliveredJobs: dataset.jobs.filter((job) => job.operationalStatus === 'delivered').length,
    totalContainers: dataset.containers.length,
    containersAtPort: dataset.containers.filter((container) => container.status === 'at_port').length,
    openAlerts: dataset.alerts.filter((alert) => alert.status === 'open').length,
    overdueInvoices: overdueInvoices.length,
    receivablesOutstandingRM: roundRM(receivablesOutstandingRM),
    billedRevenueRM: roundRM(billedRevenueRM),
  }
}

export function validateDemoData(dataset: DemoDataset): DataIntegrityResult {
  const errors: string[] = []
  const indexById = <T extends { id: string }>(
    records: T[],
    collection: string,
  ): Map<string, T> => {
    const index = new Map<string, T>()
    for (const record of records) {
      if (index.has(record.id)) errors.push(`${collection} has duplicate id ${record.id}`)
      index.set(record.id, record)
    }
    return index
  }
  const requireReference = (
    exists: boolean,
    description: string,
  ): void => {
    if (!exists) errors.push(description)
  }
  const customers = indexById(dataset.customers, 'customers')
  const suppliers = indexById(dataset.suppliers, 'suppliers')
  const quotations = indexById(dataset.quotations, 'quotations')
  const jobs = new Map<string, (typeof dataset.jobs)[number]>()
  for (const job of dataset.jobs) {
    if (jobs.has(job.jobNo)) errors.push(`jobs has duplicate job number ${job.jobNo}`)
    jobs.set(job.jobNo, job)
    requireReference(customers.has(job.customerId), `Job ${job.jobNo} references missing customer ${job.customerId}`)
    if (job.quotationId) {
      requireReference(quotations.has(job.quotationId), `Job ${job.jobNo} references missing quotation ${job.quotationId}`)
    }
  }

  const shipments = indexById(dataset.shipments, 'shipments')
  indexById(dataset.openingBalances, 'openingBalances')
  indexById(dataset.containers, 'containers')
  const containersByNumber = new Map(dataset.containers.map((container) => [container.containerNo, container]))
  const trips = indexById(dataset.trips, 'trips')
  const receipts = indexById(dataset.warehouseReceipts, 'warehouseReceipts')
  const invoices = indexById(dataset.invoices, 'invoices')
  const charges = indexById(dataset.charges, 'charges')
  const supplierCosts = indexById(dataset.supplierCosts, 'supplierCosts')
  const trucks = indexById(dataset.trucks, 'trucks')
  const trailers = indexById(dataset.trailers, 'trailers')
  const drivers = indexById(dataset.drivers, 'drivers')
  indexById(dataset.milestones, 'milestones')
  indexById(dataset.customsCases, 'customsCases')
  indexById(dataset.tripMilestones, 'tripMilestones')
  indexById(dataset.stockMovements, 'stockMovements')
  indexById(dataset.warehouseActivities, 'warehouseActivities')
  indexById(dataset.documents, 'documents')
  indexById(dataset.storageRates, 'storageRates')
  indexById(dataset.paymentRequests, 'paymentRequests')
  indexById(dataset.paymentVouchers, 'paymentVouchers')
  indexById(dataset.bankTransactions, 'bankTransactions')
  indexById(dataset.alerts, 'alerts')
  indexById(dataset.activity, 'activity')

  for (const quotation of dataset.quotations) {
    requireReference(customers.has(quotation.customerId), `Quotation ${quotation.id} references missing customer ${quotation.customerId}`)
    if (quotation.linkedJobNo) {
      requireReference(jobs.has(quotation.linkedJobNo), `Quotation ${quotation.id} references missing job ${quotation.linkedJobNo}`)
      const job = jobs.get(quotation.linkedJobNo)
      if (job && job.quotationId !== quotation.id) {
        errors.push(`Quotation ${quotation.id} and job ${job.jobNo} do not link to each other`)
      }
    }
  }
  for (const job of dataset.jobs) {
    if (job.quotationId) {
      const quotation = quotations.get(job.quotationId)
      if (quotation?.linkedJobNo && quotation.linkedJobNo !== job.jobNo) {
        errors.push(`Job ${job.jobNo} and quotation ${quotation.id} have different linked job numbers`)
      }
    }
  }
  for (const shipment of dataset.shipments) {
    requireReference(jobs.has(shipment.jobNo), `Shipment ${shipment.id} references missing job ${shipment.jobNo}`)
    requireReference(suppliers.has(shipment.carrierId), `Shipment ${shipment.id} references missing carrier ${shipment.carrierId}`)
  }
  for (const container of dataset.containers) {
    requireReference(shipments.has(container.shipmentId), `Container ${container.id} references missing shipment ${container.shipmentId}`)
    requireReference(jobs.has(container.jobNo), `Container ${container.id} references missing job ${container.jobNo}`)
    const shipment = shipments.get(container.shipmentId)
    if (shipment && shipment.jobNo !== container.jobNo) {
      errors.push(`Container ${container.id} job number does not match shipment ${shipment.id}`)
    }
  }
  for (const collection of [
    dataset.milestones,
    dataset.customsCases,
    dataset.trips,
    dataset.warehouseReceipts,
    dataset.stockMovements,
    dataset.warehouseActivities,
    dataset.documents,
    dataset.charges,
    dataset.supplierCosts,
    dataset.paymentRequests,
    dataset.activity,
  ]) {
    for (const record of collection) {
      requireReference(jobs.has(record.jobNo), `Record ${record.id} references missing job ${record.jobNo}`)
    }
  }
  for (const customsCase of dataset.customsCases) {
    requireReference(containersByNumber.has(customsCase.containerNo), `Customs case ${customsCase.id} references missing container ${customsCase.containerNo}`)
  }
  for (const trip of dataset.trips) {
    requireReference(containersByNumber.has(trip.containerNo), `Trip ${trip.id} references missing container ${trip.containerNo}`)
    requireReference(trucks.has(trip.truckId), `Trip ${trip.id} references missing truck ${trip.truckId}`)
    requireReference(trailers.has(trip.trailerId), `Trip ${trip.id} references missing trailer ${trip.trailerId}`)
    requireReference(drivers.has(trip.driverId), `Trip ${trip.id} references missing driver ${trip.driverId}`)
    const container = containersByNumber.get(trip.containerNo)
    if (container && container.jobNo !== trip.jobNo) {
      errors.push(`Trip ${trip.id} job number does not match container ${container.id}`)
    }
  }
  for (const milestone of dataset.tripMilestones) {
    requireReference(trips.has(milestone.tripId), `Trip milestone ${milestone.id} references missing trip ${milestone.tripId}`)
  }
  for (const receipt of dataset.warehouseReceipts) {
    requireReference(containersByNumber.has(receipt.containerNo), `Warehouse receipt ${receipt.id} references missing container ${receipt.containerNo}`)
    const container = containersByNumber.get(receipt.containerNo)
    if (container && container.jobNo !== receipt.jobNo) {
      errors.push(`Warehouse receipt ${receipt.id} job number does not match container ${container.id}`)
    }
  }
  for (const movement of dataset.stockMovements) {
    requireReference(receipts.has(movement.receiptId), `Stock movement ${movement.id} references missing receipt ${movement.receiptId}`)
    const receipt = receipts.get(movement.receiptId)
    if (receipt && receipt.jobNo !== movement.jobNo) {
      errors.push(`Stock movement ${movement.id} job number does not match receipt ${receipt.id}`)
    }
  }
  for (const activity of dataset.warehouseActivities) {
    requireReference(receipts.has(activity.receiptId), `Warehouse activity ${activity.id} references missing receipt ${activity.receiptId}`)
    const receipt = receipts.get(activity.receiptId)
    if (receipt && receipt.jobNo !== activity.jobNo) {
      errors.push(`Warehouse activity ${activity.id} job number does not match receipt ${receipt.id}`)
    }
  }
  for (const document of dataset.documents) {
    if (document.containerNo) {
      requireReference(containersByNumber.has(document.containerNo), `Document ${document.id} references missing container ${document.containerNo}`)
      const container = containersByNumber.get(document.containerNo)
      if (container && container.jobNo !== document.jobNo) {
        errors.push(`Document ${document.id} job number does not match container ${container.id}`)
      }
    }
    if (document.tripId) {
      requireReference(trips.has(document.tripId), `Document ${document.id} references missing trip ${document.tripId}`)
      const trip = trips.get(document.tripId)
      if (trip && trip.jobNo !== document.jobNo) {
        errors.push(`Document ${document.id} job number does not match trip ${trip.id}`)
      }
    }
    if (document.invoiceId) {
      requireReference(invoices.has(document.invoiceId), `Document ${document.id} references missing invoice ${document.invoiceId}`)
      const invoice = invoices.get(document.invoiceId)
      if (invoice && invoice.jobNo !== document.jobNo) {
        errors.push(`Document ${document.id} job number does not match invoice ${invoice.id}`)
      }
    }
  }
  for (const charge of dataset.charges) {
    if (charge.invoiceId) {
      const invoice = invoices.get(charge.invoiceId)
      requireReference(Boolean(invoice), `Charge ${charge.id} references missing invoice ${charge.invoiceId}`)
      if (invoice && !invoice.chargeIds.includes(charge.id)) {
        errors.push(`Charge ${charge.id} is not listed on invoice ${invoice.id}`)
      }
    }
  }
  for (const cost of dataset.supplierCosts) {
    requireReference(suppliers.has(cost.supplierId), `Supplier cost ${cost.id} references missing supplier ${cost.supplierId}`)
    if (cost.tripId) {
      requireReference(trips.has(cost.tripId), `Supplier cost ${cost.id} references missing trip ${cost.tripId}`)
      const trip = trips.get(cost.tripId)
      if (trip && trip.jobNo !== cost.jobNo) {
        errors.push(`Supplier cost ${cost.id} job number does not match trip ${trip.id}`)
      }
    }
  }
  for (const rate of dataset.storageRates) {
    requireReference(customers.has(rate.customerId), `Storage rate ${rate.id} references missing customer ${rate.customerId}`)
  }
  for (const request of dataset.paymentRequests) {
    requireReference(suppliers.has(request.supplierId), `Payment request ${request.id} references missing supplier ${request.supplierId}`)
  }
  for (const invoice of dataset.invoices) {
    requireReference(customers.has(invoice.customerId), `Invoice ${invoice.id} references missing customer ${invoice.customerId}`)
    requireReference(jobs.has(invoice.jobNo), `Invoice ${invoice.id} references missing job ${invoice.jobNo}`)
    const job = jobs.get(invoice.jobNo)
    if (job && job.customerId !== invoice.customerId) {
      errors.push(`Invoice ${invoice.id} customer does not match job ${job.jobNo}`)
    }
    for (const chargeId of invoice.chargeIds) {
      const charge = charges.get(chargeId)
      requireReference(Boolean(charge), `Invoice ${invoice.id} references missing charge ${chargeId}`)
      if (charge && charge.jobNo !== invoice.jobNo) {
        errors.push(`Invoice ${invoice.id} and charge ${charge.id} have different job numbers`)
      }
      if (charge && charge.invoiceId !== invoice.id) {
        errors.push(`Charge ${charge.id} does not reference invoice ${invoice.id}`)
      }
    }
  }
  for (const voucher of dataset.paymentVouchers) {
    requireReference(suppliers.has(voucher.supplierId), `Payment voucher ${voucher.id} references missing supplier ${voucher.supplierId}`)
    if (voucher.supplierCostId) {
      requireReference(supplierCosts.has(voucher.supplierCostId), `Payment voucher ${voucher.id} references missing supplier cost ${voucher.supplierCostId}`)
    }
    if (voucher.jobNo) {
      requireReference(jobs.has(voucher.jobNo), `Payment voucher ${voucher.id} references missing job ${voucher.jobNo}`)
    }
  }
  for (const alert of dataset.alerts) {
    if (alert.jobNo) requireReference(jobs.has(alert.jobNo), `Alert ${alert.id} references missing job ${alert.jobNo}`)
    if (alert.containerNo) {
      requireReference(containersByNumber.has(alert.containerNo), `Alert ${alert.id} references missing container ${alert.containerNo}`)
      const container = containersByNumber.get(alert.containerNo)
      if (container && alert.jobNo && container.jobNo !== alert.jobNo) {
        errors.push(`Alert ${alert.id} job number does not match container ${container.id}`)
      }
    }
    if (alert.invoiceId) requireReference(invoices.has(alert.invoiceId), `Alert ${alert.id} references missing invoice ${alert.invoiceId}`)
    if (alert.truckId) requireReference(trucks.has(alert.truckId), `Alert ${alert.id} references missing truck ${alert.truckId}`)
  }
  for (const transaction of dataset.bankTransactions) {
    if (transaction.reconciliationStatus === 'matched' && !transaction.matchedRecordId) {
      errors.push(`Bank transaction ${transaction.id} is marked matched without a matched record`)
    }
  }
  const openingDebit = dataset.openingBalances.reduce((total, opening) => total + opening.debitRM, 0)
  const openingCredit = dataset.openingBalances.reduce((total, opening) => total + opening.creditRM, 0)
  if (roundRM(openingDebit) !== roundRM(openingCredit)) {
    errors.push('Opening balances do not balance (debits must equal credits)')
  }
  for (const opening of dataset.openingBalances) {
    requireReference(
      ['1000', '1100', '1200', '1900', '2000', '2100', '2200', '3000'].includes(opening.accountId),
      `Opening balance ${opening.id} references unknown account ${opening.accountId}`,
    )
  }
  return { valid: errors.length === 0, errors }
}
