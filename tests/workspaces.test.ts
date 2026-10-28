import assert from 'node:assert/strict'
import test from 'node:test'
import { getAlertAgeLabel } from '../src/data/alerts.js'
import { getCustomerPortalData } from '../src/data/customerPortal.js'
import { DEMO_DATA } from '../src/data/demoData.js'

test('alert age uses due dates and handles overdue, due-today, and upcoming cases', () => {
  const alert = DEMO_DATA.alerts.find((record) => record.id === 'ALT-030-01')
  assert.ok(alert)
  assert.equal(getAlertAgeLabel(alert, DEMO_DATA.metadata.asOfDate), '14 days overdue')
  assert.equal(getAlertAgeLabel({ ...alert, dueDate: DEMO_DATA.metadata.asOfDate }, DEMO_DATA.metadata.asOfDate), 'Due today')
  assert.equal(getAlertAgeLabel({ ...alert, dueDate: '2026-10-30' }, DEMO_DATA.metadata.asOfDate), 'Due in 2 days')
  assert.equal(getAlertAgeLabel({ ...alert, dueDate: null, createdAt: '2026-10-25' }, DEMO_DATA.metadata.asOfDate), 'Open 3 days')
  assert.throws(() => getAlertAgeLabel(alert, '28-10-2026'), /Invalid date/)
})

test('customer portal data is scoped to the selected customer and approved documents', () => {
  const asteria = getCustomerPortalData(DEMO_DATA, 'CUS-001')
  const southern = getCustomerPortalData(DEMO_DATA, 'CUS-002')
  const asteriaJobNos = new Set(asteria.jobs.map((job) => job.jobNo))

  assert.ok(asteria.jobs.length > 0)
  assert.ok(asteria.jobs.every((job) => job.customerId === 'CUS-001'))
  assert.ok(asteria.documents.length > 0)
  assert.ok(asteria.documents.every((document) =>
    asteriaJobNos.has(document.jobNo) &&
    document.access === 'customer_approved' &&
    document.status === 'available',
  ))
  assert.ok(asteria.documents.every((document) => !southern.jobs.some((job) => job.jobNo === document.jobNo)))
  assert.ok(asteria.charges.every((charge) =>
    asteriaJobNos.has(charge.jobNo) &&
    DEMO_DATA.invoices.some((invoice) =>
      invoice.id === charge.invoiceId &&
      invoice.customerId === 'CUS-001' &&
      invoice.chargeIds.includes(charge.id),
    ),
  ))
  assert.ok(!asteria.charges.some((charge) => /supplier|internal|profit/i.test(charge.description)))
  assert.ok(!southern.jobs.some((job) => asteriaJobNos.has(job.jobNo)))
  assert.throws(() => getCustomerPortalData(DEMO_DATA, 'UNKNOWN-CUSTOMER'), /Customer not found/)
})

test('customer portal excludes draft invoices and their linked charges', () => {
  const dataset = {
    ...DEMO_DATA,
    invoices: DEMO_DATA.invoices.map((invoice) =>
      invoice.status === 'approved' ? { ...invoice, status: 'draft' as const } : invoice,
    ),
  }
  const portal = getCustomerPortalData(dataset, 'CUS-001')
  assert.ok(portal.charges.every((charge) => charge.invoiceStatus !== 'draft'))
})
