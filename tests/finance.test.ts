import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateInvoiceTotals, calculateJobProfitability } from '../src/data/calculations.js'
import { DEMO_DATA } from '../src/data/demoData.js'
import {
  createDraftChargeSuggestion,
  createInvoiceFromApprovedCharges,
  getOperationalChargeCandidates,
  getPayablesRM,
  getProfitabilityByCustomer,
  getProfitabilityByDepartment,
  getProfitabilityByJob,
  getProfitabilityByShipment,
  getReceivablesRM,
  matchBankTransaction,
  reconcileBankTransaction,
} from '../src/data/finance.js'

test('operational charge suggestions use linked quotation rates and avoid existing source events', () => {
  const candidates = getOperationalChargeCandidates(DEMO_DATA)
  const handling = candidates.find((candidate) => candidate.sourceEventId === 'WHA-030-07')

  assert.ok(handling)
  assert.equal(handling.jobNo, 'SKI2610030')
  assert.equal(handling.department, 'warehouse')
  assert.equal(handling.amountRM, 180)
  assert.ok(!candidates.some((candidate) => candidate.sourceEventId === 'TRIP-028-A'))

  const draft = createDraftChargeSuggestion(handling, DEMO_DATA.charges, DEMO_DATA.metadata.asOfDate)
  const otherDraft = createDraftChargeSuggestion({
    ...handling,
    sourceEventId: 'WHA-030-08',
  }, [...DEMO_DATA.charges, draft], DEMO_DATA.metadata.asOfDate)
  assert.equal(draft.status, 'draft')
  assert.equal(draft.performed, true)
  assert.equal(draft.sourceEventId, handling.sourceEventId)
  assert.notEqual(draft.id, otherDraft.id)
  assert.throws(() => createDraftChargeSuggestion(handling, [...DEMO_DATA.charges, draft], DEMO_DATA.metadata.asOfDate), /already exists/)
})

test('invoice creation accepts only approved performed charges for its Job No.', () => {
  const dataset = {
    ...DEMO_DATA,
    charges: DEMO_DATA.charges.map((charge) =>
      charge.id === 'CHG-028-03' ? { ...charge, status: 'approved' as const } : charge,
    ),
  }
  const invoice = createInvoiceFromApprovedCharges(dataset, 'SKI2610028')

  assert.equal(invoice.status, 'draft')
  assert.deepEqual(invoice.chargeIds, ['CHG-028-03'])
  assert.equal(invoice.customerId, 'CUS-001')
  assert.equal(invoice.eInvoiceStatus, 'not_ready')
  assert.throws(() => createInvoiceFromApprovedCharges(DEMO_DATA, 'SKI2610028'), /No approved performed charges/)
})

test('haulage example and aggregate profitability reconcile to shared source lines', () => {
  const jobProfit = calculateJobProfitability(DEMO_DATA, 'SKI2610028')
  const haulageRevenue = DEMO_DATA.charges
    .filter((charge) => charge.jobNo === 'SKI2610028' && charge.department === 'haulage' && charge.performed)
    .reduce((total, charge) => total + charge.amountRM, 0)
  const tripCosts = DEMO_DATA.supplierCosts
    .filter((cost) => cost.tripId === 'TRIP-028-A' && cost.costType === 'actual')
    .reduce((total, cost) => total + cost.amountRM, 0)
  const job = getProfitabilityByJob(DEMO_DATA).find((row) => row.id === 'SKI2610028')
  const customer = getProfitabilityByCustomer(DEMO_DATA).find((row) => row.id === 'CUS-001')
  const department = getProfitabilityByDepartment(DEMO_DATA).find((row) => row.id === 'haulage')
  const shipment = getProfitabilityByShipment(DEMO_DATA).find((row) => row.id === 'SHP-028')

  assert.equal(haulageRevenue, 1200)
  assert.equal(tripCosts, 830)
  assert.equal(haulageRevenue - tripCosts, 370)
  assert.equal(jobProfit.actualMarginRM, 1070)
  assert.equal(job?.grossProfitRM, 1070)
  assert.equal(job?.marginPercent, 56.32)
  assert.equal(customer?.revenueRM, 2280)
  assert.equal(department?.revenueRM, 1700)
  assert.equal(shipment?.actualCostRM, 830)
})

test('cancelled invoices do not contribute receivables and reversed charges leave gross revenue', () => {
  const dataset = {
    ...DEMO_DATA,
    invoices: DEMO_DATA.invoices.map((invoice) =>
      invoice.id === 'INV-2610-001' ? { ...invoice, status: 'cancelled' as const, cancellationReason: 'Duplicate invoice demo' } : invoice,
    ),
    charges: DEMO_DATA.charges.map((charge) =>
      charge.invoiceId === 'INV-2610-001'
        ? { ...charge, status: 'reversed' as const, cancellationReason: 'Duplicate invoice demo' }
        : charge,
    ),
  }

  assert.equal(getReceivablesRM(dataset), 560)
  assert.equal(calculateJobProfitability(dataset, 'SKI2610028').revenueRM, 240)
  assert.equal(calculateInvoiceTotals(dataset, 'INV-2610-001').subtotalRM, 1660)
})

test('payables sum only actual supplier costs marked unpaid', () => {
  assert.equal(getPayablesRM(DEMO_DATA), 90)
})

test('bank transaction matching and reconciliation require a valid sequence', () => {
  const transaction = DEMO_DATA.bankTransactions.find((record) => record.id === 'BANK-DEMO-001')
  assert.ok(transaction)
  assert.throws(() => reconcileBankTransaction(transaction), /Match a bank transaction/)
  assert.throws(() => matchBankTransaction(transaction, 'UNKNOWN', DEMO_DATA), /Finance record not found/)
  const matched = matchBankTransaction(transaction, 'INV-2610-001', DEMO_DATA)
  const reconciled = reconcileBankTransaction(matched)
  assert.equal(matched.reconciliationStatus, 'matched')
  assert.equal(reconciled.reconciliationStatus, 'reconciled')
  assert.throws(() => reconcileBankTransaction(reconciled), /Match a bank transaction/)
})
