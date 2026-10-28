import { useMemo, useState } from 'react'
import type { DemoDataset } from '../data/model.js'
import {
  calculateBalanceSheet,
  calculateProfitAndLoss,
  defaultReportingPeriod,
  formatMYR,
} from '../data/statements.js'

interface FinanceStatementsProps {
  dataset: DemoDataset
  view: 'pnl' | 'balance_sheet'
}

function formatSigned(amount: number): string {
  const formatted = formatMYR(Math.abs(amount))
  return amount < 0 ? `(${formatted})` : formatted
}

function FinanceStatements({ dataset, view }: FinanceStatementsProps) {
  const defaultPeriod = defaultReportingPeriod(dataset.metadata.asOfDate)
  const [startDate, setStartDate] = useState(defaultPeriod.startDate)
  const [endDate, setEndDate] = useState(defaultPeriod.endDate)
  const [asOfDate, setAsOfDate] = useState(dataset.metadata.asOfDate)
  const pnlResult = useMemo(() => {
    try {
      return { report: calculateProfitAndLoss(dataset, startDate, endDate), error: '' }
    } catch (error) {
      return {
        report: null,
        error: error instanceof Error ? error.message : 'Unable to calculate the profit and loss report.',
      }
    }
  }, [dataset, startDate, endDate])
  const pnl = pnlResult.report
  const periodError = pnlResult.error

  const balanceSheet = useMemo(() => {
    try {
      return calculateBalanceSheet(dataset, asOfDate)
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to calculate the balance sheet.'
    }
  }, [dataset, asOfDate])

  function resetPeriod() {
    setStartDate(defaultPeriod.startDate)
    setEndDate(defaultPeriod.endDate)
  }

  if (view === 'pnl') {
    return (
      <section className="finance-statement" aria-label="Profit and loss statement">
        <div className="finance-statement-banner" role="status">
          Prototype / illustrative demo — not an audited or statutory financial statement.
        </div>
        <div className="finance-card-heading">
          <div>
            <span className="section-eyebrow">BILLING &amp; FINANCE · ILLUSTRATIVE</span>
            <h3>Profit &amp; Loss statement</h3>
            <p>Recognized invoiced revenue less posted direct costs and operating expenses. Quotation values are not treated as revenue.</p>
          </div>
          <button className="button button--secondary finance-print-button" type="button" onClick={() => window.print()}>Print / export</button>
        </div>
        <form className="finance-period-filters" onSubmit={(event) => event.preventDefault()}>
          <label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <button className="logistics-reset" type="button" onClick={resetPeriod}>Reset filters</button>
        </form>
        {periodError && <p className="finance-empty" role="alert">{periodError}</p>}
        {pnl && (
          <>
            <div className="finance-summary-grid" aria-label="Profit and loss totals">
              <Summary label="Recognized revenue" value={formatMYR(pnl.recognizedRevenueRM)} caption={`${pnl.startDate} to ${pnl.endDate}`} />
              <Summary label="Direct costs" value={formatMYR(pnl.directCostsRM)} caption="Approved actual supplier costs" />
              <Summary label="Gross profit" value={formatSigned(pnl.grossProfitRM)} caption={pnl.grossMarginPercent === null ? 'Margin unavailable · no revenue' : `Gross margin ${pnl.grossMarginPercent.toFixed(2)}%`} negative={pnl.grossProfitRM < 0} positive={pnl.grossProfitRM > 0} />
              <Summary label="Net profit" value={formatSigned(pnl.netProfitRM)} caption={pnl.netMarginPercent === null ? 'Margin unavailable · no revenue' : `Net margin ${pnl.netMarginPercent.toFixed(2)}%`} negative={pnl.netProfitRM < 0} positive={pnl.netProfitRM > 0} />
            </div>
            <div className="finance-statement-sections" aria-label="Profit and loss sections">
              <StatementSection
                title="Revenue"
                description="Recognized invoiced revenue for the selected period"
                rows={[
                  ...pnl.revenueLines.map((line) => ({ label: line.accountName, amount: line.amountRM, note: line.sourceIds.join(', ') })),
                  { label: 'Total recognized revenue', amount: pnl.recognizedRevenueRM, total: true },
                ]}
              />
              <StatementSection
                title="Direct costs"
                description="Approved actual supplier costs assigned to revenue"
                rows={[
                  ...pnl.directCostLines.map((line) => ({ label: line.accountName, amount: -line.amountRM, note: line.sourceIds.join(', ') })),
                  { label: 'Total direct costs', amount: -pnl.directCostsRM, total: true },
                ]}
              />
              <StatementSection
                title="Gross profit"
                description={pnl.grossMarginPercent === null ? 'Margin unavailable · no recognized revenue' : `Gross margin ${pnl.grossMarginPercent.toFixed(2)}%`}
                emphasis="profit"
                rows={[{ label: 'Gross profit', amount: pnl.grossProfitRM, total: true }]}
              />
              <StatementSection
                title="Operating expenses"
                description="Approved or paid operating-expense vouchers"
                rows={pnl.operatingExpenseLines.length
                  ? pnl.operatingExpenseLines.map((line) => ({ label: line.accountName, amount: -line.amountRM, note: line.sourceIds.join(', ') }))
                  : [{ label: 'Operating expenses', amount: 0, note: 'No approved or paid operating-expense vouchers in this period' }]}
              />
              <StatementSection
                title="Net profit"
                description={pnl.netMarginPercent === null ? 'Margin unavailable · no recognized revenue' : `Net margin ${pnl.netMarginPercent.toFixed(2)}%`}
                emphasis="profit"
                rows={[{ label: 'Net profit', amount: pnl.netProfitRM, total: true }]}
              />
            </div>
            <section className="finance-comparison">
              <h4>Previous period comparison</h4>
              {pnl.previous.hasRecognizedActivity ? (
                <div className="finance-table-wrap">
                  <table className="finance-table finance-table--statement">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Current ({pnl.startDate} – {pnl.endDate})</th>
                        <th>Previous ({pnl.previousStartDate} – {pnl.previousEndDate})</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        ['Recognized revenue', pnl.recognizedRevenueRM, pnl.previous.recognizedRevenueRM],
                        ['Direct costs', pnl.directCostsRM, pnl.previous.directCostsRM],
                        ['Gross profit', pnl.grossProfitRM, pnl.previous.grossProfitRM],
                        ['Operating expenses', pnl.operatingExpensesRM, pnl.previous.operatingExpensesRM],
                        ['Net profit', pnl.netProfitRM, pnl.previous.netProfitRM],
                      ] as const).map(([label, current, previous]) => (
                        <tr key={label}>
                          <td>{label}</td>
                          <td className="finance-amount">{formatSigned(current)}</td>
                          <td className="finance-amount">{formatSigned(previous)}</td>
                          <td className={`finance-amount${current - previous < 0 ? ' finance-negative' : ''}`}>{formatSigned(current - previous)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="finance-empty">Insufficient prior-period records for a comparison ({pnl.previousStartDate} to {pnl.previousEndDate}).</p>
              )}
            </section>
            <AssumptionList items={pnl.assumptions} />
          </>
        )}
      </section>
    )
  }

  const sheet = typeof balanceSheet === 'string' ? null : balanceSheet
  return (
    <section className="finance-statement" aria-label="Balance sheet">
      <div className="finance-statement-banner" role="status">
        Prototype / illustrative demo — not an audited or statutory financial statement.
      </div>
      <div className="finance-card-heading">
        <div>
          <span className="section-eyebrow">BILLING &amp; FINANCE · ILLUSTRATIVE</span>
          <h3>Balance sheet</h3>
          <p>As-of balances from the illustrative ledger, opening balances and posted operational entries. No unexplained plug is inserted.</p>
        </div>
        <button className="button button--secondary finance-print-button" type="button" onClick={() => window.print()}>Print / export</button>
      </div>
      <form className="finance-period-filters" onSubmit={(event) => event.preventDefault()}>
        <label>As-of date<input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} /></label>
        <button className="logistics-reset" type="button" onClick={() => setAsOfDate(dataset.metadata.asOfDate)}>Reset as-of date</button>
      </form>
      {typeof balanceSheet === 'string' && <p className="finance-empty" role="alert">{balanceSheet}</p>}
      {sheet && (
        <>
          <div className="finance-summary-grid" aria-label="Balance sheet totals">
            <Summary label="Total assets" value={formatMYR(sheet.totalAssetsRM)} />
            <Summary label="Total liabilities" value={formatMYR(sheet.totalLiabilitiesRM)} />
            <Summary label="Total equity" value={formatMYR(sheet.totalEquityRM)} />
            <Summary
              label="Assets − liabilities − equity"
              value={formatSigned(sheet.unexplainedDifferenceRM)}
              caption={sheet.equationHolds ? 'Accounting equation holds' : 'Equation difference is disclosed, not plugged'}
              negative={!sheet.equationHolds}
            />
          </div>
          <div className="finance-equation-status" role="status" data-balanced={sheet.equationHolds}>
            <span className="finance-equation-status-icon">{sheet.equationHolds ? '✓' : '!'}</span>
            <div>
              <strong>{sheet.equationHolds ? 'Accounting equation balances' : 'Accounting equation does not balance'}</strong>
              <p>Assets = Liabilities + Equity · Difference {formatSigned(sheet.unexplainedDifferenceRM)}</p>
            </div>
          </div>
          <div className="finance-balance-grid">
            <StatementSection
              title="Assets"
              description={`As at ${sheet.asOfDate}`}
              emphasis="total"
              rows={[
                ...sheet.assetLines.map((line) => ({
                  label: line.recorded ? line.accountName : `${line.accountName} · not recorded`,
                  amount: line.amountRM,
                })),
                { label: 'Total assets', amount: sheet.totalAssetsRM, total: true },
              ]}
            />
            <StatementSection
              title="Liabilities"
              description={`As at ${sheet.asOfDate}`}
              emphasis="total"
              rows={[
                ...sheet.liabilityLines.map((line) => ({
                  label: line.recorded ? line.accountName : `${line.accountName} · not recorded`,
                  amount: line.amountRM,
                })),
                { label: 'Total liabilities', amount: sheet.totalLiabilitiesRM, total: true },
              ]}
            />
            <StatementSection
              title="Equity"
              description={`As at ${sheet.asOfDate}`}
              emphasis="total"
              rows={[
                ...sheet.equityLines.map((line) => ({
                  label: line.recorded ? line.accountName : `${line.accountName} · not recorded`,
                  amount: line.amountRM,
                })),
                { label: 'Total equity', amount: sheet.totalEquityRM, total: true },
                { label: 'Total liabilities and equity', amount: sheet.totalLiabilitiesAndEquityRM, total: true },
              ]}
            />
          </div>
          <ul className="finance-warning-list">
            {sheet.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
          <AssumptionList items={sheet.assumptions} />
        </>
      )}
    </section>
  )
}

function Summary({
  label,
  value,
  caption,
  negative = false,
  positive = false,
}: {
  label: string
  value: string
  caption?: string
  negative?: boolean
  positive?: boolean
}) {
  return (
    <div className={`finance-summary-card${negative ? ' finance-summary-card--warning' : ''}`}>
      <span>{label}</span>
      <strong className={negative ? 'finance-negative' : positive ? 'finance-positive' : undefined}>{value}</strong>
      {caption && <small>{caption}</small>}
    </div>
  )
}

function StatementTable({
  caption,
  rows,
}: {
  caption?: string
  rows: Array<{ label: string; amount: number; note?: string; total?: boolean }>
}) {
  return (
    <div className="finance-table-wrap">
      <table className="finance-table finance-table--statement">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            <th>Account / line</th>
            <th>Amount (MYR)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className={row.total ? 'finance-statement-total' : undefined} key={`${row.label}-${index}`}>
              <td>
                {row.label}
                {row.note && <small>{row.note}</small>}
              </td>
              <td className={`finance-amount${row.amount < 0 ? ' finance-negative' : row.amount > 0 ? ' finance-positive' : ''}`}>{formatSigned(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatementSection({
  title,
  description,
  rows,
  emphasis,
}: {
  title: string
  description: string
  rows: Array<{ label: string; amount: number; note?: string; total?: boolean }>
  emphasis?: 'profit' | 'total'
}) {
  return (
    <section className={`finance-statement-section${emphasis ? ` finance-statement-section--${emphasis}` : ''}`}>
      <div className="finance-section-heading">
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
      </div>
      <StatementTable caption="" rows={rows} />
    </section>
  )
}

function AssumptionList({ items }: { items: string[] }) {
  return (
    <section className="finance-assumptions">
      <h4>Data assumptions</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  )
}

export { FinanceStatements }
