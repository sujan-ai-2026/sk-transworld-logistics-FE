import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_DATA } from '../src/data/demoData.js'
import {
  getContainerFreeTime,
  getCustomsProgress,
  getCustomsRecords,
  getCustomsStepBlocker,
  getForwardingRecords,
  updateCustomsStep,
  updateShipmentMilestone,
} from '../src/data/shipments.js'

test('forwarding search matches Job No., vessel, bills, container and customer', () => {
  const search = (query: string) => getForwardingRecords(DEMO_DATA, {
    query,
    mode: 'all',
    movement: 'all',
    status: 'all',
    trackingSource: 'all',
  })

  assert.equal(search('SKI2610028')[0]?.shipment.id, 'SHP-028')
  assert.equal(search('Selat Horizon')[0]?.shipment.id, 'SHP-028')
  assert.equal(search('OLMY26100028')[0]?.shipment.id, 'SHP-028')
  assert.equal(search('AST-HBL-028')[0]?.shipment.id, 'SHP-028')
  assert.equal(search('MSCU4827106')[0]?.shipment.id, 'SHP-028')
  assert.equal(search('Asteria Mobility')[0]?.shipment.id, 'SHP-028')
  assert.deepEqual(search('unknown shipment query'), [])
})

test('forwarding filters combine mode, movement, container status and tracking source', () => {
  const records = getForwardingRecords(DEMO_DATA, {
    query: '',
    mode: 'FCL',
    movement: 'transshipment',
    status: 'booked',
    trackingSource: 'manual',
  })

  assert.deepEqual(records.map(({ shipment }) => shipment.id), ['SHP-031'])
})

test('container free-time helper distinguishes configured, due, expired and absent periods', () => {
  assert.deepEqual(getContainerFreeTime('2026-10-28', '2026-10-28'), {
    remainingDays: 0,
    state: 'due_soon',
  })
  assert.deepEqual(getContainerFreeTime('2026-10-27', '2026-10-28'), {
    remainingDays: -1,
    state: 'expired',
  })
  assert.deepEqual(getContainerFreeTime(null, '2026-10-28'), {
    remainingDays: null,
    state: 'not_set',
  })
})

test('customs complete and incomplete chains derive accurate progress', () => {
  const complete = DEMO_DATA.customsCases.find((record) => record.id === 'CUSC-030-A')
  const incomplete = DEMO_DATA.customsCases.find((record) => record.id === 'CUSC-028-A')

  assert.ok(complete)
  assert.ok(incomplete)
  assert.deepEqual(getCustomsProgress(complete, '2026-09-09', '2026-10-28'), {
    state: 'complete',
    pendingSteps: 0,
    overdue: false,
  })
  assert.deepEqual(getCustomsProgress(incomplete, '2026-10-28', '2026-10-28'), {
    state: 'in_progress',
    pendingSteps: 4,
    overdue: false,
  })
  assert.equal(getCustomsProgress(incomplete, '2026-10-27', '2026-10-28').state, 'overdue')
})

test('customs filters search fields and return no result for unknown searches', () => {
  const common = { declarationType: 'all' as const, status: 'all' as const }

  assert.equal(getCustomsRecords(DEMO_DATA, { ...common, query: 'K1-DEMO-028' })[0]?.customsCase.id, 'CUSC-028-A')
  assert.equal(getCustomsRecords(DEMO_DATA, { ...common, query: 'CMAU6402198' })[0]?.customsCase.id, 'CUSC-031-A')
  assert.equal(getCustomsRecords(DEMO_DATA, { ...common, query: 'no matching declaration' }).length, 0)
  assert.equal(getCustomsRecords(DEMO_DATA, { ...common, query: '', declarationType: 'K2' }).length, 1)
  assert.equal(getCustomsRecords(DEMO_DATA, { ...common, query: '', status: 'complete' })[0]?.customsCase.id, 'CUSC-030-A')
})

test('customs release chain blocks incomplete prerequisites and allows explicit progression', () => {
  const initial = DEMO_DATA.customsCases.find((record) => record.id === 'CUSC-028-A')
  assert.ok(initial)
  assert.match(getCustomsStepBlocker(initial, 'approvalStatus', 'complete') ?? '', /Declaration, payment/)
  assert.match(getCustomsStepBlocker(initial, 'edoStatus', 'complete') ?? '', /customs approval/)
  assert.match(getCustomsStepBlocker(initial, 'paymentStatus', 'not_required') ?? '', /duty or SST/)

  const declaration = updateCustomsStep(initial, 'declarationStatus', 'complete', '2026-10-28')
  const payment = updateCustomsStep(declaration, 'paymentStatus', 'paid', '2026-10-28')
  const ssr = updateCustomsStep(payment, 'ssrStatus', 'complete', '2026-10-28')
  const inspected = updateCustomsStep(ssr, 'inspectionStatus', 'complete', '2026-10-28')
  const approved = updateCustomsStep(inspected, 'approvalStatus', 'complete', '2026-10-28')
  const edo = updateCustomsStep(approved, 'edoStatus', 'complete', '2026-10-28')
  const released = updateCustomsStep(edo, 'gatePassStatus', 'complete', '2026-10-28')

  assert.equal(released.gatePassStatus, 'complete')
  assert.equal(released.updatedAt, '2026-10-28')
  assert.equal(getCustomsProgress(released, '2026-10-28', '2026-10-28').state, 'complete')
  assert.match(getCustomsStepBlocker(released, 'declarationStatus', 'pending') ?? '', /downstream customs step/)
})

test('milestone updates record a manual source and the demo snapshot date', () => {
  const milestone = DEMO_DATA.milestones.find((record) => record.id === 'MS-028-04')
  assert.ok(milestone)
  assert.deepEqual(updateShipmentMilestone(milestone, 'completed', '2026-10-28'), {
    ...milestone,
    status: 'completed',
    occurredAt: '2026-10-28',
    source: 'manual',
  })
})
