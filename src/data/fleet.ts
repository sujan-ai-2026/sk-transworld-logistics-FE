import type { DemoDataset, Trip, Truck } from './model.js'

export interface TruckCargoAssignment {
  trip: Trip
  jobDescription: string
  customerName: string
  containerSize: string
  weightKg: number
  volumeCBM: number
  capacityWeightPercent: number
  capacityVolumePercent: number
  billingRM: number
  actualCostRM: number
  estimatedCostRM: number
  actualProfitRM: number
  projectedProfitRM: number
}

export interface TruckFleetView {
  truck: Truck
  trips: TruckCargoAssignment[]
  selectedTripId: string | null
  driverNames: string[]
  occupiedWeightKg: number
  occupiedVolumeCBM: number
  availableWeightKg: number
  availableVolumeCBM: number
  billingRM: number
  actualCostRM: number
  estimatedCostRM: number
  actualProfitRM: number
  projectedProfitRM: number
  roadTaxDaysRemaining: number
  insuranceDaysRemaining: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function daysBetween(asOfDate: string, expiryDate: string): number {
  return Math.round(
    (Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${asOfDate}T00:00:00Z`)) /
      DAY_MS,
  )
}

function sum(values: number[]): number {
  return Math.round((values.reduce((total, value) => total + value, 0) + Number.EPSILON) * 100) / 100
}

export function getTruckFleetView(
  dataset: DemoDataset,
  truckId: string,
  selectedTripId?: string | null,
): TruckFleetView {
  const truck = dataset.trucks.find((record) => record.id === truckId)
  if (!truck) throw new Error(`Truck not found: ${truckId}`)

  const trips = dataset.trips
    .filter((trip) => trip.truckId === truckId && trip.status !== 'cancelled')
    .map((trip): TruckCargoAssignment => {
      const container = dataset.containers.find((record) => record.containerNo === trip.containerNo)
      const job = dataset.jobs.find((record) => record.jobNo === trip.jobNo)
      const customer = job
        ? dataset.customers.find((record) => record.id === job.customerId)
        : undefined
      const charges = dataset.charges.filter(
        (charge) =>
          charge.performed &&
          charge.status !== 'waived' &&
          charge.sourceEventId === trip.id,
      )
      const costs = dataset.supplierCosts.filter(
        (cost) => cost.tripId === trip.id && cost.costType === 'actual',
      )
      const estimatedCosts = dataset.supplierCosts.filter(
        (cost) => cost.tripId === trip.id && cost.costType === 'estimated',
      )
      const billingRM = sum(charges.map((charge) => charge.amountRM))
      const actualCostRM = sum(costs.map((cost) => cost.amountRM))
      const estimatedCostRM = sum(estimatedCosts.map((cost) => cost.amountRM))

      return {
        trip,
        jobDescription: job?.description ?? 'Job description unavailable',
        customerName: customer?.name ?? 'Unknown customer',
        containerSize: container?.sizeType ?? 'Unknown size',
        weightKg: container?.grossWeightKg ?? 0,
        volumeCBM: container?.volumeCBM ?? 0,
        capacityWeightPercent: truck.capacityKg
          ? Math.min(100, (container?.grossWeightKg ?? 0) / truck.capacityKg * 100)
          : 0,
        capacityVolumePercent: truck.capacityCBM
          ? Math.min(100, (container?.volumeCBM ?? 0) / truck.capacityCBM * 100)
          : 0,
        billingRM,
        actualCostRM,
        estimatedCostRM,
        actualProfitRM: sum([billingRM, -actualCostRM]),
        projectedProfitRM: sum([billingRM, -actualCostRM, -estimatedCostRM]),
      }
    })

  const activeTripId = selectedTripId ?? trips[0]?.trip.id ?? null
  if (activeTripId && !trips.some((assignment) => assignment.trip.id === activeTripId)) {
    throw new Error(`Trip ${activeTripId} is not assigned to truck ${truckId}`)
  }
  const selectedAssignments = trips.filter((assignment) => assignment.trip.id === activeTripId)
  const occupiedWeightKg = sum(selectedAssignments.map((assignment) => assignment.weightKg))
  const occupiedVolumeCBM = sum(selectedAssignments.map((assignment) => assignment.volumeCBM))
  const billingRM = sum(selectedAssignments.map((assignment) => assignment.billingRM))
  const actualCostRM = sum(selectedAssignments.map((assignment) => assignment.actualCostRM))
  const estimatedCostRM = sum(selectedAssignments.map((assignment) => assignment.estimatedCostRM))

  return {
    truck,
    trips,
    selectedTripId: activeTripId,
    driverNames: [...new Set(
      selectedAssignments
        .map((assignment) => dataset.drivers.find((driver) => driver.id === assignment.trip.driverId)?.name)
        .filter((name): name is string => Boolean(name)),
    )],
    occupiedWeightKg,
    occupiedVolumeCBM,
    availableWeightKg: Math.max(0, truck.capacityKg - occupiedWeightKg),
    availableVolumeCBM: Math.max(0, truck.capacityCBM - occupiedVolumeCBM),
    billingRM,
    actualCostRM,
    estimatedCostRM,
    actualProfitRM: sum([billingRM, -actualCostRM]),
    projectedProfitRM: sum([billingRM, -actualCostRM, -estimatedCostRM]),
    roadTaxDaysRemaining: daysBetween(dataset.metadata.asOfDate, truck.roadTaxExpiry),
    insuranceDaysRemaining: daysBetween(dataset.metadata.asOfDate, truck.insuranceExpiry),
  }
}

export function getFleetComplianceReminders(dataset: DemoDataset): Array<{
  truck: Truck
  type: 'Road tax' | 'Insurance'
  expiryDate: string
  daysRemaining: number
}> {
  return dataset.trucks.flatMap((truck) =>
    ([
      ['Road tax', truck.roadTaxExpiry],
      ['Insurance', truck.insuranceExpiry],
    ] as const)
      .map(([type, expiryDate]) => ({
        truck,
        type,
        expiryDate,
        daysRemaining: daysBetween(dataset.metadata.asOfDate, expiryDate),
      }))
      .filter((reminder) => reminder.daysRemaining >= 0 && reminder.daysRemaining <= 30),
  ).sort((a, b) => a.daysRemaining - b.daysRemaining)
}
