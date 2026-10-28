import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_DATA } from '../src/data/demoData.js'
import {
  createDocumentVersion,
  getDocumentRecords,
  getRequiredDocumentChecklist,
} from '../src/data/documents.js'

test('service document checklist exposes available and missing records without implying customs release', () => {
  const checklist = getRequiredDocumentChecklist(DEMO_DATA, 'SKI2610028')
  const hbl = checklist.find((item) => item.type === 'HBL')
  const packingList = checklist.find((item) => item.type === 'packing_list')
  const edo = checklist.find((item) => item.type === 'EDO')

  assert.equal(hbl?.status, 'available')
  assert.equal(packingList?.status, 'missing')
  assert.equal(edo?.status, 'missing')
  const customsCase = DEMO_DATA.customsCases.find((item) => item.jobNo === 'SKI2610028')
  assert.equal(customsCase?.approvalStatus, 'pending')
  const uploadedEdo = createDocumentVersion(DEMO_DATA, {
    jobNo: 'SKI2610028',
    type: 'EDO',
    fileName: 'edo-demo.pdf',
    containerNo: 'MSCU4827106',
  })
  assert.equal(uploadedEdo.status, 'available')
  assert.equal(customsCase?.approvalStatus, 'pending')
  assert.equal(customsCase?.edoStatus, 'pending')
  assert.throws(() => getRequiredDocumentChecklist(DEMO_DATA, 'UNKNOWN-JOB'), /Job not found/)
})

test('document register filters by linked fields and returns an empty result for unknown searches', () => {
  const all = { query: '', jobNo: '', type: 'all' as const, status: 'all' as const, access: 'all' as const, portalOnly: false }
  const byContainer = getDocumentRecords(DEMO_DATA, { ...all, query: 'MSCU4827106' })
  const unknown = getDocumentRecords(DEMO_DATA, { ...all, query: 'missing-file-token' })

  assert.ok(byContainer.some((document) => document.id === 'DOC-028-01'))
  assert.equal(unknown.length, 0)
})

test('customer portal contains only available documents explicitly approved for sharing', () => {
  const records = getDocumentRecords(DEMO_DATA, {
    query: '',
    jobNo: '',
    type: 'all',
    status: 'all',
    access: 'all',
    portalOnly: true,
  })

  assert.ok(records.length > 0)
  assert.ok(records.every((document) => document.status === 'available' && document.access === 'customer_approved'))
  assert.ok(records.some((document) => document.id === 'DOC-028-01'))
  assert.ok(!records.some((document) => document.id === 'DOC-028-02'))
})

test('uploading a version retains history and resets sharing classification', () => {
  const original = DEMO_DATA.documents.find((document) => document.id === 'DOC-028-01')
  assert.ok(original)
  const updated = createDocumentVersion(DEMO_DATA, {
    jobNo: 'SKI2610028',
    type: 'HBL',
    fileName: 'AST-HBL-028-revised.pdf',
    containerNo: 'MSCU4827106',
  })

  assert.equal(updated.id, 'DOC-028-01')
  assert.equal(updated.version, 2)
  assert.equal(updated.access, 'internal')
  assert.deepEqual(updated.history, [{
    version: 1,
    fileName: 'AST-HBL-028-demo.pdf',
    uploadedBy: 'Mei Ling Tan',
    uploadedAt: '2026-10-21',
  }])
})

test('new document links must belong to the selected Job No.', () => {
  assert.throws(() => createDocumentVersion(DEMO_DATA, {
    jobNo: 'SKI2610028',
    type: 'POD',
    fileName: 'pod.jpg',
    containerNo: 'UNKNOWN-CONTAINER',
  }), /container must belong/)
  assert.throws(() => createDocumentVersion(DEMO_DATA, {
    jobNo: 'SKI2610028',
    type: 'POD',
    fileName: 'pod.jpg',
    tripId: 'UNKNOWN-TRIP',
  }), /trip must belong/)
})
