import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_DATA } from '../src/data/demoData.js'
import {
  DEFAULT_STORAGE_BILLING_POLICY,
  calculateStorageChargePreview,
  createStockAdjustment,
  createStorageChargeSuggestion,
  getInventoryBalances,
} from '../src/data/warehouse.js'

test('inventory balance reconciles inbound, outbound and separately recorded discrepancy', () => {
  const balances = getInventoryBalances(DEMO_DATA)
  const balance = balances.find((item) => item.unit === 'carton')
  const palletBalance = balances.find((item) => item.unit === 'pallet')

  assert.ok(balance)
  assert.ok(palletBalance)
  assert.equal(balance.receipt.grnNo, 'GRN-DEMO-030')
  assert.equal(balance.sku, 'FIX-CHAIR-01')
  assert.equal(balance.quantity, 418)
  assert.equal(balance.unit, 'carton')
  assert.equal(balance.movements.length, 3)
  assert.equal(palletBalance.quantity, 24)
})

test('stock discrepancy requires reason and damage/shortage evidence reference', () => {
  const base = {
    id: 'STK-ADJ-TEST',
    jobNo: 'SKI2610030',
    receiptId: 'WHR-030-A',
    sku: 'FIX-CHAIR-01',
    description: 'Retail display chair',
    quantity: -3,
    unit: 'carton' as const,
    occurredAt: '2026-10-28',
    discrepancyType: 'shortage' as const,
    reason: 'Counted shortage during receiving check',
  }

  assert.throws(() => createStockAdjustment(base), /evidence reference/)
  assert.throws(() => createStockAdjustment({ ...base, evidenceReference: 'photo-42', reason: '' }), /reason is required/)
  const movement = createStockAdjustment({ ...base, evidenceReference: 'photo-42' })

  assert.equal(movement.direction, 'adjustment')
  assert.equal(movement.quantity, -3)
  assert.equal(movement.evidenceReference, 'photo-42')
})

test('storage preview explains sample carton/month rate, free days and rounding policy', () => {
  const preview = calculateStorageChargePreview(DEMO_DATA, 'WHR-030-A')

  assert.equal(preview.rate.id, 'RATE-STO-C')
  assert.equal(preview.rate.rateRM, 5)
  assert.equal(preview.rate.freeDays, 0)
  assert.equal(preview.quantity, 418)
  assert.equal(preview.quantityUnit, 'cartons')
  assert.equal(preview.elapsedDays, 48)
  assert.equal(preview.chargeableDays, 48)
  assert.equal(preview.chargeablePeriods, 2)
  assert.equal(preview.periodLabel, 'started 30-day periods')
  assert.equal(preview.amountRM, 4180)
  assert.equal(preview.rate.policyStatus, 'Pending Business Clarification')
})

test('storage calculation policy is configurable for free-day inclusion, month proration and rounding', () => {
  const preview = calculateStorageChargePreview(
    DEMO_DATA,
    'WHR-030-A',
    {
      freeDayPolicy: 'include_receipt_day',
      monthlyPeriodPolicy: 'prorated_30_day_period',
      decimalPlaces: 0,
    },
  )

  assert.equal(preview.elapsedDays, 49)
  assert.equal(preview.chargeablePeriods, 49 / 30)
  assert.equal(preview.amountRM, 3414)

  const justFreeDays = calculateStorageChargePreview(
    DEMO_DATA,
    'WHR-030-A',
    { ...DEFAULT_STORAGE_BILLING_POLICY },
    '2026-09-10',
  )
  assert.equal(justFreeDays.chargeablePeriods, 0)
  assert.equal(justFreeDays.amountRM, 0)
})

test('customer-specific CBM rate applies three free days before RM 3 per CBM per day', () => {
  const customerRateDataset = {
    ...DEMO_DATA,
    jobs: DEMO_DATA.jobs.map((job) =>
      job.jobNo === 'SKI2610030' ? { ...job, customerId: 'CUS-001' } : job,
    ),
  }
  const withinFreePeriod = calculateStorageChargePreview(
    customerRateDataset,
    'WHR-030-A',
    DEFAULT_STORAGE_BILLING_POLICY,
    '2026-09-13',
  )
  const firstChargeableDay = calculateStorageChargePreview(
    customerRateDataset,
    'WHR-030-A',
    DEFAULT_STORAGE_BILLING_POLICY,
    '2026-09-14',
  )

  assert.equal(withinFreePeriod.rate.id, 'RATE-STO-A')
  assert.equal(withinFreePeriod.freeDays, 3)
  assert.equal(withinFreePeriod.chargeablePeriods, 0)
  assert.equal(firstChargeableDay.periodStart, '2026-09-14')
  assert.equal(firstChargeableDay.chargeablePeriods, 1)
  assert.equal(firstChargeableDay.quantity, 44)
  assert.equal(firstChargeableDay.amountRM, 132)
})

test('pallet/day storage quantity uses pallet stock ledger through the billing date', () => {
  const customerRateDataset = {
    ...DEMO_DATA,
    jobs: DEMO_DATA.jobs.map((job) =>
      job.jobNo === 'SKI2610030' ? { ...job, customerId: 'CUS-002' } : job,
    ),
  }
  const preview = calculateStorageChargePreview(customerRateDataset, 'WHR-030-A')

  assert.equal(preview.rate.id, 'RATE-STO-B')
  assert.equal(preview.quantity, 24)
  assert.equal(preview.quantityUnit, 'pallets')
  assert.equal(preview.amountRM, 9216)
})

test('storage charge suggestions are Job-linked, adjustable with reason, and duplicate guarded by billing period', () => {
  const preview = calculateStorageChargePreview(DEMO_DATA, 'WHR-030-A')
  const adjustment = createStorageChargeSuggestion(preview, [], {
    amountRM: 4500,
    reason: 'Approved customer concession for first billing period',
  })

  assert.equal(adjustment.jobNo, 'SKI2610030')
  assert.equal(adjustment.department, 'warehouse')
  assert.equal(adjustment.amountRM, 4500)
  assert.equal(adjustment.adjustmentReason, 'Approved customer concession for first billing period')
  assert.equal(adjustment.status, 'draft')
  assert.throws(() => createStorageChargeSuggestion(preview, [] , { amountRM: 4000 }), /adjustment reason/)
  assert.throws(() => createStorageChargeSuggestion(preview, [adjustment]), /already exists/)
})

test('unknown receipt and reverse date ranges fail explicitly', () => {
  assert.throws(() => calculateStorageChargePreview(DEMO_DATA, 'WHR-UNKNOWN'), /receipt not found/)
  assert.throws(
    () => calculateStorageChargePreview(DEMO_DATA, 'WHR-030-A', DEFAULT_STORAGE_BILLING_POLICY, '2026-09-01'),
    /end on or after the start date/,
  )
})
