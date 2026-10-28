import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_DATA } from '../src/data/demoData.js'
import {
  calculateAlertCounts,
  calculateDashboardMetrics,
  calculateDashboardSummary,
  calculateDepartmentRevenue,
  calculateInvoiceTotals,
  calculateJobProfitability,
  calculateStorageCharge,
  calculateStorageChargeFromRate,
  getDefaultDashboardFilters,
  getFreeDaysRemaining,
  validateDemoData,
} from '../src/data/calculations.js'

test('shared demo records have valid cross-module references', () => {
  assert.deepEqual(validateDemoData(DEMO_DATA), { valid: true, errors: [] })
})

test('invoice totals sum linked charges and subtract payments', () => {
  assert.deepEqual(calculateInvoiceTotals(DEMO_DATA, 'INV-2610-002'), {
    subtotalRM: 660,
    paidRM: 100,
    outstandingRM: 560,
  })
  assert.throws(() => calculateInvoiceTotals(DEMO_DATA, 'missing'), /Invoice not found/)
})

test('job profitability keeps actual and estimated costs separate', () => {
  assert.deepEqual(calculateJobProfitability(DEMO_DATA, 'SKI2610028'), {
    revenueRM: 1900,
    actualCostsRM: 830,
    estimatedCostsRM: 0,
    actualMarginRM: 1070,
    projectedMarginRM: 1070,
  })
  assert.deepEqual(calculateJobProfitability(DEMO_DATA, 'SKI2610031'), {
    revenueRM: 380,
    actualCostsRM: 0,
    estimatedCostsRM: 650,
    actualMarginRM: 380,
    projectedMarginRM: -270,
  })
})

test('department revenue includes performed charges and excludes waived charges', () => {
  assert.deepEqual(calculateDepartmentRevenue(DEMO_DATA), [
    { department: 'customs', revenueRM: 240 },
    { department: 'forwarding', revenueRM: 840 },
    { department: 'haulage', revenueRM: 1700 },
    { department: 'warehouse', revenueRM: 660 },
  ])
})

test('storage charge uses caller-supplied chargeable periods', () => {
  assert.equal(calculateStorageCharge({ quantity: 44, rateRM: 3, chargeablePeriods: 2 }), 264)
  assert.equal(calculateStorageChargeFromRate(DEMO_DATA.storageRates[0], 44, 2), 264)
  assert.throws(
    () => calculateStorageCharge({ quantity: -1, rateRM: 3, chargeablePeriods: 2 }),
    /Quantity must be a finite, non-negative number/,
  )
})

test('free time reports days until expiry and negative days after expiry', () => {
  assert.equal(getFreeDaysRemaining('2026-10-30', '2026-10-28'), 2)
  assert.equal(getFreeDaysRemaining('2026-10-27', '2026-10-28'), -1)
  assert.throws(() => getFreeDaysRemaining('2026-02-30', '2026-02-28'), /valid YYYY-MM-DD/)
})

test('alert counts and dashboard summary reflect the shared snapshot', () => {
  assert.deepEqual(calculateAlertCounts(DEMO_DATA), {
    open: 5,
    acknowledged: 1,
    resolved: 0,
    critical: 1,
    high: 2,
    medium: 2,
    low: 1,
    dueOrOverdue: 3,
  })
  assert.deepEqual(calculateDashboardSummary(DEMO_DATA), {
    totalJobs: 4,
    activeJobs: 3,
    deliveredJobs: 1,
    totalContainers: 5,
    containersAtPort: 1,
    openAlerts: 5,
    overdueInvoices: 1,
    receivablesOutstandingRM: 560,
    billedRevenueRM: 2320,
  })
})

test('dashboard metrics reconcile to linked demo records and filters', () => {
  const filters = getDefaultDashboardFilters(DEMO_DATA)
  const allCustomers = calculateDashboardMetrics(DEMO_DATA, filters)

  assert.equal(allCustomers.deliveriesToday, 1)
  assert.equal(allCustomers.containersArriving, 3)
  assert.equal(allCustomers.customsPending, 2)
  assert.equal(allCustomers.edoPending, 1)
  assert.equal(allCustomers.warehouseDeliveries, 1)
  assert.equal(allCustomers.trucksRequired, 2)
  assert.equal(allCustomers.revenueTodayRM, 1660)
  assert.equal(allCustomers.revenueMonthToDateRM, 2320)
  assert.equal(allCustomers.customerOutstandingRM, 2220)
  assert.equal(allCustomers.supplierPayableRM, 90)
  assert.equal(allCustomers.jobProfitabilityRM, 2100)
  assert.equal(allCustomers.shipmentRows.length, DEMO_DATA.containers.length)
  assert.equal(
    allCustomers.departmentRevenue.reduce((total, row) => total + row.revenueRM, 0),
    2320,
  )

  const customerOnly = calculateDashboardMetrics(DEMO_DATA, {
    ...filters,
    customerId: 'CUS-001',
  })
  assert.equal(customerOnly.shipmentRows.length, 3)
  assert.equal(customerOnly.revenueTodayRM, 1660)
  assert.equal(customerOnly.revenueMonthToDateRM, 1660)
  assert.equal(customerOnly.customerOutstandingRM, 1660)
  assert.equal(customerOnly.supplierPayableRM, 0)
  assert.ok(customerOnly.shipmentRows.every((row) => row.customerId === 'CUS-001'))

  const asOfDay = calculateDashboardMetrics(DEMO_DATA, {
    fromDate: DEMO_DATA.metadata.asOfDate,
    toDate: DEMO_DATA.metadata.asOfDate,
    customerId: '',
  })
  assert.equal(asOfDay.shipmentRows.length, 3)
  assert.equal(asOfDay.containersArriving, 2)
  assert.equal(asOfDay.deliveriesToday, 1)
  assert.equal(asOfDay.revenueTodayRM, 1660)
  assert.equal(asOfDay.revenueMonthToDateRM, 1660)

  const emptyRange = calculateDashboardMetrics(DEMO_DATA, {
    fromDate: '2025-01-01',
    toDate: '2025-01-31',
    customerId: '',
  })
  assert.equal(emptyRange.shipmentRows.length, 0)
  assert.equal(emptyRange.revenueMonthToDateRM, 0)
  assert.equal(emptyRange.alerts.length, 0)
  assert.throws(
    () =>
      calculateDashboardMetrics(DEMO_DATA, {
        fromDate: '2026-10-29',
        toDate: '2026-10-28',
        customerId: '',
      }),
    /From date must be on or before To date/,
  )
})

test('data integrity validation reports broken references', () => {
  const invalidDataset = structuredClone(DEMO_DATA)
  invalidDataset.containers[0].shipmentId = 'MISSING-SHIPMENT'

  const result = validateDemoData(invalidDataset)
  assert.equal(result.valid, false)
  assert.ok(result.errors.includes('Container CONT-028-A references missing shipment MISSING-SHIPMENT'))
})
