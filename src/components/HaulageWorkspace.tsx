import { useMemo, useState } from 'react'
import { DEMO_DATA } from '../data/demoData.js'
import { getFleetComplianceReminders, getTruckFleetView } from '../data/fleet.js'
import { TruckCargoVisualization } from './TruckCargoVisualization.js'

interface HaulageWorkspaceProps {
  onOpenJob: (jobNo: string) => void
}

const money = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: DEMO_DATA.metadata.currency,
  maximumFractionDigits: 0,
})

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short' }).format(
    new Date(`${date}T00:00:00`),
  )
}

function titleCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function HaulageWorkspace({ onOpenJob }: HaulageWorkspaceProps) {
  const [selectedTruckId, setSelectedTruckId] = useState(DEMO_DATA.trucks[0]?.id ?? '')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const fleetView = useMemo(
    () => getTruckFleetView(DEMO_DATA, selectedTruckId, selectedTripId),
    [selectedTruckId, selectedTripId],
  )
  const complianceReminders = getFleetComplianceReminders(DEMO_DATA)
  const selectedTrip =
    fleetView.trips.find((assignment) => assignment.trip.id === selectedTripId) ??
    fleetView.trips[0]
  const tripMilestones = selectedTrip
    ? DEMO_DATA.tripMilestones.filter((milestone) => milestone.tripId === selectedTrip.trip.id)
    : []
  const driver = selectedTrip
    ? DEMO_DATA.drivers.find((record) => record.id === selectedTrip.trip.driverId)
    : undefined
  const trailer = selectedTrip
    ? DEMO_DATA.trailers.find((record) => record.id === selectedTrip.trip.trailerId)
    : undefined
  const customCosts = selectedTrip
    ? DEMO_DATA.supplierCosts.filter((cost) => cost.tripId === selectedTrip.trip.id)
    : []
  const tripCharges = selectedTrip
    ? DEMO_DATA.charges.filter(
        (charge) =>
          charge.performed &&
          charge.status !== 'waived' &&
          charge.sourceEventId === selectedTrip.trip.id,
      )
    : []

  function chooseTruck(truckId: string) {
    setSelectedTruckId(truckId)
    setSelectedTripId(null)
  }

  return (
    <div className="haulage-workspace">
      <div className="haulage-heading">
        <div>
          <span className="section-eyebrow">FLEET + CARGO OPERATIONS</span>
          <h2>Haulage / Fleet</h2>
          <p>Illustrative truck, trip and cargo assignments linked through the shared Job No.</p>
        </div>
        {/* <span className="status-badge status-badge--blue">{DEMO_DATA.metadata.label}</span> */}
      </div>

      <section className="fleet-layout" aria-label="Fleet and cargo bay">
        <section className="fleet-main-card">
          <TruckCargoVisualization
            dataset={DEMO_DATA}
            fleetView={fleetView}
            selectedTripId={selectedTrip?.trip.id ?? selectedTripId}
            onSelectTrip={setSelectedTripId}
            onOpenJob={onOpenJob}
          />
        </section>
        <aside className="fleet-list-card" aria-label="Select a truck">
          <div className="fleet-list-heading">
            <div><span className="section-eyebrow">FLEET REGISTER</span><h3>Vehicles</h3></div>
            <span>{DEMO_DATA.trucks.length} units</span>
          </div>
          <div className="fleet-truck-list">
            {DEMO_DATA.trucks.map((truck) => {
              const truckView = getTruckFleetView(DEMO_DATA, truck.id)
              return (
                <button
                  aria-pressed={truck.id === selectedTruckId}
                  className={`fleet-truck-option${truck.id === selectedTruckId ? ' fleet-truck-option--active' : ''}`}
                  key={truck.id}
                  onClick={() => chooseTruck(truck.id)}
                  type="button"
                >
                  <span className="fleet-truck-icon" aria-hidden="true">▰</span>
                  <span className="fleet-truck-copy">
                    <strong>{truck.registrationNo}</strong>
                    <span>{truck.makeModel}</span>
                    <span>{truckView.trips.length} linked {truckView.trips.length === 1 ? 'trip' : 'trips'} · {titleCase(truck.status)}</span>
                  </span>
                  <span className={`fleet-vehicle-state fleet-vehicle-state--${truck.status}`} />
                </button>
              )
            })}
          </div>
          <div className="fleet-assigned-trips" aria-label="Trips assigned to selected truck">
            <span className="fleet-trip-list-label">ASSIGNED TRIPS · SELECT ONE TO VIEW CARGO</span>
            {fleetView.trips.length ? fleetView.trips.map((assignment) => (
              <button
                aria-pressed={assignment.trip.id === fleetView.selectedTripId}
                className={`fleet-trip-option${assignment.trip.id === fleetView.selectedTripId ? ' fleet-trip-option--active' : ''}`}
                key={assignment.trip.id}
                onClick={() => setSelectedTripId(assignment.trip.id)}
                type="button"
              >
                <span><strong>{assignment.trip.id}</strong><small>{assignment.trip.jobNo} · {formatDate(assignment.trip.scheduledDate)}</small></span>
                <span className="fleet-trip-option-status">{titleCase(assignment.trip.status)}</span>
              </button>
            )) : <p className="fleet-empty">No trips are assigned to this truck.</p>}
          </div>
          <div className="fleet-selected-summary">
            <span>Selected vehicle</span>
            <strong>{fleetView.truck.registrationNo}</strong>
            <small>{fleetView.truck.capacityKg.toLocaleString()} kg · {fleetView.truck.capacityCBM} CBM</small>
          </div>
        </aside>
      </section>

      <section className="fleet-kpi-grid" aria-label="Selected truck metrics">
        <FleetMetric label="Assigned cargo" value={`${fleetView.trips.length}`} detail="Linked trips / bay loads" />
        <FleetMetric label="Loaded weight" value={`${fleetView.occupiedWeightKg.toLocaleString()} kg`} detail={`${fleetView.availableWeightKg.toLocaleString()} kg weight capacity left${fleetView.occupiedWeightKg > fleetView.truck.capacityKg ? ' · OVER CAPACITY' : ''}`} />
        <FleetMetric label="Loaded volume" value={`${fleetView.occupiedVolumeCBM} CBM`} detail={`${fleetView.availableVolumeCBM} CBM volume capacity left`} />
        <FleetMetric label="Demo trip margin" value={money.format(fleetView.actualProfitRM)} detail="Linked billing less actual trip costs" />
      </section>

      <section className="fleet-trip-card" aria-labelledby="selected-trip-title">
        <div className="fleet-trip-header">
          <div><span className="section-eyebrow">TRIP PLAN · NOT LIVE TRACKING</span><h3 id="selected-trip-title">{selectedTrip ? selectedTrip.trip.id : 'No assigned trip'}</h3></div>
          {selectedTrip && <span className={`dashboard-status dashboard-status--${selectedTrip.trip.status}`}>{titleCase(selectedTrip.trip.status)}</span>}
        </div>
        {selectedTrip ? (
          <div className="fleet-trip-detail-grid">
            <div className="fleet-route-map" aria-label="Route map placeholder">
              <div className="fleet-map-grid" aria-hidden="true" />
              <span className="fleet-map-marker fleet-map-marker--start" />
              <span className="fleet-map-marker fleet-map-marker--end" />
              <div className="fleet-map-route">
                <strong>{selectedTrip.trip.route}</strong>
                <span>Illustrative route · map provider not connected</span>
                <span>GPS status: {titleCase(selectedTrip.trip.gpsStatus)}</span>
              </div>
              <span className="fleet-map-tag">MAP DEMO</span>
            </div>
            <div className="fleet-trip-facts">
              <FleetFact label="Job / container" value={`${selectedTrip.trip.jobNo} · ${selectedTrip.trip.containerNo}`} onClick={() => onOpenJob(selectedTrip.trip.jobNo)} />
              <FleetFact label="Driver / trailer" value={`${driver?.name ?? 'Not assigned'} · ${trailer?.registrationNo ?? 'Not assigned'}`} />
              <FleetFact label="Scheduled / delivery" value={`${formatDate(selectedTrip.trip.scheduledDate)} · ${formatDate(selectedTrip.trip.deliveryDate)}`} />
              <FleetFact label="Proof of delivery" value={titleCase(selectedTrip.trip.podStatus)} />
            </div>
            <div className="fleet-milestone-panel">
              <h4>Trip milestones</h4>
              {tripMilestones.length ? (
                <ol className="fleet-milestones">
                  {tripMilestones.map((milestone) => (
                    <li className={`fleet-milestone fleet-milestone--${milestone.status}`} key={milestone.id}>
                      <span className="fleet-milestone-marker" />
                      <span><strong>{milestone.title}</strong><small>{titleCase(milestone.status)} · {formatDate(milestone.occurredAt)}</small></span>
                    </li>
                  ))}
                </ol>
              ) : <p className="fleet-empty">No trip milestones are recorded.</p>}
            </div>
            <div className="fleet-expense-panel">
              <h4>Illustrative trip economics</h4>
              {tripCharges.length ? (
                <>
                  {tripCharges.map((charge) => (
                    <div className="fleet-equation-line" key={charge.id}><span>Trip billing · {charge.description}</span><strong>{money.format(charge.amountRM)}</strong></div>
                  ))}
                  {customCosts.length ? customCosts.map((cost) => (
                    <div className="fleet-equation-line" key={cost.id}><span>{titleCase(cost.category)} · {titleCase(cost.costType)}</span><strong>− {money.format(cost.amountRM)}</strong></div>
                  )) : <p className="fleet-empty">No supplier cost is linked to this trip.</p>}
                  <div className="fleet-equation-total"><span>Actual trip margin</span><strong>{money.format(selectedTrip.actualProfitRM)}</strong></div>
                  {selectedTrip.estimatedCostRM > 0 && <div className="fleet-equation-line"><span>Estimated cost · projected margin {money.format(selectedTrip.projectedProfitRM)}</span><strong>{money.format(selectedTrip.estimatedCostRM)}</strong></div>}
                </>
              ) : <p className="fleet-empty">No trip-linked billing record; no revenue is assumed.</p>}
              <p className="fleet-demo-caption">Illustrative values only · not an accounting posting.</p>
            </div>
          </div>
        ) : <p className="fleet-empty">Select a vehicle with an assigned trip to review route and cargo details.</p>}
      </section>

      <div className="fleet-support-grid">
        <section className="fleet-support-card">
          <div className="fleet-support-heading"><div><span className="section-eyebrow">VEHICLE COMPLIANCE</span><h3>Road tax & insurance reminders</h3></div><span>{complianceReminders.length} due within 30 days</span></div>
          {complianceReminders.length ? (
            <ul className="fleet-reminder-list">{complianceReminders.map((reminder) => (
              <li key={`${reminder.truck.id}-${reminder.type}`}><span className="fleet-reminder-icon">!</span><span><strong>{reminder.truck.registrationNo} · {reminder.type}</strong><small>Expires {formatDate(reminder.expiryDate)}</small></span><b>{reminder.daysRemaining} days</b></li>
            ))}</ul>
          ) : <p className="fleet-empty">No compliance reminders due within 30 days.</p>}
        </section>
        <section className="fleet-support-card">
          <div className="fleet-support-heading"><div><span className="section-eyebrow">ASSIGNMENT STATUS</span><h3>Selected truck status</h3></div><span className={`dashboard-status dashboard-status--${fleetView.truck.status}`}>{titleCase(fleetView.truck.status)}</span></div>
          <div className="fleet-capacity-row"><span>Selected trip weight</span><strong>{fleetView.occupiedWeightKg.toLocaleString()} / {fleetView.truck.capacityKg.toLocaleString()} kg</strong></div>
          <div className={`department-bar-track${fleetView.occupiedWeightKg > fleetView.truck.capacityKg ? ' fleet-capacity-over' : ''}`}><span style={{ width: `${Math.min(100, fleetView.occupiedWeightKg / Math.max(fleetView.truck.capacityKg, 1) * 100)}%` }} /></div>
          <div className="fleet-capacity-row"><span>Selected trip volume</span><strong>{fleetView.occupiedVolumeCBM} / {fleetView.truck.capacityCBM} CBM</strong></div>
          <div className="department-bar-track"><span style={{ width: `${Math.min(100, fleetView.occupiedVolumeCBM / Math.max(fleetView.truck.capacityCBM, 1) * 100)}%` }} /></div>
          {fleetView.occupiedWeightKg > fleetView.truck.capacityKg && <p className="fleet-capacity-alert">Assigned cargo exceeds the listed weight capacity. Review the illustrative trip assignment before dispatch.</p>}
          <p className="fleet-demo-caption">Assignments from shared trip records · capacities are indicative only.</p>
        </section>
      </div>
      <p className="dashboard-demo-note"><span className="status-dot status-dot--amber" />Demo Data · GPS, live maps, telematics, camera and telephony are not connected.</p>
    </div>
  )
}

function FleetMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="fleet-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
}

function FleetFact({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const content = <><span>{label}</span><strong>{value}</strong></>
  return onClick ? <button className="fleet-fact fleet-fact--link" type="button" onClick={onClick}>{content}<span className="fleet-fact-arrow">→</span></button> : <div className="fleet-fact">{content}</div>
}
