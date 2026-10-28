import { useMemo, useState } from 'react'
import {
  calculateInvoiceTotals,
  calculateJobProfitability,
} from '../data/calculations.js'
import {
  createDraftChargeSuggestion,
  createInvoiceFromApprovedCharges,
  getOperationalChargeCandidates,
  getPayablesRM,
  getProfitabilityByCustomer,
  getProfitabilityByDepartment,
  getProfitabilityByJob,
  getProfitabilityByShipment,
  getReceivablesRM,
  matchBankTransaction,
  reconcileBankTransaction,
} from '../data/finance.js'
import type {
  BankTransaction,
  ChargeSuggestion,
  CustomerInvoice,
  DemoDataset,
  PaymentRequest,
  PaymentVoucher,
  SupplierCost,
} from '../data/model.js'

type CostingView = 'job' | 'customer' | 'shipment' | 'department'

interface FinanceWorkspaceProps {
  dataset: DemoDataset
  jobCosting?: boolean
  onOpenJob: (jobNo: string) => void
  onAddCharge: (charge: ChargeSuggestion) => void
  onUpdateCharge: (charge: ChargeSuggestion) => void
  onCreateInvoice: (invoice: CustomerInvoice) => void
  onUpdateInvoice: (invoice: CustomerInvoice) => void
  onUpdateSupplierCost: (cost: SupplierCost) => void
  onUpdatePaymentRequest: (request: PaymentRequest) => void
  onUpdateVoucher: (voucher: PaymentVoucher) => void
  onUpdateBankTransaction: (transaction: BankTransaction) => void
}

