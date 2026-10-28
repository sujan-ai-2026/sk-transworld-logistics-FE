import type {
  ChargeSuggestion,
  DateOnly,
  DemoDataset,
  StockMovement,
  StorageRateRule,
  WarehouseReceipt,
} from './model.js'

export type StorageFreeDayPolicy = 'exclude_receipt_day' | 'include_receipt_day'
export type MonthlyPeriodPolicy = 'started_30_day_period' | 'prorated_30_day_period'

export interface StorageBillingPolicy {
  freeDayPolicy: StorageFreeDayPolicy
  monthlyPeriodPolicy: MonthlyPeriodPolicy
  decimalPlaces: 0 | 2
}

export interface StorageChargePreview {
  receipt: WarehouseReceipt
  rate: StorageRateRule
  quantity: number
  quantityUnit: 'CBM' | 'pallets' | 'cartons'
  elapsedDays: number
  freeDays: number
  chargeableDays: number
  chargeablePeriods: number
  periodLabel: string
  periodStart: DateOnly
  periodEnd: DateOnly
  rateRM: number
  subtotalRM: number
  amountRM: number
  sourceEventId: string
  customerName: string
}

export interface InventoryBalance {
  receipt: WarehouseReceipt
  sku: string
  description: string
  quantity: number
  unit: 'carton' | 'pallet'
  batchLots: string[]
  locations: string[]
  movements: StockMovement[]
}

export const DEFAULT_STORAGE_BILLING_POLICY: StorageBillingPolicy = {
  freeDayPolicy: 'exclude_receipt_day',
  monthlyPeriodPolicy: 'started_30_day_period',
  decimalPlaces: 2,
}

const DAY_MS = 24 * 60 * 60 * 1000

function dayCount(start: DateOnly, end: DateOnly): number {
  const startTime = Date.parse(`${start}T00:00:00Z`)
  const endTime = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    throw new Error('Storage period dates must be valid and end on or after the start date.')
  }
  return Math.round((endTime - startTime) / DAY_MS)
}

