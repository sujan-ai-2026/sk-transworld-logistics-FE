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

  return (
    <div className="truck-visualization">
      <div className="truck-visualization-heading">
        <div>
          <span className="section-eyebrow">VEHICLE + CARGO BAY</span>
          <h2>{fleetView.truck.registrationNo} · {fleetView.truck.makeModel}</h2>
        </div>
        <span className="fleet-demo-badge">Illustrative assignment</span>
      </div>
      <div className="truck-svg-wrap">
        <svg
          aria-label={`Side view of a blue SK Transworld tractor trailer, registration ${fleetView.truck.registrationNo}`}
          className="truck-side-svg"
          role="img"
          viewBox="0 0 960 360"
        >
          <defs>
            <linearGradient id="trailerGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#eef3fb" />
            </linearGradient>
            <linearGradient id="cabGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#5a9aff" />
              <stop offset="1" stopColor="#2872df" />
            </linearGradient>
            <linearGradient id="chassisGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#51647f" />
              <stop offset="1" stopColor="#2f3c51" />
            </linearGradient>
          </defs>
          <ellipse cx="474" cy="301" rx="422" ry="19" fill="#dfe7f2" />
          <path d="M66 74a16 16 0 0 1 16-16h536v194H66V74Z" fill="url(#trailerGradient)" stroke="#b8c6d9" strokeWidth="3" />
          <path d="M75 66h532" stroke="#3783ff" strokeWidth="7" strokeLinecap="round" />
          <path d="M600 70v180" stroke="#d8e0ec" strokeWidth="3" />
          <path d="M610 255h181" stroke="url(#chassisGradient)" strokeWidth="17" strokeLinecap="round" />
          <path d="M780 256h68v-44h44l48 46v42H780v-44Z" fill="url(#cabGradient)" stroke="#286bcb" strokeWidth="3" />
          <path d="M850 222h34l34 34h-68v-34Z" fill="#dbeeff" stroke="#b8d7f6" strokeWidth="3" />
          <path d="M930 260h18v27h-18" fill="#efb54a" />
          <path d="M800 270h25" stroke="#eaf3ff" strokeWidth="4" strokeLinecap="round" />
          <rect x="628" y="243" width="57" height="9" rx="4" fill="#52647d" />
          <rect x="695" y="244" width="37" height="11" rx="4" fill="#52647d" />
          <path d="M68 269h713" stroke="#37465c" strokeWidth="12" strokeLinecap="round" />
          <path d="M80 281h700" stroke="#98a7bb" strokeWidth="3" strokeDasharray="9 9" />
          <circle cx="142" cy="285" r="36" fill="#293448" />
          <circle cx="142" cy="285" r="18" fill="#e1e8f1" stroke="#8797ac" strokeWidth="6" />
          <circle cx="514" cy="285" r="36" fill="#293448" />
          <circle cx="514" cy="285" r="18" fill="#e1e8f1" stroke="#8797ac" strokeWidth="6" />
          <circle cx="690" cy="285" r="36" fill="#293448" />
          <circle cx="690" cy="285" r="18" fill="#e1e8f1" stroke="#8797ac" strokeWidth="6" />
          <circle cx="821" cy="292" r="34" fill="#293448" />
          <circle cx="821" cy="292" r="17" fill="#e1e8f1" stroke="#8797ac" strokeWidth="6" />
          <circle cx="920" cy="292" r="34" fill="#293448" />
          <circle cx="920" cy="292" r="17" fill="#e1e8f1" stroke="#8797ac" strokeWidth="6" />
          <rect x="801" y="296" width="142" height="7" rx="3" fill="#efb54a" />
          <text x="92" y="91" fill="#718198" fontSize="12" fontWeight="700" letterSpacing="3">SK TRANSWORLD · LOGISTICS · MALAYSIA</text>
          <text x="809" y="278" fill="#ffffff" fontSize="12" fontWeight="700">SK</text>
          {cargoBays.map((bay, index) => {
            const assignment = assignments[index]
            const active = assignment?.trip.id === selectedTripId
            const x = 88 + index * 125
            return (
              <g
                aria-label={assignment ? `Cargo slot ${bay}, ${assignment.trip.containerNo}, Job ${assignment.trip.jobNo}` : `Cargo slot ${bay}, empty`}
                className={`truck-svg-bay${assignment ? ' truck-svg-bay--occupied' : ''}${active ? ' truck-svg-bay--selected' : ''}`}
                key={bay}
                onClick={() => assignment && onSelectTrip(assignment.trip.id)}
                onKeyDown={(event) => {
                  if (assignment && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    onSelectTrip(assignment.trip.id)
                  }
                }}
                role={assignment ? 'button' : undefined}
                tabIndex={assignment ? 0 : undefined}
              >
                <rect x={x} y="121" width="110" height="116" rx="9" />
                <text x={x + 55} y="144" textAnchor="middle" className="truck-svg-bay-label">{`BAY ${bay}`}</text>
                <text x={x + 55} y="170" textAnchor="middle" className="truck-svg-bay-content">
                  {assignment ? assignment.trip.containerNo : 'EMPTY'}
                </text>
                <text x={x + 55} y="192" textAnchor="middle" className="truck-svg-bay-content">
                  {assignment ? assignment.trip.jobNo : 'AVAILABLE'}
                </text>
                <text x={x + 55} y="216" textAnchor="middle" className="truck-svg-bay-weight">
                  {assignment ? `${assignment.weightKg.toLocaleString()} kg · ${assignment.containerSize}` : '—'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
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
