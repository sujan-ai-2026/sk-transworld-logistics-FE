import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_DATA } from '../src/data/demoData.js'
import { getFleetComplianceReminders, getTruckFleetView } from '../src/data/fleet.js'

test('fleet view reconciles TR-001 revenue, linked trip costs, and profit', () => {
  const view = getTruckFleetView(DEMO_DATA, 'TR-001')

  assert.equal(view.trips.length, 1)
  assert.equal(view.trips[0]?.trip.id, 'TRIP-028-A')
  assert.equal(view.billingRM, 1200)
  assert.equal(view.actualCostRM, 830)
  assert.equal(view.actualProfitRM, 370)
  assert.equal(view.occupiedWeightKg, 14200)
  assert.equal(view.occupiedVolumeCBM, 58)
  assert.equal(view.driverNames.length, 1)
})

test('truck selection data changes trips, driver and capacity with the selected truck', () => {
  const first = getTruckFleetView(DEMO_DATA, 'TR-001')
  const second = getTruckFleetView(DEMO_DATA, 'TR-002')

  assert.notEqual(first.truck.id, second.truck.id)
  assert.notDeepEqual(first.trips.map(({ trip }) => trip.id), second.trips.map(({ trip }) => trip.id))
  assert.notEqual(first.truck.capacityKg, second.truck.capacityKg)
  assert.notDeepEqual(first.driverNames, second.driverNames)
})

test('cargo assignments retain linked shared job and container references', () => {
  const view = getTruckFleetView(DEMO_DATA, 'TR-001')
  const assignment = view.trips[0]

  assert.ok(assignment)
  assert.equal(assignment.trip.jobNo, 'SKI2610028')
  assert.equal(assignment.trip.containerNo, 'MSCU4827106')
  assert.ok(DEMO_DATA.jobs.some((job) => job.jobNo === assignment.trip.jobNo))
  assert.ok(DEMO_DATA.containers.some((container) => container.containerNo === assignment.trip.containerNo))
})

test('estimated costs are separated from actual trip margin', () => {
  const view = getTruckFleetView(DEMO_DATA, 'TR-002', 'TRIP-031-A')
  const estimatedTrip = view.trips.find(({ trip }) => trip.id === 'TRIP-031-A')

  assert.ok(estimatedTrip)
  assert.equal(view.selectedTripId, 'TRIP-031-A')
  assert.equal(view.estimatedCostRM, 650)
  assert.equal(estimatedTrip.actualCostRM, 0)
  assert.equal(estimatedTrip.estimatedCostRM, 650)
  assert.equal(estimatedTrip.actualProfitRM, 0)
  assert.equal(estimatedTrip.projectedProfitRM, -650)
})

test('compliance reminders include only road tax or insurance due within 30 days', () => {
  const reminders = getFleetComplianceReminders(DEMO_DATA)

  assert.ok(reminders.length > 0)
  assert.ok(reminders.every(({ daysRemaining }) => daysRemaining >= 0 && daysRemaining <= 30))
  assert.ok(reminders.every(({ type }) => type === 'Road tax' || type === 'Insurance'))
})

test('unknown truck IDs fail explicitly', () => {
  assert.throws(() => getTruckFleetView(DEMO_DATA, 'TR-UNKNOWN'), /Truck not found/)
})

test('a trip cannot be selected for a different truck', () => {
  assert.throws(
    () => getTruckFleetView(DEMO_DATA, 'TR-001', 'TRIP-031-A'),
    /is not assigned to truck/,
  )
})