function addDays(date: DateOnly, days: number): DateOnly {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function roundTo(value: number, decimalPlaces: number): number {
  const factor = 10 ** decimalPlaces
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function getInventoryBalances(dataset: DemoDataset): InventoryBalance[] {
  const keys = new Map<string, { receipt: WarehouseReceipt; sku: string; description: string; unit: StockMovement['unit'] }>()
  for (const movement of dataset.stockMovements) {
    const receipt = dataset.warehouseReceipts.find((record) => record.id === movement.receiptId)
    if (!receipt) continue
    const key = `${movement.receiptId}|${movement.sku}|${movement.unit}`
    if (!keys.has(key)) keys.set(key, { receipt, sku: movement.sku, description: movement.description, unit: movement.unit })
  }

  return [...keys.entries()].map(([key, record]) => {
    const movements = dataset.stockMovements.filter(
      (movement) => `${movement.receiptId}|${movement.sku}|${movement.unit}` === key,
    )
    const quantity = movements.reduce((balance, movement) => {
      if (movement.direction === 'in') return balance + movement.quantity
      if (movement.direction === 'out') return balance - movement.quantity
      return balance + movement.quantity
    }, 0)
    return {
      ...record,
      quantity,
      batchLots: [...new Set(movements.map((movement) => movement.batchLot).filter((value): value is string => Boolean(value)))],
      locations: [...new Set(movements.map((movement) => movement.binLocation).filter((value): value is string => Boolean(value)))],
      movements,
    }
  })
}

export function createStockAdjustment(input: {
  id: string
  jobNo: string
  receiptId: string
  sku: string
  description: string
  quantity: number
  unit: StockMovement['unit']
  occurredAt: DateOnly
  discrepancyType: NonNullable<StockMovement['discrepancyType']>
  reason: string
  evidenceReference?: string
  binLocation?: string
  batchLot?: string
  expiryDate?: DateOnly
}): StockMovement {
  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    throw new Error('Adjustment quantity must be a non-zero finite number.')
  }
  if (!input.reason.trim()) throw new Error('A reason is required for every stock adjustment.')
  if (
    (input.discrepancyType === 'damage' || input.discrepancyType === 'shortage') &&
    !input.evidenceReference?.trim()
  ) {
    throw new Error('Damage and shortage adjustments require an evidence reference.')
  }
  if (input.expiryDate && !Number.isFinite(Date.parse(`${input.expiryDate}T00:00:00Z`))) {
    throw new Error('Expiry date must be a valid date.')
  }
  return {
    id: input.id,
    jobNo: input.jobNo,
    receiptId: input.receiptId,
    sku: input.sku.trim(),
    description: input.description.trim(),
    direction: 'adjustment',
    quantity: input.quantity,
    unit: input.unit,
    occurredAt: input.occurredAt,
    reason: input.reason.trim(),
    discrepancyType: input.discrepancyType,
    ...(input.evidenceReference?.trim() ? { evidenceReference: input.evidenceReference.trim() } : {}),
    ...(input.binLocation?.trim() ? { binLocation: input.binLocation.trim() } : {}),
    ...(input.batchLot?.trim() ? { batchLot: input.batchLot.trim() } : {}),
    ...(input.expiryDate ? { expiryDate: input.expiryDate } : {}),
  }
}

export function calculateStorageChargePreview(
  dataset: DemoDataset,
  receiptId: string,
  policy: StorageBillingPolicy = DEFAULT_STORAGE_BILLING_POLICY,
  periodEnd: DateOnly = dataset.metadata.asOfDate,
): StorageChargePreview {
  const receipt = dataset.warehouseReceipts.find((record) => record.id === receiptId)
  if (!receipt) throw new Error(`Warehouse receipt not found: ${receiptId}`)
  const job = dataset.jobs.find((record) => record.jobNo === receipt.jobNo)
  if (!job) throw new Error(`Job not found for warehouse receipt: ${receiptId}`)
  const rate = dataset.storageRates.find((record) => record.customerId === job.customerId)
  if (!rate) throw new Error(`No storage rate is configured for customer ${job.customerId}`)
  const customerName = dataset.customers.find((record) => record.id === job.customerId)?.name
  if (!customerName) throw new Error(`Customer not found for warehouse receipt: ${receiptId}`)

  const rawElapsedDays = dayCount(receipt.receivedDate, periodEnd)
  const elapsedDays = rawElapsedDays + (policy.freeDayPolicy === 'include_receipt_day' ? 1 : 0)
  const freeDays = rate.freeDays
  const chargeableDays = Math.max(0, elapsedDays - freeDays)
  const isMonthly = rate.basis === 'carton_per_month'
  const chargeablePeriods = isMonthly
    ? policy.monthlyPeriodPolicy === 'started_30_day_period'
      ? Math.ceil(chargeableDays / 30)
      : chargeableDays / 30
    : chargeableDays
  const quantity = rate.basis === 'cbm_per_day'
    ? receipt.volumeCBM
    : (() => {
        const unit = rate.basis === 'pallet_per_day' ? 'pallet' : 'carton'
        const ledgerMovements = dataset.stockMovements.filter(
          (movement) =>
            movement.receiptId === receipt.id &&
            movement.unit === unit &&
            movement.occurredAt <= periodEnd,
        )
        if (!ledgerMovements.length) {
          return unit === 'pallet' ? receipt.pallets : receipt.cartons
        }
        return ledgerMovements.reduce((balance, movement) => {
          if (movement.direction === 'in') return balance + movement.quantity
          if (movement.direction === 'out') return balance - movement.quantity
          return balance + movement.quantity
        }, 0)
      })()
  if (quantity < 0) {
    throw new Error(`Storage quantity is negative for receipt ${receipt.id}; reconcile stock adjustments before billing.`)
  }
  const quantityUnit = rate.basis === 'cbm_per_day'
    ? 'CBM'
    : rate.basis === 'pallet_per_day'
      ? 'pallets'
      : 'cartons'
  const amountRM = roundTo(quantity * rate.rateRM * chargeablePeriods, policy.decimalPlaces)
  const periodStart = addDays(
    receipt.receivedDate,
    freeDays + (policy.freeDayPolicy === 'exclude_receipt_day' ? 1 : 0),
  )

  return {
    receipt,
    rate,
    quantity,
    quantityUnit,
    elapsedDays,
    freeDays,
    chargeableDays,
    chargeablePeriods,
    periodLabel: isMonthly
      ? policy.monthlyPeriodPolicy === 'started_30_day_period'
        ? 'started 30-day periods'
        : 'prorated 30-day periods'
      : 'chargeable days',
    periodStart,
    periodEnd,
    rateRM: rate.rateRM,
    subtotalRM: roundTo(quantity * rate.rateRM * chargeablePeriods, 4),
    amountRM,
    sourceEventId: `storage:${receipt.id}:${rate.id}:${periodStart}:${periodEnd}`,
    customerName,
  }
}

export function createStorageChargeSuggestion(
  preview: StorageChargePreview,
  existingCharges: ChargeSuggestion[],
  adjustment: { amountRM?: number; reason?: string } = {},
): ChargeSuggestion {
  if (existingCharges.some((charge) => charge.sourceEventId === preview.sourceEventId)) {
    throw new Error('A storage charge already exists for this receipt and billing period.')
  }
  const amountRM = adjustment.amountRM ?? preview.amountRM
  if (!Number.isFinite(amountRM) || amountRM < 0) {
    throw new Error('Storage charge amount must be a finite, non-negative value.')
  }
  const adjusted = amountRM !== preview.amountRM
  if (adjusted && !adjustment.reason?.trim()) {
    throw new Error('An adjustment reason is required when changing the calculated charge.')
  }
  return {
    id: `STO-${preview.receipt.id}-${preview.rate.id}-${preview.periodEnd}`.replaceAll(/[^a-zA-Z0-9-]/g, '-'),
    jobNo: preview.receipt.jobNo,
    department: 'warehouse',
    description: `Storage · ${preview.quantity} ${preview.quantityUnit} × RM ${preview.rateRM}/${preview.rate.basis.replaceAll('_', ' ')} × ${preview.chargeablePeriods} ${preview.periodLabel}`,
    sourceEventId: preview.sourceEventId,
    quantity: preview.quantity * preview.chargeablePeriods,
    unit: `${preview.quantityUnit} · ${preview.periodLabel}`,
    amountRM,
    performed: preview.chargeablePeriods > 0,
    status: 'draft',
    illustrativeRate: true,
    ...(adjusted ? { adjustmentReason: adjustment.reason?.trim() } : {}),
  }
}
