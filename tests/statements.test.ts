import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateInvoiceTotals } from '../src/data/calculations.js'
import { DEMO_DATA } from '../src/data/demoData.js'
import { getProfitabilityByJob } from '../src/data/finance.js'
import { getShipmentDetail } from '../src/data/shipments.js'
import {
  buildIllustrativeJournal,
  calculateBalanceSheet,
  calculateProfitAndLoss,
  getPreviousPeriod,
} from '../src/data/statements.js'

test('P&L follows recognized invoices and approved direct costs within the selected period', () => {
  const report = calculateProfitAndLoss(DEMO_DATA, '2026-10-28', '2026-10-28')
  const invoice = DEMO_DATA.invoices.find((record) => record.id === 'INV-2610-001')
  const recognizedRevenue = invoice ? calculateInvoiceTotals(DEMO_DATA, invoice.id).subtotalRM : 0
  const approvedCosts = DEMO_DATA.supplierCosts
    .filter((cost) => cost.recordedDate === '2026-10-28' && cost.costType === 'actual' && cost.approvalStatus === 'approved')
    .reduce((total, cost) => total + cost.amountRM, 0)

  assert.equal(recognizedRevenue, 1660)
  assert.equal(approvedCosts, 830)
  assert.equal(report.recognizedRevenueRM, recognizedRevenue)
  assert.equal(report.directCostsRM, approvedCosts)
  assert.equal(report.grossProfitRM, 830)
  assert.equal(report.grossMarginPercent, 50)
  assert.equal(report.netProfitRM, 830)
  assert.equal(report.netMarginPercent, 50)
})

test('P&L date filters and previous-period comparison exclude out-of-range records', () => {
  const report = calculateProfitAndLoss(DEMO_DATA, '2026-10-01', '2026-10-13')
  const invoice = DEMO_DATA.invoices.find((record) => record.id === 'INV-2610-002')
  const expectedRevenue = invoice ? calculateInvoiceTotals(DEMO_DATA, invoice.id).subtotalRM : 0

  assert.equal(report.recognizedRevenueRM, expectedRevenue)
  assert.equal(report.directCostsRM, 90)
  assert.equal(report.previousStartDate, '2026-09-18')
  assert.equal(report.previousEndDate, '2026-09-30')
  assert.equal(report.previous.hasRecognizedActivity, false)
  assert.deepEqual(getPreviousPeriod('2026-10-28', '2026-10-28'), {
    startDate: '2026-10-27',
    endDate: '2026-10-27',
  })
  assert.throws(() => calculateProfitAndLoss(DEMO_DATA, '2026-10-29', '2026-10-01'), /on or before/)
  assert.throws(() => calculateProfitAndLoss(DEMO_DATA, '2026-02-30', '2026-03-01'), /Invalid start date/)
})

test('P&L returns zero margins when no recognized revenue exists', () => {
  const dataset = {
    ...DEMO_DATA,
    invoices: [],
    supplierCosts: [],
    paymentVouchers: [],
  }
  const report = calculateProfitAndLoss(dataset, '2026-10-01', '2026-10-31')

  assert.equal(report.recognizedRevenueRM, 0)
  assert.equal(report.grossProfitRM, 0)
  assert.equal(report.netProfitRM, 0)
  assert.equal(report.grossMarginPercent, null)
  assert.equal(report.netMarginPercent, null)
})

test('Balance Sheet balances from opening balances and journal activity without a plug', () => {
  const report = calculateBalanceSheet(DEMO_DATA, '2026-10-28')

  assert.equal(report.prototype, true)
  assert.equal(report.equationHolds, true)
  assert.equal(report.totalAssetsRM, report.totalLiabilitiesRM + report.totalEquityRM)
  assert.equal(report.unexplainedDifferenceRM, 0)
  assert.equal(report.cashRM, 49270)
  assert.equal(report.payablesRM, 90)
  assert.ok(report.warnings.some((warning) => warning.includes('Opening balance coverage is incomplete')))
  assert.ok(report.warnings.some((warning) => warning.includes('not audited')))

  const journal = buildIllustrativeJournal(DEMO_DATA)
  for (const entry of journal) {
    assert.equal(
      entry.lines.reduce((sum, line) => sum + line.debitRM, 0),
      entry.lines.reduce((sum, line) => sum + line.creditRM, 0),
      entry.id,
    )
  }
})

