import { useMemo, useState, type FormEvent } from 'react'
import {
  DEFAULT_STORAGE_BILLING_POLICY,
  calculateStorageChargePreview,
  createStockAdjustment,
  createStorageChargeSuggestion,
  getInventoryBalances,
  type StorageBillingPolicy,
} from '../data/warehouse.js'
import type {
  ChargeSuggestion,
  DemoDataset,
  StockMovement,
  WarehouseActivity,
} from '../data/model.js'

interface WarehouseWorkspaceProps {
  dataset: DemoDataset
  onOpenJob: (jobNo: string) => void
  onUpdateActivity: (activityId: string, status: WarehouseActivity['status']) => void
  onAddStockAdjustment: (movement: StockMovement) => void
  onCreateStorageCharge: (charge: ChargeSuggestion) => void
  onUpdateStorageCharge: (chargeId: string, status: ChargeSuggestion['status']) => void
}

type WarehouseTab = 'inventory' | 'storage'

function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${date}T00:00:00`))
}

function money(amount: number, decimalPlaces: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(amount)
}

const warehouseActivities: WarehouseActivity['type'][] = [
  'receiving', 'unloading', 'palletisation', 'labelling', 'storage', 'handling',
  'picking', 'packing', 'loading', 'dispatch', 'pod',
]

export function WarehouseWorkspace({
  dataset,
  onOpenJob,
  onUpdateActivity,
  onAddStockAdjustment,
  onCreateStorageCharge,
  onUpdateStorageCharge,
}: WarehouseWorkspaceProps) {
  const [tab, setTab] = useState<WarehouseTab>('inventory')
  const [query, setQuery] = useState('')
  const [selectedReceiptId, setSelectedReceiptId] = useState(dataset.warehouseReceipts[0]?.id ?? '')
  const [policy, setPolicy] = useState<StorageBillingPolicy>(DEFAULT_STORAGE_BILLING_POLICY)
  const [periodEnd, setPeriodEnd] = useState(dataset.metadata.asOfDate)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentError, setAdjustmentError] = useState('')
  const [storageAdjustmentAmount, setStorageAdjustmentAmount] = useState('')
  const [storageAdjustmentReason, setStorageAdjustmentReason] = useState('')
  const [storageError, setStorageError] = useState('')
  const balances = useMemo(() => getInventoryBalances(dataset), [dataset])
  const matchingBalances = balances.filter((balance) => {
    const text = [
      balance.receipt.jobNo,
      balance.receipt.containerNo,
      balance.receipt.grnNo,
      balance.receipt.location,
      balance.sku,
      balance.description,
      ...balance.batchLots,
      ...balance.locations,
    ].join(' ').toLowerCase()
    return text.includes(query.trim().toLowerCase())
  })
  const matchingReceipts = dataset.warehouseReceipts.filter((receipt) => {
    const job = dataset.jobs.find((record) => record.jobNo === receipt.jobNo)
    const customerRecord = job
      ? dataset.customers.find((record) => record.id === job.customerId)
      : undefined
    const stockReferences = dataset.stockMovements
      .filter((movement) => movement.receiptId === receipt.id)
      .flatMap((movement) => [
        movement.sku,
        movement.description,
        movement.binLocation,
        movement.batchLot,
        movement.evidenceReference,
      ])
    return [
      receipt.jobNo,
      receipt.containerNo,
      receipt.grnNo,
      receipt.location,
      customerRecord?.name,
      ...stockReferences,
    ].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())
  })
  const activeReceiptId = matchingReceipts.some((receipt) => receipt.id === selectedReceiptId)
    ? selectedReceiptId
    : matchingReceipts[0]?.id ?? ''
  const selectedReceipt = dataset.warehouseReceipts.find((receipt) => receipt.id === activeReceiptId)
  const selectedJob = selectedReceipt
    ? dataset.jobs.find((job) => job.jobNo === selectedReceipt.jobNo)
    : undefined
  const selectedContainer = selectedReceipt
    ? dataset.containers.find((container) => container.containerNo === selectedReceipt.containerNo)
    : undefined
  const customer = selectedJob
    ? dataset.customers.find((record) => record.id === selectedJob.customerId)
    : undefined
  const selectedRate = customer
    ? dataset.storageRates.find((rate) => rate.customerId === customer.id)
    : undefined
  const preview = selectedReceipt && selectedRate
    ? calculateStorageChargePreview(dataset, selectedReceipt.id, policy, periodEnd)
    : undefined
  const storageChargeExists = preview
    ? dataset.charges.some((charge) => charge.sourceEventId === preview.sourceEventId)
    : false
  const activities = selectedReceipt
    ? warehouseActivities.map((type) =>
        dataset.warehouseActivities.find(
          (activity) => activity.receiptId === selectedReceipt.id && activity.type === type,
        ),
      ).filter((activity): activity is WarehouseActivity => Boolean(activity))
    : []
  const storageCharges = dataset.charges
    .filter((charge) => charge.department === 'warehouse' && charge.sourceEventId.startsWith('storage:'))
    .sort((a, b) => a.sourceEventId.localeCompare(b.sourceEventId))
  const visibleStorageCharges = storageCharges.filter((charge) => {
    const chargeReceipt = dataset.warehouseReceipts.find((record) => record.id === charge.sourceEventId.split(':')[1])
    return [
      charge.jobNo,
      charge.description,
      charge.sourceEventId,
      chargeReceipt?.containerNo,
      chargeReceipt?.grnNo,
    ].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase())
  })
  const inventoryUnits = [...new Set(matchingBalances.map((balance) => balance.unit))]
  const totalStockLines = matchingBalances.length

  function updatePolicy<Key extends keyof StorageBillingPolicy>(
    key: Key,
    value: StorageBillingPolicy[Key],
  ) {
    setPolicy((current) => ({ ...current, [key]: value }))
  }

  function handleAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedReceipt) return
    const formData = new FormData(event.currentTarget)
    try {
      const movement = createStockAdjustment({
        id: `STK-ADJ-${Date.now()}`,
        jobNo: selectedReceipt.jobNo,
        receiptId: selectedReceipt.id,
        sku: String(formData.get('sku') ?? ''),
        description: String(formData.get('description') ?? ''),
        quantity: Number(formData.get('quantity')),
        unit: formData.get('unit') === 'pallet' ? 'pallet' : 'carton',
        occurredAt: dataset.metadata.asOfDate,
        discrepancyType: formData.get('discrepancyType') as NonNullable<StockMovement['discrepancyType']>,
        reason: String(formData.get('reason') ?? ''),
        evidenceReference: String(formData.get('evidenceReference') ?? ''),
        binLocation: String(formData.get('binLocation') ?? ''),
        batchLot: String(formData.get('batchLot') ?? ''),
        expiryDate: String(formData.get('expiryDate') ?? '') || undefined,
      })
      onAddStockAdjustment(movement)
      setAdjustmentOpen(false)
      event.currentTarget.reset()
    } catch (error) {
      setAdjustmentError(error instanceof Error ? error.message : 'Unable to record the stock adjustment.')
    }
  }

  function addStorageCharge() {
    if (!preview) return
    try {
      const amountRM = storageAdjustmentAmount === ''
        ? undefined
        : Number(storageAdjustmentAmount)
      const charge = createStorageChargeSuggestion(
        preview,
        dataset.charges,
        {
          ...(amountRM === undefined ? {} : { amountRM }),
          ...(storageAdjustmentReason ? { reason: storageAdjustmentReason } : {}),
        },
      )
      onCreateStorageCharge(charge)
      setStorageError('')
      setStorageAdjustmentAmount('')
      setStorageAdjustmentReason('')
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to create the storage charge.')
    }
  }

  return (
    <div className="warehouse-workspace">
      {/* <div className="logistics-intro">
        <div>
          <span className="section-eyebrow">WAREHOUSE + STOCK CONTROL</span>
          <h2>Warehouse, inventory & storage billing</h2>
          <p>Inbound, stock ledger, handling, dispatch and explainable storage charge previews linked to shared Jobs.</p>
        </div>
        <span className="status-badge status-badge--blue">{dataset.metadata.label}</span>
      </div> */}

      <div className="logistics-tabs" role="tablist" aria-label="Warehouse workspace">
        <button aria-selected={tab === 'inventory'} className={tab === 'inventory' ? 'logistics-tab logistics-tab--active' : 'logistics-tab'} onClick={() => setTab('inventory')} role="tab" type="button">Inventory & handling</button>
        <button aria-selected={tab === 'storage'} className={tab === 'storage' ? 'logistics-tab logistics-tab--active' : 'logistics-tab'} onClick={() => setTab('storage')} role="tab" type="button">Storage billing <span>{storageCharges.length}</span></button>
      </div>

      <section className="logistics-filter-card warehouse-filter-card" aria-label="Warehouse search">
        <label className="logistics-search"><span>Search warehouse records</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Job No., customer, container, GRN, SKU, location…" type="search" value={query} /></label>
        <label><span>Receipt / container</span><select onChange={(event) => setSelectedReceiptId(event.target.value)} value={activeReceiptId}>{matchingReceipts.map((receipt) => <option key={receipt.id} value={receipt.id}>{receipt.jobNo} · {receipt.containerNo}</option>)}</select></label>
        <span className="warehouse-search-count">{totalStockLines} inventory lines · {inventoryUnits.join(' / ') || 'No units'} · {visibleStorageCharges.length} storage charges</span>
      </section>

      {tab === 'inventory' ? (
        <InventoryWorkspace
          activities={activities}
          balances={matchingBalances.filter((balance) => balance.receipt.id === selectedReceiptId)}
          dataset={dataset}
          onAddAdjustment={() => { setAdjustmentError(''); setAdjustmentOpen(true) }}
          onOpenJob={onOpenJob}
          onUpdateActivity={onUpdateActivity}
          receipt={selectedReceipt}
          selectedContainer={selectedContainer}
          selectedJob={selectedJob}
          submitAdjustment={handleAdjustment}
          adjustmentOpen={adjustmentOpen}
          adjustmentError={adjustmentError}
          onCloseAdjustment={() => setAdjustmentOpen(false)}
        />
      ) : (
        <StorageWorkspace
          charges={visibleStorageCharges}
          dataset={dataset}
          onAddCharge={addStorageCharge}
          onOpenJob={onOpenJob}
          onUpdateCharge={onUpdateStorageCharge}
          periodEnd={periodEnd}
          policy={policy}
          preview={preview}
          receipt={selectedReceipt}
          selectedJob={selectedJob}
          selectedRate={selectedRate}
          setPeriodEnd={setPeriodEnd}
          setStorageAdjustmentAmount={setStorageAdjustmentAmount}
          setStorageAdjustmentReason={setStorageAdjustmentReason}
          storageAdjustmentAmount={storageAdjustmentAmount}
          storageAdjustmentReason={storageAdjustmentReason}
          storageChargeExists={storageChargeExists}
          storageError={storageError}
          updatePolicy={updatePolicy}
        />
      )}
      <p className="logistics-demo-note"><span className="status-dot status-dot--amber" />Illustrative demo data · storage sample rates and policies are pending business confirmation; no warehouse system or accounting posting is connected.</p>
    </div>
  )
}

function InventoryWorkspace({
  activities,
  balances,
  dataset,
  onAddAdjustment,
  onOpenJob,
  onUpdateActivity,
  receipt,
  selectedContainer,
  selectedJob,
  submitAdjustment,
  adjustmentOpen,
  adjustmentError,
  onCloseAdjustment,
}: {
  activities: WarehouseActivity[]
  balances: ReturnType<typeof getInventoryBalances>
  dataset: DemoDataset
  onAddAdjustment: () => void
  onOpenJob: (jobNo: string) => void
  onUpdateActivity: WarehouseWorkspaceProps['onUpdateActivity']
  receipt: DemoDataset['warehouseReceipts'][number] | undefined
  selectedContainer: DemoDataset['containers'][number] | undefined
  selectedJob: DemoDataset['jobs'][number] | undefined
  submitAdjustment: (event: FormEvent<HTMLFormElement>) => void
  adjustmentOpen: boolean
  adjustmentError: string
  onCloseAdjustment: () => void
}) {
  const adjustmentMovements = receipt
    ? dataset.stockMovements.filter((movement) => movement.receiptId === receipt.id && movement.direction === 'adjustment')
    : []
  const receiptDocuments = receipt
    ? dataset.documents.filter((document) => document.jobNo === receipt.jobNo && document.containerNo === receipt.containerNo)
    : []
  const damageEvidence = receiptDocuments.filter((document) => document.type === 'photo' || document.type === 'correspondence')

  return (
    <div className="warehouse-content-grid">
      <section className="warehouse-inventory-card">
        {receipt && selectedJob ? (
          <>
            <div className="warehouse-record-heading">
              <div><span className="section-eyebrow">INBOUND RECEIPT · {receipt.grnNo}</span><h3>{receipt.containerNo}</h3><span>{receipt.jobNo} · {selectedJob.description}</span></div>
              <div className="warehouse-heading-actions"><span className={`logistics-status logistics-status--${receipt.status}`}>{label(receipt.status)}</span><button className="dashboard-text-link" onClick={() => onOpenJob(receipt.jobNo)} type="button">Open Job →</button></div>
            </div>
            <div className="logistics-detail-grid">
              <WarehouseFact label="Received / unloading date" value={formatDate(receipt.receivedDate)} />
              <WarehouseFact label="Cargo count" value={`${receipt.cartons.toLocaleString()} cartons · ${receipt.pallets} pallets`} />
              <WarehouseFact label="Volume / gross weight" value={`${receipt.volumeCBM} CBM · ${receipt.weightKg.toLocaleString()} kg`} />
              <WarehouseFact label="Warehouse / bin / rack" value={receipt.location} />
              <WarehouseFact label="Container size / status" value={`${selectedContainer?.sizeType ?? 'Not recorded'} · ${label(selectedContainer?.status ?? 'unknown')}`} />
              <WarehouseFact label="Receiving evidence" value={damageEvidence.length ? damageEvidence.map((document) => `${document.type} · ${document.fileName ?? label(document.status)}`).join('; ') : 'Damage/shortage evidence not recorded'} warning={!damageEvidence.length} />
            </div>

            <div className="warehouse-inbound-outbound-grid">
              <section className="logistics-subsection">
                <div className="logistics-subsection-heading"><div><h4>Inbound · receiving to put-away</h4><small>Record actual handling progress; updates remain local to the demo.</small></div><span>{activities.filter((activity) => ['receiving', 'unloading', 'palletisation', 'labelling', 'storage'].includes(activity.type)).length}</span></div>
                <ActivityList activities={activities.filter((activity) => ['receiving', 'unloading', 'palletisation', 'labelling', 'storage'].includes(activity.type))} onUpdate={onUpdateActivity} owner={selectedJob.owner} />
              </section>
              <section className="logistics-subsection">
                <div className="logistics-subsection-heading"><div><h4>Outbound · pick, pack & dispatch</h4><small>Dispatch and POD remain separate recorded activities.</small></div><span>{activities.filter((activity) => ['handling', 'picking', 'packing', 'loading', 'dispatch', 'delivery', 'pod'].includes(activity.type)).length}</span></div>
                <ActivityList activities={activities.filter((activity) => ['handling', 'picking', 'packing', 'loading', 'dispatch', 'delivery', 'pod'].includes(activity.type))} onUpdate={onUpdateActivity} owner={selectedJob.owner} />
              </section>
            </div>

            <section className="logistics-subsection">
              <div className="logistics-subsection-heading"><div><h4>Stock ledger · SKU and balance</h4><small>Running stock is derived from receipt, dispatch and separate adjustment movements.</small></div><button className="logistics-reset" onClick={onAddAdjustment} type="button">+ Record adjustment</button></div>
              {balances.length ? <div className="warehouse-table-wrap"><table className="warehouse-table"><thead><tr><th>SKU / description</th><th>On hand</th><th>Batch / lot</th><th>Bin / rack</th><th>Expiry</th></tr></thead><tbody>{balances.map((balance) => <tr key={`${balance.receipt.id}-${balance.sku}-${balance.unit}`}><td><strong>{balance.sku}</strong><small>{balance.description}</small></td><td>{balance.quantity.toLocaleString()} {label(balance.unit)}s</td><td>{balance.batchLots.join(', ') || 'Not recorded'}</td><td>{balance.locations.join(', ') || balance.receipt.location}</td><td>{balance.movements.map((movement) => movement.expiryDate).filter(Boolean).join(', ') || 'Not recorded'}</td></tr>)}</tbody></table></div> : <p className="logistics-empty">No stock movements are recorded for this receipt.</p>}
              <div className="warehouse-ledger-history">{dataset.stockMovements.filter((movement) => movement.receiptId === receipt.id).map((movement) => <div className="warehouse-ledger-row" key={movement.id}><span className={`warehouse-direction warehouse-direction--${movement.direction}`}>{movement.direction === 'in' ? '+' : movement.direction === 'out' ? '−' : '±'}</span><span><strong>{movement.sku} · {movement.description}</strong><small>{label(movement.direction)} · {movement.occurredAt} · {movement.reason ?? 'Stock receipt / dispatch'}</small>{movement.evidenceReference && <small>Evidence reference: {movement.evidenceReference}</small>}</span><b>{movement.quantity > 0 && movement.direction !== 'in' ? movement.quantity : movement.quantity} {label(movement.unit)}s</b></div>)}</div>
              {adjustmentMovements.length > 0 && <p className="warehouse-adjustment-note">Adjustments remain separate ledger entries; original receipt and dispatch quantities are preserved.</p>}
            </section>
            {adjustmentOpen && (
              <StockAdjustmentForm
                balances={balances}
                error={adjustmentError}
                onCancel={onCloseAdjustment}
                onSubmit={submitAdjustment}
              />
            )}
          </>
        ) : <p className="logistics-empty logistics-empty--detail">{dataset.warehouseReceipts.length ? 'Select a receipt to review inventory and handling.' : 'No warehouse receipts are recorded yet.'}</p>}
      </section>
    </div>
  )
}

function ActivityList({ activities, onUpdate, owner }: { activities: WarehouseActivity[]; onUpdate: WarehouseWorkspaceProps['onUpdateActivity']; owner: string }) {
  return activities.length ? <ol className="warehouse-activity-list">{activities.map((activity) => <li className={`warehouse-activity warehouse-activity--${activity.status}`} key={activity.id}><span className="warehouse-activity-dot" /><span className="warehouse-activity-copy"><strong>{label(activity.type)}</strong><small>{label(activity.status)} · {formatDate(activity.scheduledDate)} · Owner: {owner}</small></span>{activity.status !== 'completed' && <select aria-label={`Update ${label(activity.type)} status`} onChange={(event) => onUpdate(activity.id, event.target.value as WarehouseActivity['status'])} value={activity.status}><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>}</li>)}</ol> : <p className="logistics-empty">No activity records in this workflow stage.</p>
}

function StockAdjustmentForm({
  balances,
  error,
  onCancel,
  onSubmit,
}: {
  balances: ReturnType<typeof getInventoryBalances>
  error: string
  onCancel: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const firstBalance = balances[0]
  return (
    <div className="warehouse-modal-backdrop">
      <form className="warehouse-adjustment-form" onSubmit={onSubmit}>
        <div className="warehouse-record-heading"><div><span className="section-eyebrow">APPEND-ONLY STOCK LEDGER</span><h3>Record stock discrepancy</h3></div><button aria-label="Close adjustment form" className="warehouse-close" onClick={onCancel} type="button">×</button></div>
        <p className="warehouse-adjustment-note">A new adjustment movement is appended; existing stock entries are never overwritten. Use a negative quantity to reduce stock.</p>
        {error && <p className="warehouse-form-error" role="alert">{error}</p>}
        <div className="warehouse-form-grid">
          <label>SKU<input defaultValue={firstBalance?.sku ?? ''} name="sku" required /></label>
          <label>Description<input defaultValue={firstBalance?.description ?? ''} name="description" required /></label>
          <label>Adjustment quantity (signed)<input name="quantity" required step="any" type="number" /></label>
          <label>Unit<select defaultValue={firstBalance?.unit ?? 'carton'} name="unit"><option value="carton">Carton</option><option value="pallet">Pallet</option></select></label>
          <label>Discrepancy type<select defaultValue="damage" name="discrepancyType"><option value="damage">Damage</option><option value="shortage">Shortage</option><option value="overage">Overage</option><option value="correction">Correction</option></select></label>
          <label>Evidence reference<input name="evidenceReference" placeholder="Required for damage/shortage" /></label>
          <label>Batch / lot<input name="batchLot" placeholder="Optional" /></label>
          <label>Bin / rack<input name="binLocation" placeholder="Optional" /></label>
          <label>Expiry date<input name="expiryDate" type="date" /></label>
          <label className="warehouse-form-wide">Reason<textarea name="reason" placeholder="Describe the discrepancy and evidence reviewed" required rows={2} /></label>
        </div>
        <div className="warehouse-form-actions"><button className="logistics-reset" onClick={onCancel} type="button">Cancel</button><button className="job-primary-button" type="submit">Append adjustment</button></div>
      </form>
    </div>
  )
}

function StorageWorkspace({
  charges,
  dataset,
  onAddCharge,
  onOpenJob,
  onUpdateCharge,
  periodEnd,
  policy,
  preview,
  receipt,
  selectedJob,
  selectedRate,
  setPeriodEnd,
  setStorageAdjustmentAmount,
  setStorageAdjustmentReason,
  storageAdjustmentAmount,
  storageAdjustmentReason,
  storageChargeExists,
  storageError,
  updatePolicy,
}: {
  charges: ChargeSuggestion[]
  dataset: DemoDataset
  onAddCharge: () => void
  onOpenJob: (jobNo: string) => void
  onUpdateCharge: WarehouseWorkspaceProps['onUpdateStorageCharge']
  periodEnd: string
  policy: StorageBillingPolicy
  preview: ReturnType<typeof calculateStorageChargePreview> | undefined
  receipt: DemoDataset['warehouseReceipts'][number] | undefined
  selectedJob: DemoDataset['jobs'][number] | undefined
  selectedRate: DemoDataset['storageRates'][number] | undefined
  setPeriodEnd: (date: string) => void
  setStorageAdjustmentAmount: (value: string) => void
  setStorageAdjustmentReason: (value: string) => void
  storageAdjustmentAmount: string
  storageAdjustmentReason: string
  storageChargeExists: boolean
  storageError: string
  updatePolicy: <Key extends keyof StorageBillingPolicy>(key: Key, value: StorageBillingPolicy[Key]) => void
}) {
  return (
    <div className="warehouse-storage-layout">
      <section className="warehouse-storage-card">
        {receipt && selectedJob && selectedRate && preview ? (
          <>
            <div className="warehouse-record-heading"><div><span className="section-eyebrow">STORAGE CHARGE PREVIEW · EXAMPLE RATE</span><h3>{receipt.jobNo} · {receipt.grnNo}</h3><span>{preview.customerName} · {receipt.containerNo}</span></div><button className="dashboard-text-link" onClick={() => onOpenJob(receipt.jobNo)} type="button">Open Job →</button></div>
            <p className="warehouse-example-banner">Example rates only — pending confirmation. This is a draft preview, not an invoice or accounting posting.</p>
            <div className="warehouse-policy-controls">
              <label>Billing period end<input max={dataset.metadata.asOfDate} min={receipt.receivedDate} onChange={(event) => setPeriodEnd(event.target.value)} type="date" value={periodEnd} /></label>
              <label>Free-day policy<select onChange={(event) => updatePolicy('freeDayPolicy', event.target.value as StorageBillingPolicy['freeDayPolicy'])} value={policy.freeDayPolicy}><option value="exclude_receipt_day">Exclude receiving day</option><option value="include_receipt_day">Include receiving day</option></select></label>
              {selectedRate.basis === 'carton_per_month' && <label>Monthly period policy<select onChange={(event) => updatePolicy('monthlyPeriodPolicy', event.target.value as StorageBillingPolicy['monthlyPeriodPolicy'])} value={policy.monthlyPeriodPolicy}><option value="started_30_day_period">Round up to started 30-day periods</option><option value="prorated_30_day_period">Prorate by 30-day period</option></select></label>}
              <label>Currency rounding<select onChange={(event) => updatePolicy('decimalPlaces', Number(event.target.value) as StorageBillingPolicy['decimalPlaces'])} value={policy.decimalPlaces}><option value={2}>2 decimal places</option><option value={0}>Whole RM</option></select></label>
            </div>
            <div className="warehouse-rate-callout"><strong>Example customer rate</strong><span>{rateDescription(selectedRate)} · Customer rate rule {selectedRate.id}</span><small>{selectedRate.freeDays} free days · policy {selectedRate.policyStatus}</small></div>
            <div className="warehouse-calculation">
              <div className="warehouse-calculation-row"><span>Received date → period end</span><strong>{formatDate(receipt.receivedDate)} → {formatDate(preview.periodEnd)}</strong></div>
              <div className="warehouse-calculation-row"><span>Elapsed days · {policy.freeDayPolicy === 'include_receipt_day' ? 'receiving day included' : 'receiving day excluded'}</span><strong>{preview.elapsedDays}</strong></div>
              <div className="warehouse-calculation-row"><span>Free days applied</span><strong>− {preview.freeDays}</strong></div>
              <div className="warehouse-calculation-row"><span>Chargeable days / periods</span><strong>{preview.chargeableDays} days / {preview.chargeablePeriods} {preview.periodLabel}</strong></div>
              <div className="warehouse-calculation-row"><span>Chargeable quantity</span><strong>{preview.quantity.toLocaleString()} {preview.quantityUnit}</strong></div>
              <div className="warehouse-calculation-row"><span>Illustrative rate</span><strong>{money(preview.rateRM, policy.decimalPlaces)} / {selectedRate.basis.replaceAll('_', ' ')}</strong></div>
              <div className="warehouse-calculation-equation"><span>{preview.quantity.toLocaleString()} {preview.quantityUnit} × {money(preview.rateRM, policy.decimalPlaces)} × {preview.chargeablePeriods} {preview.periodLabel}</span><strong>{money(preview.amountRM, policy.decimalPlaces)}</strong></div>
            </div>
            <p className="warehouse-example-caption warehouse-calculation-note">Carton/pallet quantities use posted stock movements through the selected period end. CBM uses the GRN receipt volume because no CBM movement ledger is configured.</p>
            <div className="warehouse-charge-adjustment">
              <label>Adjusted amount (optional)<input min="0" onChange={(event) => setStorageAdjustmentAmount(event.target.value)} placeholder={preview.amountRM.toFixed(policy.decimalPlaces)} step="any" type="number" value={storageAdjustmentAmount} /></label>
              <label>Adjustment reason{storageAdjustmentAmount !== '' && <i>Required for adjustment</i>}<input onChange={(event) => setStorageAdjustmentReason(event.target.value)} placeholder="Record the reason if amount is changed" value={storageAdjustmentReason} /></label>
            </div>
            {storageError && <p className="warehouse-form-error" role="alert">{storageError}</p>}
            {storageChargeExists && <p className="warehouse-duplicate-warning" role="status">A charge for this receipt and billing period already exists. Duplicate generation is blocked.</p>}
            <div className="warehouse-storage-actions"><button className="job-primary-button" disabled={storageChargeExists || preview.chargeablePeriods <= 0} onClick={onAddCharge} type="button">Create draft charge suggestion</button>{preview.chargeablePeriods <= 0 && <span>No chargeable period remains after free days.</span>}</div>
          </>
        ) : <p className="logistics-empty logistics-empty--detail">{selectedRate ? 'Select a warehouse receipt to preview storage billing.' : 'No customer-specific storage rule exists for this receipt customer.'}</p>}
      </section>

      <section className="warehouse-rates-card">
        <div className="logistics-card-heading"><div><span className="section-eyebrow">REFERENCE EXAMPLES</span><h3>Example storage rates</h3></div><span>Pending confirmation</span></div>
        <div className="warehouse-rate-list">{dataset.storageRates.map((rate) => {
          const rateCustomer = dataset.customers.find((record) => record.id === rate.customerId)
          return <div className="warehouse-rate-row" key={rate.id}><span><strong>{rateCustomer?.name ?? rate.customerId}</strong><small>{rate.freeDays} free days · {rate.policyStatus}</small></span><b>{money(rate.rateRM, 0)} / {rate.basis.replaceAll('_', ' ')}</b></div>
        })}</div>
        <p className="warehouse-example-caption">Examples reflect the supplied requirements: 3 free days then RM3/CBM/day, RM8/pallet/day, and RM5/carton/month. Rates are illustrative and require customer/policy validation.</p>
      </section>

      <section className="warehouse-charge-register">
        <div className="logistics-card-heading"><div><span className="section-eyebrow">CHARGE SUGGESTIONS</span><h3>Storage billing register</h3></div><span>{charges.length} records</span></div>
        {charges.length ? <div className="warehouse-table-wrap"><table className="warehouse-table"><thead><tr><th>Job / source period</th><th>Charge explanation</th><th>Amount</th><th>Adjustment</th><th>Approval</th></tr></thead><tbody>{charges.map((charge) => {
          const job = dataset.jobs.find((record) => record.jobNo === charge.jobNo)
          return <tr key={charge.id}><td><button className="warehouse-job-link" onClick={() => onOpenJob(charge.jobNo)} type="button">{charge.jobNo}</button><small>{charge.sourceEventId.split(':').slice(-2).join(' → ')}</small></td><td>{charge.description}</td><td>{money(charge.amountRM, 2)}</td><td>{charge.adjustmentReason ?? 'No adjustment'}</td><td><span className={`warehouse-approval warehouse-approval--${charge.status}`}>{label(charge.status)}</span>{charge.status === 'draft' && <button className="warehouse-approve-button" onClick={() => onUpdateCharge(charge.id, 'approved')} type="button">Approve</button>}{job && <small>Owner: {job.owner}</small>}</td></tr>
        })}</tbody></table></div> : <p className="logistics-empty">No storage charge suggestions have been generated.</p>}
      </section>
    </div>
  )
}

function rateDescription(rate: DemoDataset['storageRates'][number]): string {
  const amount = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 }).format(rate.rateRM)
  const basis = rate.basis === 'cbm_per_day'
    ? 'CBM/day'
    : rate.basis === 'pallet_per_day'
      ? 'pallet/day'
      : 'carton/month'
  return `RM ${amount} / ${basis}`
}

function WarehouseFact({ label: title, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`logistics-detail-fact${warning ? ' logistics-detail-fact--warning' : ''}`}><span>{title}</span><strong>{value}</strong></div>
}
