import { useEffect, useRef, useState } from 'react'
import truckImage from '../assets/cargo_Truck.png'
import type { DemoDataset } from '../data/model.js'
import type { TruckFleetView } from '../data/fleet.js'

interface TruckCargoVisualizationProps {
  dataset: DemoDataset
  fleetView: TruckFleetView
  selectedTripId: string | null
  onSelectTrip: (tripId: string | null) => void
  onOpenJob: (jobNo: string) => void
}

const cargoBays = ['A', 'B', 'C', 'D']

export function TruckCargoVisualization({
  dataset,
  fleetView,
  selectedTripId,
  onSelectTrip,
  onOpenJob,
}: TruckCargoVisualizationProps) {
  const assignments = fleetView.trips
    .filter((assignment) => assignment.trip.id === selectedTripId)
    .slice(0, 1)
  const visualizationRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isInView, setIsInView] = useState(true)
  const [motionAllowed, setMotionAllowed] = useState(false)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => setMotionAllowed(!reducedMotion.matches)
    updateMotionPreference()
    reducedMotion.addEventListener('change', updateMotionPreference)

    const element = visualizationRef.current
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver((entries) => setIsInView(entries[0]?.isIntersecting ?? false), { threshold: 0.1 })
    if (element && observer) observer.observe(element)

    return () => {
      reducedMotion.removeEventListener('change', updateMotionPreference)
      observer?.disconnect()
    }
  }, [])

  const isMotionActive = isPlaying && isInView && motionAllowed

  return (
    <div className="truck-visualization" ref={visualizationRef}>
      <div className="truck-visualization-heading">
        <div>
          <span className="section-eyebrow">VEHICLE + CARGO BAY</span>
          <h2>{fleetView.truck.registrationNo} · {fleetView.truck.makeModel}</h2>
        </div>
        <div className="truck-visualization-actions">
          <button
            aria-label={motionAllowed ? `${isPlaying ? 'Pause' : 'Play'} truck animation` : 'Truck animation reduced by motion preference'}
            aria-pressed={isPlaying && motionAllowed}
            className="truck-motion-toggle"
            disabled={!motionAllowed}
            onClick={() => setIsPlaying((playing) => !playing)}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16">
              {isPlaying
                ? <><path d="M5 3.5v9M11 3.5v9" /></>
                : <path d="m5 3.5 7 4.5-7 4.5z" />}
            </svg>
            <span>{motionAllowed ? (isPlaying ? 'Pause motion' : 'Play motion') : 'Motion reduced'}</span>
          </button>
          <span className="fleet-demo-badge">Illustrative assignment</span>
        </div>
      </div>
      <div className="truck-image-stage" data-motion-active={isMotionActive}>
        <div className="truck-image-motion">
          <img
            alt="Illustrative SK Transworld tractor-trailer; operational status is shown separately."
            className="truck-image"
            src={truckImage}
          />
          {cargoBays.map((bay, index) => {
            const assignment = assignments[index]
            const selected = assignment?.trip.id === selectedTripId
            return (
              <button
                aria-label={assignment ? `Cargo slot ${bay}: ${assignment.trip.containerNo}, ${assignment.trip.jobNo}, ${assignment.weightKg.toLocaleString()} kilograms` : `Cargo slot ${bay}: empty`}
                aria-pressed={Boolean(selected)}
                className={`truck-image-bay${assignment ? ' truck-image-bay--occupied' : ''}${selected ? ' truck-image-bay--selected' : ''}`}
                disabled={!assignment}
                key={bay}
                onClick={() => assignment && onSelectTrip(assignment.trip.id)}
                style={{ left: `${9.3 + index * 14.6}%` }}
                type="button"
              >
                <span className="truck-image-bay-heading">
                  <strong>BAY {bay}</strong>
                  <span>{assignment ? 'OCCUPIED' : 'EMPTY'}</span>
                </span>
                <span className="truck-image-bay-content">
                  {assignment ? assignment.trip.containerNo : 'AVAILABLE'}
                </span>
                <span className="truck-image-bay-content">
                  {assignment ? assignment.trip.jobNo : '—'}
                </span>
                <span className="truck-image-bay-weight">
                  {assignment ? `${assignment.weightKg.toLocaleString()} kg · ${assignment.containerSize}` : '—'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      {/* <div className="logistics-animation-callout truck-cargo-illustration">
        <LogisticsAnimation name="truckLoading" width={98} height={62} />
        <span className="logistics-animation-copy"><strong>Cargo handling illustration</strong><small>Static demo visual · separate from the selected trip status.</small></span>
      </div> */}
      <div className="truck-legend">
        <span><i className="truck-legend-dot truck-legend-dot--occupied" />Occupied assignment</span>
        <span><i className="truck-legend-dot truck-legend-dot--empty" />Available bay</span>
        <span><i className="truck-legend-dot truck-legend-dot--selected" />Selected trip</span>
      </div>
      <div className="cargo-slot-grid" aria-label="Cargo bay assignments">
        {cargoBays.map((bay, index) => {
          const assignment = assignments[index]
          const selected = assignment?.trip.id === selectedTripId
          return (
            <button
              aria-label={assignment ? `Cargo slot ${bay}: ${assignment.trip.containerNo}, ${assignment.trip.jobNo}, ${assignment.weightKg.toLocaleString()} kilograms` : `Cargo slot ${bay}: empty`}
              aria-pressed={Boolean(selected)}
              className={`cargo-slot${assignment ? ' cargo-slot--occupied' : ''}${selected ? ' cargo-slot--selected' : ''}`}
              disabled={!assignment}
              key={bay}
              onClick={() => assignment && onSelectTrip(assignment.trip.id)}
              type="button"
            >
              <span className="cargo-slot-heading"><strong>BAY {bay}</strong><span>{assignment ? 'OCCUPIED' : 'EMPTY'}</span></span>
              <span className="cargo-slot-reference">{assignment ? assignment.trip.containerNo : 'Available bay'}</span>
              <span className="cargo-slot-job">{assignment ? `${assignment.trip.jobNo} · ${assignment.weightKg.toLocaleString()} kg` : 'No cargo assigned'}</span>
            </button>
          )
        })}
      </div>
      {selectedTripId && (() => {
        const trip = dataset.trips.find((record) => record.id === selectedTripId)
        return trip ? (
          <button className="truck-selected-job" type="button" onClick={() => onOpenJob(trip.jobNo)}>
            <span><small>SELECTED CARGO · JOB NO.</small><strong>{trip.jobNo} · {trip.containerNo}</strong></span>
            <span>Open linked job <span aria-hidden="true">→</span></span>
          </button>
        ) : null
      })()}
    </div>
  )
}
