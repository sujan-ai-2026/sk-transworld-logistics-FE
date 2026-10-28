import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_DATA } from '../src/data/demoData.js'
import {
  acceptQuotationAndCreateJob,
  createJobFromInput,
  generateIllustrativeJobNumber,
  getDefaultJobFilters,
  getJobCloseReadiness,
  getJobListRecords,
  validateJobCreateInput,
  type JobCreateInput,
} from '../src/data/jobs.js'

const validInput: JobCreateInput = {
  customerId: 'CUS-002',
  quotationId: '',
  description: 'Illustrative export shipment',
  serviceDepartments: ['forwarding', 'haulage'],
  owner: 'Demo Coordinator',
  createdDate: '2026-10-28',
  eta: '2026-11-02',
}

test('job register searches job, customer, container, BL, vessel and status', () => {
  const filters = getDefaultJobFilters()
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, search: 'SKI2610028' })[0]?.job.jobNo, 'SKI2610028')
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, search: 'Asteria Mobility' }).length, 2)
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, search: 'TGHU7162045' })[0]?.job.jobNo, 'SKI2610028')
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, search: 'AST-HBL-028' })[0]?.job.jobNo, 'SKI2610028')
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, search: 'MV Selat Horizon' })[0]?.job.jobNo, 'SKI2610028')
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, search: 'awaiting_customs' })[0]?.job.jobNo, 'SKI2610031')
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, search: 'no-such-record' }).length, 0)
})

test('job register filters by customer, services, statuses and created date', () => {
  const filters = getDefaultJobFilters()
  assert.deepEqual(
    getJobListRecords(DEMO_DATA, { ...filters, customerId: 'CUS-001' }).map((row) => row.job.jobNo),
    ['SKI2610031', 'SKI2610028'],
  )
  assert.deepEqual(
    getJobListRecords(DEMO_DATA, { ...filters, department: 'warehouse' }).map((row) => row.job.jobNo),
    ['SKI2610030'],
  )
  assert.deepEqual(
    getJobListRecords(DEMO_DATA, { ...filters, operationalStatus: 'delivered' }).map((row) => row.job.jobNo),
    ['SKI2610029'],
  )
  assert.deepEqual(
    getJobListRecords(DEMO_DATA, { ...filters, financialStatus: 'unbilled' }).map((row) => row.job.jobNo),
    ['SKI2610031', 'SKI2610029'],
  )
  assert.deepEqual(
    getJobListRecords(DEMO_DATA, { ...filters, fromDate: '2026-10-20', toDate: '2026-10-28' }).map((row) => row.job.jobNo),
    ['SKI2610031', 'SKI2610028'],
  )
  assert.equal(getJobListRecords(DEMO_DATA, { ...filters, sortBy: 'customer', sortDirection: 'asc' })[0]?.customerName, 'Asteria Mobility Sdn Bhd')
})

test('job creation validates required fields and date/service constraints', () => {
  assert.deepEqual(validateJobCreateInput(DEMO_DATA, validInput), [])
  assert.deepEqual(createJobFromInput(DEMO_DATA, validInput), {
    jobNo: 'SKI2610032',
    customerId: 'CUS-002',
    description: 'Illustrative export shipment',
    serviceDepartments: ['forwarding', 'haulage'],
    owner: 'Demo Coordinator',
    createdDate: '2026-10-28',
    eta: '2026-11-02',
    operationalStatus: 'awaiting_customs',
    financialStatus: 'unbilled',
  })

  const invalid = validateJobCreateInput(DEMO_DATA, {
    ...validInput,
    description: ' ',
    owner: '',
    serviceDepartments: [],
    eta: '2026-10-01',
  })
  assert.ok(invalid.includes('Enter a job description.'))
  assert.ok(invalid.includes('Enter a job owner.'))
  assert.ok(invalid.includes('Select at least one service department.'))
  assert.ok(invalid.includes('ETA cannot be before the job date.'))
  assert.ok(validateJobCreateInput(DEMO_DATA, { ...validInput, createdDate: '2026-02-30' }).includes('Enter a valid job date.'))
  assert.equal(generateIllustrativeJobNumber(DEMO_DATA, '2026-11-01'), 'SKI2611001')
})

test('quotation-based creation carries customer, service and illustrative rates', () => {
  const quotation = DEMO_DATA.quotations.find((record) => record.id === 'QT-2610-044')
  assert.ok(quotation)
  const fromQuotation: JobCreateInput = {
    ...validInput,
    customerId: quotation.customerId,
    quotationId: quotation.id,
    description: quotation.lines.map((line) => line.description).join(' · '),
    serviceDepartments: [...new Set(quotation.lines.map((line) => line.department))],
  }
  assert.deepEqual(validateJobCreateInput(DEMO_DATA, fromQuotation), [])
  const job = createJobFromInput(DEMO_DATA, fromQuotation)
  const accepted = acceptQuotationAndCreateJob(DEMO_DATA, fromQuotation)
  assert.equal(job.customerId, quotation.customerId)
  assert.equal(job.quotationId, quotation.id)
  assert.deepEqual(job.serviceDepartments, ['haulage'])
  assert.equal(accepted.quotation.status, 'accepted')
  assert.equal(accepted.quotation.linkedJobNo, accepted.job.jobNo)
  assert.equal(accepted.job.quotationId, accepted.quotation.id)
  assert.equal(quotation.lines[0]?.rateRM, 500)
  assert.ok(validateJobCreateInput(DEMO_DATA, { ...fromQuotation, customerId: 'CUS-001' }).includes('The selected quotation belongs to a different customer.'))
  assert.ok(validateJobCreateInput(DEMO_DATA, { ...fromQuotation, serviceDepartments: ['customs'] }).includes('Job services must be included in the selected quotation.'))
})

test('job list exposes missing document indicator and linked containers', () => {
  const rows = getJobListRecords(DEMO_DATA, getDefaultJobFilters())
  const job31 = rows.find((row) => row.job.jobNo === 'SKI2610031')
  assert.equal(job31?.hasMissingDocuments, true)
  assert.deepEqual(job31?.containerNumbers, ['CMAU6402198'])
  assert.equal(rows.find((row) => row.job.jobNo === 'SKI2610030')?.hasMissingDocuments, false)
})

test('job close-out blocks incomplete records and requires an approved exception', () => {
  const blocked = getJobCloseReadiness(DEMO_DATA, 'SKI2610029')
  assert.equal(blocked.canClose, false)
  assert.equal(blocked.unbilledCharges.length, 1)
  assert.equal(blocked.missingDocuments.length, 0)

  const exception = getJobCloseReadiness(DEMO_DATA, 'SKI2610029', {
    reason: 'Customer-approved demo write-off',
    approvedBy: 'Finance Manager (Demo)',
  })
  assert.equal(exception.canClose, true)
  assert.throws(() => getJobCloseReadiness(DEMO_DATA, 'missing'), /Job not found/)
})