test('missing opening balances remain visible and incomplete journal data is rejected', () => {
  const withoutOpening = { ...DEMO_DATA, openingBalances: [] }
  const report = calculateBalanceSheet(withoutOpening, '2026-10-28')

  assert.equal(report.openingBalancesRecorded, false)
  assert.equal(report.equationHolds, true)
  assert.ok(report.warnings.some((warning) => warning.includes('Opening balances are not recorded')))

  const unbalancedOpening = {
    ...DEMO_DATA,
    openingBalances: DEMO_DATA.openingBalances.filter((opening) => opening.accountId === '1000'),
  }
  assert.throws(() => calculateBalanceSheet(unbalancedOpening, '2026-10-28'), /is not balanced/)
})

test('shipment detail lookup returns the matching shipment and only explicitly attributable records', () => {
  const shipment = getShipmentDetail(DEMO_DATA, 'SHP-028')
  const otherShipment = getShipmentDetail(DEMO_DATA, 'SHP-030')

  assert.ok(shipment)
  assert.ok(otherShipment)
  assert.equal(shipment.shipment.id, 'SHP-028')
  assert.equal(shipment.job?.jobNo, 'SKI2610028')
  assert.deepEqual(shipment.invoices.map(({ invoice }) => invoice.id), ['INV-2610-001'])
  assert.deepEqual(shipment.supplierCosts.map((cost) => cost.id), ['COST-028-01', 'COST-028-02', 'COST-028-03'])
  assert.equal(shipment.profitability?.actualCostRM, 830)
  assert.equal(otherShipment.shipment.id, 'SHP-030')
  assert.equal(otherShipment.job?.jobNo, 'SKI2610030')
  assert.deepEqual(otherShipment.invoices.map(({ invoice }) => invoice.id), ['INV-2610-002'])
  assert.deepEqual(otherShipment.supplierCosts.map((cost) => cost.id), ['COST-030-01'])
  assert.equal(getShipmentDetail(DEMO_DATA, 'UNKNOWN-SHIPMENT'), null)
})

test('job costing and P&L use approved actual cost records consistently', () => {
  const jobCosting = getProfitabilityByJob(DEMO_DATA).find((row) => row.id === 'SKI2610029')
  const pendingCost = DEMO_DATA.supplierCosts.find((cost) => cost.id === 'COST-029-01')

  assert.ok(pendingCost)
  assert.equal(pendingCost.approvalStatus, 'pending')
  assert.equal(jobCosting?.actualCostRM, 420)
})

test('ambiguous job-only supplier costs are not assigned to every shipment', () => {
  const firstShipment = DEMO_DATA.shipments.find((shipment) => shipment.id === 'SHP-028')
  assert.ok(firstShipment)
  const secondShipment = { ...firstShipment, id: 'SHP-028-OTHER' }
  const dataset = {
    ...DEMO_DATA,
    shipments: [...DEMO_DATA.shipments, secondShipment],
    supplierCosts: [
      ...DEMO_DATA.supplierCosts,
      {
        id: 'COST-028-JOB-ONLY',
        jobNo: firstShipment.jobNo,
        supplierId: 'SUP-002',
        department: 'haulage' as const,
        category: 'other' as const,
        description: 'Unassigned job-level cost',
        amountRM: 999,
        costType: 'actual' as const,
        approvalStatus: 'approved' as const,
        paymentStatus: 'unpaid' as const,
        recordedDate: '2026-10-28',
      },
    ],
  }

  assert.equal(getShipmentDetail(dataset, 'SHP-028')?.supplierCosts.some((cost) => cost.id === 'COST-028-JOB-ONLY'), false)
  assert.equal(getShipmentDetail(dataset, 'SHP-028-OTHER')?.supplierCosts.some((cost) => cost.id === 'COST-028-JOB-ONLY'), false)
})