const currency = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function FinanceWorkspace({
  dataset,
  jobCosting = false,
  onOpenJob,
  onAddCharge,
  onUpdateCharge,
  onCreateInvoice,
  onUpdateInvoice,
  onUpdateSupplierCost,
  onUpdatePaymentRequest,
  onUpdateVoucher,
  onUpdateBankTransaction,
}: FinanceWorkspaceProps) {
  const [query, setQuery] = useState('')
  const [costingView, setCostingView] = useState<CostingView>('job')
  const [selectedJobNo, setSelectedJobNo] = useState(dataset.jobs[0]?.jobNo ?? '')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [cancelTarget, setCancelTarget] = useState<{ kind: 'charge' | 'invoice' | 'voucher'; id: string } | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [reportPreview, setReportPreview] = useState<'pnl' | 'balance_sheet' | null>(null)
  const [message, setMessage] = useState('')
  const [bankMatches, setBankMatches] = useState<Record<string, string>>({})
  const candidates = useMemo(() => getOperationalChargeCandidates(dataset), [dataset])
  const search = query.trim().toLowerCase()

  const chargeRows = dataset.charges.filter((charge) => {
    const job = dataset.jobs.find((record) => record.jobNo === charge.jobNo)
    const customer = job && dataset.customers.find((record) => record.id === job.customerId)
    return !search || [charge.id, charge.jobNo, charge.description, charge.sourceEventId, charge.department, customer?.name]
      .filter(Boolean).join(' ').toLowerCase().includes(search)
  })

  const unbilledPerformedRM = dataset.charges
    .filter((charge) => charge.performed && !['invoiced', 'waived', 'cancelled', 'reversed'].includes(charge.status))
    .reduce((total, charge) => total + charge.amountRM, 0)
  const pendingCostCount = dataset.supplierCosts.filter((cost) => cost.approvalStatus === 'pending').length
  const receivablesRM = getReceivablesRM(dataset)
  const payablesRM = getPayablesRM(dataset)
  const aggregateRows = costingView === 'job'
    ? getProfitabilityByJob(dataset)
    : costingView === 'customer'
      ? getProfitabilityByCustomer(dataset)
      : costingView === 'shipment'
        ? getProfitabilityByShipment(dataset)
        : getProfitabilityByDepartment(dataset)
  const tripExample = (() => {
    const trip = dataset.trips.find((record) => record.id === 'TRIP-028-A')
    if (!trip) return undefined
    const bill = dataset.charges.find((charge) => charge.sourceEventId === trip.id && charge.department === 'haulage')
    const costs = dataset.supplierCosts.filter((cost) => cost.tripId === trip.id && cost.costType === 'actual')
    const truckingRM = costs.filter((cost) => cost.category === 'trucking').reduce((total, cost) => total + cost.amountRM, 0)
    const tollRM = costs.filter((cost) => cost.category === 'toll').reduce((total, cost) => total + cost.amountRM, 0)
    const otherRM = costs.filter((cost) => cost.category !== 'trucking' && cost.category !== 'toll').reduce((total, cost) => total + cost.amountRM, 0)
    return { trip, billingRM: bill?.amountRM ?? 0, truckingRM, tollRM, otherRM, profitRM: (bill?.amountRM ?? 0) - truckingRM - tollRM - otherRM }
  })()

  function addAllSuggestions() {
    let created = 0
    let stagedCharges = dataset.charges
    for (const candidate of candidates) {
      const charge = createDraftChargeSuggestion(candidate, stagedCharges, dataset.metadata.asOfDate)
      onAddCharge(charge)
      stagedCharges = [...stagedCharges, charge]
      created += 1
    }
    setMessage(created ? `${created} reviewable draft suggestion(s) added. No invoice or ledger posting was created.` : 'No additional rated operational events are ready for a draft suggestion.')
  }

  function createInvoice(jobNo: string) {
    const invoice = createInvoiceFromApprovedCharges(dataset, jobNo)
    onCreateInvoice(invoice)
    setMessage(`${invoice.id} created as a draft for Finance review.`)
  }

  function confirmCancellation() {
    if (!cancelTarget || !cancelReason.trim()) {
      setMessage('Enter a cancellation or reversal reason before continuing.')
      return
    }
    if (cancelTarget.kind === 'charge') {
      const charge = dataset.charges.find((record) => record.id === cancelTarget.id)
      if (!charge || charge.invoiceId || !['draft', 'approved'].includes(charge.status)) {
        throw new Error('Only unposted draft or approved charges can be cancelled directly.')
      }
      onUpdateCharge({ ...charge, status: 'cancelled', cancellationReason: cancelReason.trim() })
    } else if (cancelTarget.kind === 'invoice') {
      const invoice = dataset.invoices.find((record) => record.id === cancelTarget.id)
      if (!invoice || invoice.status === 'paid' || invoice.status === 'cancelled' || invoice.amountPaidRM > 0) {
        throw new Error('This invoice cannot be cancelled in its current state.')
      }
      onUpdateInvoice({ ...invoice, status: 'cancelled', cancellationReason: cancelReason.trim() })
      for (const chargeId of invoice.chargeIds) {
        const charge = dataset.charges.find((record) => record.id === chargeId)
        if (charge) onUpdateCharge({ ...charge, status: 'reversed', cancellationReason: cancelReason.trim() })
      }
    } else {
      const voucher = dataset.paymentVouchers.find((record) => record.id === cancelTarget.id)
      if (!voucher || voucher.status === 'cancelled') {
        throw new Error('This payment voucher cannot be cancelled in its current state.')
      }
      if (dataset.bankTransactions.some((transaction) => transaction.matchedRecordId === voucher.id && transaction.reconciliationStatus === 'reconciled')) {
        throw new Error('This voucher is already reconciled; a separate accounting reversal workflow is required.')
      }
      onUpdateVoucher({ ...voucher, status: 'cancelled', cancellationReason: cancelReason.trim() })
    }
    setCancelTarget(null)
    setCancelReason('')
    setMessage('Cancellation recorded. The original finance record remains in the audit history.')
  }

  function handleCreateSuggestion(candidate: (typeof candidates)[number]) {
    const charge = createDraftChargeSuggestion(candidate, dataset.charges, dataset.metadata.asOfDate)
    onAddCharge(charge)
    setMessage(`Draft suggestion created for ${candidate.sourceEventId}.`)
  }

  function submitDemoInvoice(invoice: CustomerInvoice) {
    if (invoice.status !== 'approved') return
    onUpdateInvoice({
      ...invoice,
      status: 'demo_submitted',
      eInvoiceStatus: 'demo_submitted',
      eInvoiceReference: `DEMO-MYI-${invoice.id}`,
      eInvoiceError: undefined,
    })
    setMessage('Demo submission status recorded locally. No LHDN MyInvois connection was contacted.')
  }

  function recordDemoEmail(invoice: CustomerInvoice) {
    onUpdateInvoice({ ...invoice, emailStatus: 'demo_sent' })
    setMessage('Demo email status recorded locally. No email was sent.')
  }

  function body() {
    if (jobCosting) return <JobCostingBody />
    return <BillingBody />
  }

  function JobCostingBody() {
    const selectedJob = dataset.jobs.find((job) => job.jobNo === selectedJobNo)
    const selectedProfit = selectedJob ? calculateJobProfitability(dataset, selectedJob.jobNo) : undefined
    const departmentLines = selectedDepartment
      ? dataset.charges.filter((charge) => charge.department === selectedDepartment && charge.performed && !['waived', 'cancelled', 'reversed'].includes(charge.status))
      : []

    return (
      <>
        <div className="finance-view-tabs" role="tablist" aria-label="Profitability breakdown">
          {([
            ['job', 'By Job'],
            ['customer', 'By Customer'],
            ['shipment', 'By Shipment'],
            ['department', 'By Department'],
          ] as const).map(([id, title]) => (
            <button type="button" role="tab" aria-selected={costingView === id} className={costingView === id ? 'finance-view-tab finance-view-tab--active' : 'finance-view-tab'} key={id} onClick={() => setCostingView(id)}>{title}</button>
          ))}
        </div>
        <section className="finance-card">
          <div className="finance-card-heading"><div><span className="section-eyebrow">DERIVED FROM SHARED SOURCE LINES</span><h3>Revenue, actual cost and gross margin</h3></div><span className="finance-hint">Estimated costs shown separately</span></div>
          <div className="finance-table-wrap"><table className="finance-table">
            <thead><tr><th>{label(costingView)}</th><th>Revenue</th><th>Actual direct cost</th><th>Estimated cost</th><th>Gross profit*</th><th>Margin</th><th>Drill-down</th></tr></thead>
            <tbody>{aggregateRows.map((row) => {
              const isDepartment = costingView === 'department'
              const job = costingView === 'job' ? dataset.jobs.find((record) => record.jobNo === row.id) : undefined
              const customer = costingView === 'customer' ? dataset.customers.find((record) => record.id === row.id) : undefined
              const shipment = costingView === 'shipment' ? dataset.shipments.find((record) => record.id === row.id) : undefined
              return <tr key={row.id}><td><strong>{row.label}</strong>{job && <small>{job.description}</small>}{customer && <small>{dataset.jobs.filter((record) => record.customerId === customer.id).length} linked job(s)</small>}{shipment && <small>{shipment.vessel} · {shipment.voyage}</small>}</td><td>{currency.format(row.revenueRM)}</td><td>{currency.format(row.actualCostRM)}</td><td>{currency.format(row.estimatedCostRM)}</td><td className={row.grossProfitRM < 0 ? 'finance-negative' : ''}>{currency.format(row.grossProfitRM)}</td><td>{row.marginPercent === null ? '—' : `${row.marginPercent.toFixed(1)}%`}</td><td>{job ? <button className="finance-link-button" type="button" onClick={() => onOpenJob(job.jobNo)}>Open Job</button> : customer ? <button className="finance-link-button" type="button" onClick={() => { setCostingView('job'); const firstJob = dataset.jobs.find((record) => record.customerId === customer.id); if (firstJob) setSelectedJobNo(firstJob.jobNo) }}>View jobs</button> : shipment ? <button className="finance-link-button" type="button" onClick={() => onOpenJob(shipment.jobNo)}>Open Job</button> : isDepartment ? <button className="finance-link-button" type="button" onClick={() => setSelectedDepartment(row.id)}>Source lines</button> : '—'}</td></tr>
            })}</tbody>
          </table></div>
          <p className="finance-footnote">* Gross profit = performed charge revenue less actual supplier costs. Estimated direct costs are excluded from actual gross profit and shown separately. No tax, accrual or accounting policy is inferred.</p>
        </section>
        {costingView === 'job' && selectedJob && selectedProfit && (
          <section className="finance-card">
            <div className="finance-card-heading"><div><span className="section-eyebrow">SOURCE-LINE DRILL-DOWN</span><h3>{selectedJob.jobNo} · {selectedJob.description}</h3></div><button className="finance-link-button" type="button" onClick={() => onOpenJob(selectedJob.jobNo)}>Open Job Detail →</button></div>
            <div className="finance-summary-grid finance-summary-grid--compact"><Summary label="Performed revenue" value={currency.format(selectedProfit.revenueRM)} /><Summary label="Actual supplier costs" value={currency.format(selectedProfit.actualCostsRM)} /><Summary label="Estimated costs" value={currency.format(selectedProfit.estimatedCostsRM)} /><Summary label="Actual gross profit" value={currency.format(selectedProfit.actualMarginRM)} /></div>
            <FinanceSourceLines dataset={dataset} jobNo={selectedJob.jobNo} />
          </section>
        )}
        {costingView === 'department' && selectedDepartment && (
          <section className="finance-card">
            <div className="finance-card-heading"><div><span className="section-eyebrow">DEPARTMENT SOURCE LINES</span><h3>{label(selectedDepartment)}</h3></div><button className="finance-link-button" type="button" onClick={() => setSelectedDepartment('')}>Close</button></div>
            <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Charge / Job</th><th>Source event</th><th>Amount</th><th>Status</th></tr></thead><tbody>{departmentLines.map((charge) => <tr key={charge.id}><td><strong>{charge.description}</strong><small>{charge.jobNo}</small></td><td>{charge.sourceEventId}</td><td>{currency.format(charge.amountRM)}</td><td>{label(charge.status)}</td></tr>)}</tbody></table></div>
          </section>
        )}
        {tripExample && (
          <section className="finance-example-card">
            <div><span className="section-eyebrow">ILLUSTRATIVE HAULAGE EXAMPLE</span><h3>{tripExample.trip.id} · {tripExample.trip.jobNo}</h3><p>Derived from the linked haulage charge and actual trip cost lines.</p></div>
            <strong>{currency.format(tripExample.billingRM)} billing − {currency.format(tripExample.truckingRM)} trucking − {currency.format(tripExample.tollRM)} toll − {currency.format(tripExample.otherRM)} other = {currency.format(tripExample.profitRM)} gross profit</strong>
            <button type="button" onClick={() => onOpenJob(tripExample.trip.jobNo)}>Open linked job</button>
          </section>
        )}
        <section className="finance-card finance-report-entrypoints">
          <div className="finance-card-heading"><div><span className="section-eyebrow">REPORT ENTRY POINTS</span><h3>P&amp;L and Balance Sheet</h3></div><span className="finance-hint">No unsupported accounting policy assumed</span></div>
          <div className="finance-report-buttons"><button type="button" onClick={() => setReportPreview(reportPreview === 'pnl' ? null : 'pnl')}>Profit &amp; Loss · preview entry</button><button type="button" onClick={() => setReportPreview(reportPreview === 'balance_sheet' ? null : 'balance_sheet')}>Balance Sheet · preview entry</button></div>
          {reportPreview && <p className="finance-report-note">{reportPreview === 'pnl' ? 'P&L report entry point: revenue and direct-cost source records are available above; chart of accounts, recognition timing, tax and period-close rules require Finance confirmation before a report is produced.' : 'Balance Sheet report entry point: receivable, payable, voucher and bank records are listed in Billing & Finance. Opening balances, account mapping and reconciliation policies are not configured, so no balance sheet totals are fabricated.'}</p>}
        </section>
      </>
    )
  }

  function BillingBody() {
    return (
      <>
        <section className="finance-summary-grid" aria-label="Finance summary">
          <Summary label="Customer receivables" value={currency.format(receivablesRM)} caption="Outstanding on non-cancelled invoices" />
          <Summary label="Supplier payables" value={currency.format(payablesRM)} caption="Actual supplier costs marked unpaid" />
          <Summary label="Performed, unbilled work" value={currency.format(unbilledPerformedRM)} caption="Source work not yet invoiced / waived" warning={unbilledPerformedRM > 0} />
          <Summary label="Finance review queue" value={String(pendingCostCount + dataset.charges.filter((charge) => charge.status === 'draft').length)} caption="Supplier costs + draft charges" />
        </section>

        <section className="finance-card">
          <div className="finance-card-heading"><div><span className="section-eyebrow">OPERATIONAL EVENT → BILLING</span><h3>Draft charge suggestions</h3><p>Review and approve before invoice creation. Rates are illustrative and sourced from linked quotations.</p></div><button className="button button--primary" type="button" onClick={addAllSuggestions}>Create rated draft suggestions ({candidates.length})</button></div>
          {message && <p className="finance-message" role="status">{message}</p>}
          {candidates.length ? <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Job / department</th><th>Source event / description</th><th>Quantity / rate</th><th>Draft amount</th><th>Action</th></tr></thead><tbody>{candidates.map((candidate) => <tr key={candidate.sourceEventId}><td><strong>{candidate.jobNo}</strong><small>{label(candidate.department)}</small></td><td><strong>{candidate.description}</strong><small>{candidate.sourceEventId} · source event complete</small></td><td>{candidate.quantity} {candidate.unit}<small>{currency.format(candidate.amountRM / candidate.quantity)} / {candidate.unit} · quotation rate</small></td><td>{currency.format(candidate.amountRM)}</td><td><button className="finance-link-button" type="button" onClick={() => handleCreateSuggestion(candidate)}>Add draft</button></td></tr>)}</tbody></table></div> : <p className="finance-empty">No additional rated events are ready. Unrated events are not given invented prices; existing suggestions and storage charges remain available below.</p>}
        </section>

        <section className="finance-card">
          <div className="finance-card-heading"><div><span className="section-eyebrow">CHARGE REGISTER</span><h3>Charges, approvals and posting state</h3></div><label className="finance-search"><span>Search finance lines</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job No., customer, source event, charge…" /></label></div>
          <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Charge / Job</th><th>Source / evidence</th><th>Department</th><th>Qty / unit</th><th>Amount</th><th>Approval / posting</th><th>Action</th></tr></thead><tbody>{chargeRows.map((charge) => {
            const job = dataset.jobs.find((record) => record.jobNo === charge.jobNo)
            const isUnbilledPerformed = charge.performed && !['invoiced', 'waived', 'cancelled', 'reversed'].includes(charge.status)
            return <tr key={charge.id}><td><strong>{charge.description}</strong><small>{charge.id} · <button className="finance-inline-link" type="button" onClick={() => onOpenJob(charge.jobNo)}>{charge.jobNo}</button>{job ? ` · ${dataset.customers.find((record) => record.id === job.customerId)?.name ?? ''}` : ''}</small>{isUnbilledPerformed && <em className="finance-warning-badge">Performed · unbilled</em>}</td><td>{charge.sourceEventId}<small>{charge.illustrativeRate ? 'Illustrative quotation / demo rate' : 'Rate source not marked illustrative'}</small></td><td>{label(charge.department)}</td><td>{charge.quantity} {charge.unit}</td><td>{currency.format(charge.amountRM)}</td><td><span className={`finance-state finance-state--${charge.status}`}>{label(charge.status)}</span>{charge.approvedBy && <small>{charge.approvedBy} · {charge.approvedAt}</small>}{charge.cancellationReason && <small>Reason: {charge.cancellationReason}</small>}</td><td><div className="finance-row-actions">{charge.status === 'draft' && <button type="button" onClick={() => onUpdateCharge({ ...charge, status: 'approved', approvedBy: 'Finance reviewer (demo)', approvedAt: dataset.metadata.asOfDate })}>Approve</button>}{charge.status === 'approved' && <button type="button" onClick={() => createInvoice(charge.jobNo)}>Create invoice</button>}{['draft', 'approved'].includes(charge.status) && <button type="button" onClick={() => { setCancelTarget({ kind: 'charge', id: charge.id }); setCancelReason('') }}>Cancel with reason</button>}</div></td></tr>
          })}</tbody></table></div>
          {!chargeRows.length && <p className="finance-empty">No charges match this search.</p>}
        </section>

        <section className="finance-card">
          <div className="finance-card-heading"><div><span className="section-eyebrow">FINANCE REVIEW</span><h3>Supplier costs and payment requests</h3></div></div>
          <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Supplier cost / Job</th><th>Cost type / category</th><th>Amount</th><th>Approval / payment</th><th>Action</th></tr></thead><tbody>{dataset.supplierCosts.filter((cost) => !search || `${cost.id} ${cost.jobNo} ${cost.description} ${cost.supplierInvoiceRef ?? ''}`.toLowerCase().includes(search)).map((cost) => <tr key={cost.id}><td><strong>{cost.description}</strong><small>{cost.id} · <button className="finance-inline-link" type="button" onClick={() => onOpenJob(cost.jobNo)}>{cost.jobNo}</button> · {dataset.suppliers.find((supplier) => supplier.id === cost.supplierId)?.name}</small></td><td>{label(cost.costType)} · {label(cost.category)}{cost.tripId && <small>Source trip {cost.tripId}</small>}</td><td>{currency.format(cost.amountRM)}</td><td><span className={`finance-state finance-state--${cost.approvalStatus}`}>{label(cost.approvalStatus)}</span><small>{label(cost.paymentStatus)} · {cost.supplierInvoiceRef ?? 'No supplier invoice ref'}</small></td><td>{cost.approvalStatus === 'pending' && <button className="finance-row-button" type="button" onClick={() => onUpdateSupplierCost({ ...cost, approvalStatus: 'approved', financeReviewedBy: 'Finance reviewer (demo)', financeReviewedAt: dataset.metadata.asOfDate })}>Approve cost</button>}</td></tr>)}</tbody></table></div>
          <div className="finance-subsection-heading"><h4>Reimbursement / payment requests</h4><span>Requests retain their own approval state</span></div>
          <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Request / Job</th><th>Type / supplier</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{dataset.paymentRequests.map((request) => <tr key={request.id}><td><strong>{request.description}</strong><small>{request.id} · <button className="finance-inline-link" type="button" onClick={() => onOpenJob(request.jobNo)}>{request.jobNo}</button></small></td><td>{label(request.requestType)}<small>{dataset.suppliers.find((supplier) => supplier.id === request.supplierId)?.name}</small></td><td>{currency.format(request.amountRM)}</td><td><span className={`finance-state finance-state--${request.status}`}>{label(request.status)}</span></td><td>{request.status === 'submitted' && <button className="finance-row-button" type="button" onClick={() => onUpdatePaymentRequest({ ...request, status: 'approved' })}>Approve</button>}{request.status === 'approved' && <button className="finance-row-button" type="button" onClick={() => onUpdatePaymentRequest({ ...request, status: 'paid' })}>Mark paid (demo)</button>}</td></tr>)}</tbody></table></div>
        </section>

        <section className="finance-card">
          <div className="finance-card-heading"><div><span className="section-eyebrow">CUSTOMER BILLING</span><h3>Invoices · Finance approval · e-invoice</h3></div><span className="finance-integration-badge">LHDN MyInvois / email demo only</span></div>
          <div className="finance-invoice-create"><label>Job with approved performed charges<select value={selectedJobNo} onChange={(event) => setSelectedJobNo(event.target.value)}><option value="">Select Job No.</option>{dataset.jobs.map((job) => <option key={job.jobNo} value={job.jobNo}>{job.jobNo} · {job.description}</option>)}</select></label><button className="button button--secondary" type="button" onClick={() => selectedJobNo && createInvoice(selectedJobNo)}>Create draft invoice from approved charges</button></div>
          <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Invoice / Job</th><th>Customer / dates</th><th>Amount / outstanding</th><th>Finance / e-invoice / email</th><th>Action</th></tr></thead><tbody>{dataset.invoices.map((invoice) => {
            const totals = calculateInvoiceTotals(dataset, invoice.id)
            const customer = dataset.customers.find((record) => record.id === invoice.customerId)
            return <tr key={invoice.id}><td><strong>{invoice.id}</strong><small><button className="finance-inline-link" type="button" onClick={() => onOpenJob(invoice.jobNo)}>{invoice.jobNo}</button> · {invoice.chargeIds.length} linked charge(s)</small></td><td>{customer?.name ?? 'Unknown customer'}<small>{invoice.invoiceDate} · due {invoice.dueDate}</small></td><td>{currency.format(totals.subtotalRM)}<small>Paid {currency.format(totals.paidRM)} · Open {invoice.status === 'cancelled' ? currency.format(0) : currency.format(totals.outstandingRM)}</small></td><td><span className={`finance-state finance-state--${invoice.status}`}>{label(invoice.status)}</span><small>e-Invoice: {label(invoice.eInvoiceStatus)}{invoice.eInvoiceReference ? ` · ${invoice.eInvoiceReference}` : ''}</small><small>Email: {label(invoice.emailStatus)}{invoice.eInvoiceError ? ` · ${invoice.eInvoiceError}` : ''}</small></td><td><div className="finance-row-actions">{invoice.status === 'draft' && <button type="button" onClick={() => onUpdateInvoice({ ...invoice, status: 'approved', financeApprovedBy: 'Finance reviewer (demo)' })}>Finance approve</button>}{invoice.status === 'approved' && <button type="button" onClick={() => submitDemoInvoice(invoice)}>Submit e-invoice demo</button>}{['approved', 'demo_submitted'].includes(invoice.status) && invoice.emailStatus === 'not_sent' && <button type="button" onClick={() => recordDemoEmail(invoice)}>Record email demo</button>}{!['paid', 'cancelled'].includes(invoice.status) && invoice.amountPaidRM === 0 && <button type="button" onClick={() => { setCancelTarget({ kind: 'invoice', id: invoice.id }); setCancelReason('') }}>Cancel / reverse</button>}{invoice.amountPaidRM > 0 && invoice.status !== 'cancelled' && <small>Payment recorded; separate credit / refund workflow required.</small>}</div>{invoice.cancellationReason && <small>Reversal reason: {invoice.cancellationReason}</small>}</td></tr>
          })}</tbody></table></div>
        </section>

        <section className="finance-card">
          <div className="finance-card-heading"><div><span className="section-eyebrow">PAYABLES + BANK RECONCILIATION</span><h3>Vouchers and bank feed records</h3></div><span className="finance-integration-badge">Bank feed not connected</span></div>
          <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Voucher</th><th>Supplier / Job</th><th>Amount / date</th><th>Status</th><th>Action</th></tr></thead><tbody>{dataset.paymentVouchers.map((voucher) => {
            const reconciled = dataset.bankTransactions.some((transaction) => transaction.matchedRecordId === voucher.id && transaction.reconciliationStatus === 'reconciled')
            return <tr key={voucher.id}><td><strong>{voucher.id}</strong><small>{label(voucher.voucherType)}{voucher.supplierCostId ? ` · ${voucher.supplierCostId}` : ''}</small></td><td>{dataset.suppliers.find((supplier) => supplier.id === voucher.supplierId)?.name ?? 'Supplier not recorded'}<small>{voucher.jobNo ? <button className="finance-inline-link" type="button" onClick={() => onOpenJob(voucher.jobNo ?? '')}>{voucher.jobNo}</button> : 'No linked job'}</small></td><td>{currency.format(voucher.amountRM)}<small>{voucher.voucherDate}</small></td><td><span className={`finance-state finance-state--${voucher.status}`}>{label(voucher.status)}</span>{voucher.cancellationReason && <small>Reason: {voucher.cancellationReason}</small>}</td><td><div className="finance-row-actions">{voucher.status === 'draft' && <button type="button" onClick={() => onUpdateVoucher({ ...voucher, status: 'approved' })}>Approve voucher</button>}{voucher.status === 'approved' && <button type="button" onClick={() => onUpdateVoucher({ ...voucher, status: 'paid' })}>Mark paid (demo)</button>}{voucher.status !== 'cancelled' && !reconciled && <button type="button" onClick={() => { setCancelTarget({ kind: 'voucher', id: voucher.id }); setCancelReason('') }}>{voucher.status === 'paid' ? 'Reverse with reason' : 'Cancel with reason'}</button>}{reconciled && <small>Reconciled · separate reversal workflow required</small>}</div></td></tr>
          })}</tbody></table></div>
          <div className="finance-subsection-heading"><h4>Bank reconciliation register</h4><span>Demo feed rows · no bank connection</span></div>
          <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Transaction</th><th>Direction</th><th>Amount</th><th>Match / status</th><th>Action</th></tr></thead><tbody>{dataset.bankTransactions.map((transaction) => <tr key={transaction.id}><td><strong>{transaction.description}</strong><small>{transaction.id} · {transaction.transactionDate}</small></td><td>{label(transaction.direction)}</td><td>{currency.format(transaction.amountRM)}</td><td>{transaction.matchedRecordId ?? 'No match'}<small>{label(transaction.reconciliationStatus)}</small></td><td>{transaction.reconciliationStatus !== 'reconciled' && <div className="finance-row-actions"><select aria-label={`Match bank transaction ${transaction.id}`} value={bankMatches[transaction.id] ?? transaction.matchedRecordId ?? ''} onChange={(event) => setBankMatches((current) => ({ ...current, [transaction.id]: event.target.value }))}><option value="">Select finance record</option>{dataset.invoices.filter((invoice) => invoice.status !== 'cancelled').map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.id}</option>)}{dataset.paymentVouchers.filter((voucher) => voucher.status !== 'cancelled').map((voucher) => <option key={voucher.id} value={voucher.id}>{voucher.id}</option>)}</select><button type="button" onClick={() => { const updated = matchBankTransaction(transaction, bankMatches[transaction.id] ?? transaction.matchedRecordId ?? '', dataset); onUpdateBankTransaction(updated) }}>Match</button>{transaction.reconciliationStatus === 'matched' && <button type="button" onClick={() => onUpdateBankTransaction(reconcileBankTransaction(transaction))}>Reconcile</button>}</div>}</td></tr>)}</tbody></table></div>
        </section>
        {cancelTarget && <div className="finance-modal-backdrop" role="presentation"><section className="finance-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="finance-cancel-title"><h3 id="finance-cancel-title">Record controlled cancellation / reversal</h3><p>The original finance record will remain in the register. Enter an audit reason; no record will be deleted.</p><label>Reason<textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label><div><button type="button" className="button button--secondary" onClick={() => setCancelTarget(null)}>Keep record</button><button type="button" className="button button--primary" onClick={confirmCancellation}>Record cancellation</button></div></section></div>}
      </>
    )
  }

  function FinanceSourceLines({ dataset: data, jobNo }: { dataset: DemoDataset; jobNo: string }) {
    const charges = data.charges.filter((charge) => charge.jobNo === jobNo)
    const costs = data.supplierCosts.filter((cost) => cost.jobNo === jobNo)
    return <div className="finance-source-grid"><section><h4>Revenue / charge source lines</h4>{charges.length ? charges.map((charge) => <div className="finance-source-line" key={charge.id}><span><strong>{charge.description}</strong><small>{charge.sourceEventId} · {label(charge.department)} · {label(charge.status)}</small></span><b>{currency.format(charge.amountRM)}</b></div>) : <p className="finance-empty">No charge lines.</p>}</section><section><h4>Direct supplier-cost source lines</h4>{costs.length ? costs.map((cost) => <div className="finance-source-line" key={cost.id}><span><strong>{cost.description}</strong><small>{cost.id} · {label(cost.costType)} · {label(cost.approvalStatus)} · {label(cost.paymentStatus)}</small></span><b>{currency.format(cost.amountRM)}</b></div>) : <p className="finance-empty">No supplier cost lines.</p>}</section></div>
  }

  return (
    <div className="finance-workspace">
      <div className="logistics-intro"><div><span className="section-eyebrow">{jobCosting ? 'JOB PROFITABILITY + REPORTS' : 'BILLING · FINANCE REVIEW · RECONCILIATION'}</span><h2>{jobCosting ? 'Job costing & reports' : 'Billing & Finance'}</h2><p>{jobCosting ? 'Revenue and direct costs reconcile to shared operational charges, supplier costs and invoices.' : 'Finance actions are reviewable local demo state; no accounting ledger, e-invoice gateway, email service or bank feed is connected.'}</p></div>
      {/* <span className="status-badge status-badge--blue">{dataset.metadata.label}</span> */}</div>
      {body()}
    </div>
  )

  function Summary({ label: title, value, caption, warning = false }: { label: string; value: string; caption?: string; warning?: boolean }) {
    return <div className={`finance-summary-card${warning ? ' finance-summary-card--warning' : ''}`}><span>{title}</span><strong>{value}</strong>{caption && <small>{caption}</small>}</div>
  }
}

export { FinanceWorkspace }
